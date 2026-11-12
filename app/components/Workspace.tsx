'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Zap,
  Sliders,
  Layers,
  FileCode2,
  Sparkles,
  Download,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  Lock,
  ArrowRight,
  CheckCircle,
  Flame,
  Shield,
  Eye,
  Check,
} from 'lucide-react';
import { ImageDropzone } from './ImageDropzone';
import { InpaintCanvas } from './InpaintCanvas';
import { ProcessingLogs } from './ProcessingLogs';
import { HeroImageScanner } from './HeroImageScanner';
import { toast } from 'sonner';
import { saveLocalJob } from '@/lib/localHistory';
import { TRIAL_LIMIT, getTrialRuns, recordTrialRun } from '@/lib/trial';
import { processImageClientSide, inpaintImageClientSide, DisruptionMode } from '@/lib/clientImageProcessor';

export function Workspace({ mode = 'full' }: { mode?: 'full' | 'trial' }) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'auto' | 'inpaint'>('auto');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [telemetryMeta, setTelemetryMeta] = useState<{
    executionTimeMs?: number;
    dimensions?: { width: number; height: number };
    originalSize?: number;
    processedSize?: number;
    disruptionMode?: DisruptionMode;
    badgeDetails?: any;
    provenanceAudit?: any;
  }>({});

  // Options
  const [stripMetadata, setStripMetadata] = useState<boolean>(true);
  const [disruptSignals, setDisruptSignals] = useState<boolean>(true);
  const [disruptionMode, setDisruptionMode] = useState<DisruptionMode>('balanced');
  const [disruptionStrength, setDisruptionStrength] = useState<number>(75);
  const [removeVisibleBadge, setRemoveVisibleBadge] = useState<boolean>(true);
  const [exportFormat, setExportFormat] = useState<'webp' | 'jpeg' | 'png'>('png');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleImageSelected = (file: File) => {
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setProcessedImageUrl(null);
    setTelemetryLogs([
      `[SYSTEM] Image selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      `[SYSTEM] Ready. Select pipeline options and click 'Run Pipeline'.`,
    ]);
    // Match export format to input file container type by default
    if (file.type === 'image/jpeg' || file.name.match(/\.(jpe?g)$/i)) {
      setExportFormat('jpeg');
    } else if (file.type === 'image/webp' || file.name.match(/\.webp$/i)) {
      setExportFormat('webp');
    } else {
      setExportFormat('png');
    }

    setTelemetryMeta({ originalSize: file.size });
  };

  const handleRunAutoPipeline = async () => {
    if (!selectedFile) return;

    if (mode === 'trial') {
      if (getTrialRuns() >= TRIAL_LIMIT) {
        toast.error('Free trial used up', { description: 'Create a free account to keep going.' });
        return;
      }
      recordTrialRun();
    }

    setIsProcessing(true);
    setTelemetryLogs((prev) => [...prev, `[PROCESS] Starting processing pipeline (${disruptionMode.toUpperCase()} mode)...`]);

    try {
      let data: any;

      // The free trial never uploads: it runs entirely in the browser. Only the signed-in workspace uses the server.
      if (mode === 'full') try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('stripMetadata', String(stripMetadata));
        formData.append('disruptSignals', String(disruptSignals));
        formData.append('disruptionMode', disruptionMode);
        formData.append('disruptionStrength', String(disruptionStrength));
        formData.append('removeVisibleBadge', String(removeVisibleBadge));
        formData.append('format', exportFormat);

        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const res = await fetch(`${basePath}/api/process`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          data = await res.json();
        } else if ([401, 402, 403, 429].includes(res.status)) {
          // Policy rejections (auth, credits, trial, rate limit) must not fall back to free client-side processing.
          const body = await res.json().catch(() => ({}));
          const msg: string =
            res.status === 402 ? 'Out of credits. Top up on the Billing page.'
            : res.status === 429 ? 'Too many requests. Wait a moment and retry.'
            : res.status === 403 ? 'Free trial used up. Create an account to continue.'
            : 'Sign in again to continue.';
          toast.error(body?.error ?? msg, { description: msg });
          setTelemetryLogs((prev) => [...prev, `[ERROR] ${msg}`]);
          return;
        }
      } catch (e) {
        console.warn('API route unavailable, using client-side engine fallback.');
      }

      // If API route returned error or is unavailable (e.g. static export/gh-pages), run client-side
      if (!data || !data.success) {
        data = await processImageClientSide(selectedFile, {
          stripMetadata,
          disruptSignals,
          disruptionMode,
          disruptionStrength,
          removeVisibleBadge,
          format: exportFormat,
        });
      }

      setProcessedImageUrl(data.base64Image);
      // Server-side jobs change the credit balance shown in the dashboard layout.
      if (mode === 'full') router.refresh();
      setTelemetryLogs(data.telemetry.logs);
      setTelemetryMeta({
        executionTimeMs: data.telemetry.executionTimeMs,
        dimensions: data.telemetry.dimensions,
        originalSize: data.telemetry.originalSize,
        processedSize: data.telemetry.processedSize,
        disruptionMode,
        badgeDetails: data.telemetry.badgeDetails,
        provenanceAudit: data.telemetry.provenanceAudit,
      });

      // Save record to local browser storage
      saveLocalJob({
        filename: selectedFile.name,
        originalSize: data.telemetry.originalSize,
        processedSize: data.telemetry.processedSize,
        dimensions: `${data.telemetry.dimensions?.width || 0}x${data.telemetry.dimensions?.height || 0}`,
        watermarkTypesRemoved: [
          removeVisibleBadge ? 'Visible Gemini Badge' : '',
          stripMetadata ? 'EXIF/C2PA Metadata' : '',
          disruptSignals ? `SynthID Signal (${disruptionMode})` : '',
        ].filter(Boolean),
        status: 'completed',
        executionTimeMs: data.telemetry.executionTimeMs,
        previewUrl: data.base64Image,
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Processing failed', { description: err.message || 'Try a different image or mode.' });
      setTelemetryLogs((prev) => [
        ...prev,
        `[ERROR] ${err.message || 'Processing failed.'}`,
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInpaintSubmit = async (maskBlob: Blob) => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setTelemetryLogs((prev) => [
      ...prev,
      `[INPAINT] Submitting visual brush mask to reconstruction pipeline...`,
    ]);

    try {
      let data: any;

      // The free trial never uploads: it runs entirely in the browser. Only the signed-in workspace uses the server.
      if (mode === 'full') try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('mask', maskBlob, 'mask.png');
        formData.append('format', exportFormat);

        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const res = await fetch(`${basePath}/api/inpaint`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn('API inpaint route unavailable, falling back to client-side inpaint engine.');
      }

      // If backend route is not available (e.g. GitHub Pages static site), run client inpaint fallback
      if (!data || !data.success) {
        data = await inpaintImageClientSide(selectedFile, maskBlob, exportFormat);
      }

      setProcessedImageUrl(data.base64Image);
      // Server-side jobs change the credit balance shown in the dashboard layout.
      if (mode === 'full') router.refresh();
      setTelemetryLogs(data.telemetry.logs);
      setTelemetryMeta({
        executionTimeMs: data.telemetry.executionTimeMs,
        originalSize: data.telemetry.originalSize,
        processedSize: data.telemetry.processedSize,
        dimensions: data.telemetry.dimensions,
        provenanceAudit: data.telemetry.provenanceAudit,
      });

      saveLocalJob({
        filename: selectedFile.name,
        originalSize: data.telemetry.originalSize,
        processedSize: data.telemetry.processedSize,
        dimensions: 'Inpainted Mask',
        watermarkTypesRemoved: ['Visible AI Badge', 'EXIF/C2PA', 'SynthID Signal'],
        status: 'completed',
        executionTimeMs: data.telemetry.executionTimeMs,
        previewUrl: data.base64Image,
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Inpaint failed', { description: err.message });
      setTelemetryLogs((prev) => [...prev, `[ERROR] Inpaint failed: ${err.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setProcessedImageUrl(null);
    setTelemetryLogs([]);
    setTelemetryMeta({});
  };


  return (
    <>
      <section id="workspace" className="">
        <div className="">
          <div className="flex flex-col gap-8">
            <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 `}>
              {/* On the homepage the section already has its own heading. */}
              <div className={mode === 'trial' ? 'sr-only' : ''}>
                <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-h-ink">
                  {mode === 'trial' ? 'Process an image in your browser' : 'Process an image'}
                </h2>
                <p className="mt-2 max-w-[60ch] text-[16px] text-h-muted">
                  Clean provenance metadata and visible marks from images you own, with a before/after audit of what changed.
                </p>
              </div>

              {/* Mode Switching Tabs */}
              {selectedFile && (
                <div className="flex items-center gap-1 rounded-lg border border-h-line  bg-h-surface  p-1">
                  <button
                    onClick={() => setActiveTab('auto')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      activeTab === 'auto'
                        ? 'bg-h-bg  text-h-ink  shadow-sm'
                        : 'text-h-muted  hover:text-h-ink '
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>Auto Pipeline</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('inpaint')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      activeTab === 'inpaint'
                        ? 'bg-h-bg  text-h-ink  shadow-sm'
                        : 'text-h-muted  hover:text-h-ink '
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Visual Brush Inpaint</span>
                  </button>
                </div>
              )}
            </div>

            {/* Dropzone or Processing Interface */}
            {!selectedFile ? (
              <ImageDropzone onImageSelected={handleImageSelected} disabled={isProcessing} local={mode === 'trial'} />
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-h-line  pb-4">
                  <div className="flex items-center gap-3">
                    <span className=" text-xs text-h-ink  font-medium">
                      {selectedFile.name}
                    </span>
                    <span className=" text-[13px] text-h-muted">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs text-h-muted  hover:text-h-ink  transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Change Image</span>
                  </button>
                </div>

                {/* Tab 1: Auto Signal & Metadata Pipeline */}
                {activeTab === 'auto' && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left Options Controls */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                      <div className="rounded-xl border border-h-line  bg-h-surface  p-4">
                        <h5 className="mb-3 font-sans text-xs font-semibold text-h-ink    flex items-center justify-between">
                          <span>Pipeline Configuration</span>
                          <span className="text-[13px]  text-h-muted">{mode === 'trial' ? 'In browser' : '1 credit per run'}</span>
                        </h5>

                        <div className="flex flex-col gap-3">
                          {/* Disruption Strategy Selector */}
                          <div className="flex flex-col gap-2 pb-3 border-b border-h-line ">
                            <label className="font-sans text-xs font-semibold text-h-ink  flex items-center justify-between">
                              <span>Disruption Strategy</span>
                              <span className="text-[13px]  px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                                {disruptionMode === 'balanced' ? 'High Fidelity' : disruptionMode === 'aggressive' ? 'Deep Evasion' : 'Lossless'}
                              </span>
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDisruptionMode('balanced')}
                                className={`px-2 py-2 text-xs rounded-lg border font-medium transition-all text-center ${
                                  disruptionMode === 'balanced'
                                    ? 'border-black  bg-h-accent  text-h-accent-ink  font-semibold shadow-sm'
                                    : 'border-h-line  bg-h-bg  text-h-muted  hover:text-h-ink '
                                }`}
                              >
                                ⚡ Balanced
                              </button>
                              <button
                                type="button"
                                onClick={() => setDisruptionMode('aggressive')}
                                className={`px-2 py-2 text-xs rounded-lg border font-medium transition-all text-center ${
                                  disruptionMode === 'aggressive'
                                    ? 'border-black  bg-h-accent  text-h-accent-ink  font-semibold shadow-sm'
                                    : 'border-h-line  bg-h-bg  text-h-muted  hover:text-h-ink '
                                }`}
                              >
                                🔥 Deep Evasion
                              </button>
                              <button
                                type="button"
                                onClick={() => setDisruptionMode('metadata-only')}
                                className={`px-2 py-2 text-xs rounded-lg border font-medium transition-all text-center ${
                                  disruptionMode === 'metadata-only'
                                    ? 'border-black  bg-h-accent  text-h-accent-ink  font-semibold shadow-sm'
                                    : 'border-h-line  bg-h-bg  text-h-muted  hover:text-h-ink '
                                }`}
                              >
                                🛡️ Metadata Only
                              </button>
                            </div>
                            <p className="text-[13px] text-h-muted  leading-relaxed">
                              {disruptionMode === 'balanced' && '2-stage Lanczos phase shift & chroma dither. Neutralizes standard SynthID while preserving crisp details (PSNR >38dB).'}
                              {disruptionMode === 'aggressive' && 'Bounded 16-32px Fourier phase scrambler with soft tanh delta clamping (zero mottling), 3x3 median filtering, coordinate squeeze, & DCT quantization.'}
                              {disruptionMode === 'metadata-only' && '100% bit-for-bit lossless pixel preservation. Purges all C2PA Content Credentials, EXIF, and XMP tags.'}
                            </p>
                          </div>

                          {/* Carrier Intensity Slider */}
                          {disruptionMode !== 'metadata-only' && (
                            <div className="flex flex-col gap-1.5 pb-3 border-b border-h-line ">
                              <div className="flex items-center justify-between">
                                <span className="font-sans text-xs font-semibold text-h-ink ">
                                  Frequency Disruption Intensity
                                </span>
                                <span className=" text-xs text-h-muted ">
                                  {disruptionStrength}%{disruptionMode === 'aggressive' ? ` (±${((disruptionStrength / 100) * 2.8).toFixed(1)} ΔY max)` : ''}
                                </span>
                              </div>
                              <input
                                type="range"
                                min="20"
                                max="100"
                                value={disruptionStrength}
                                onChange={(e) => setDisruptionStrength(Number(e.target.value))}
                                className="w-full accent-black dark:accent-white cursor-pointer"
                              />
                            </div>
                          )}

                          {/* Option 1: Strip Metadata */}
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={stripMetadata}
                              onChange={(e) => setStripMetadata(e.target.checked)}
                              className="mt-0.5 h-4 w-4 rounded border-h-line  bg-h-bg  accent-black dark:accent-white"
                            />
                            <div>
                              <span className="font-sans text-xs font-semibold text-h-ink ">
                                Strip C2PA & EXIF Metadata
                              </span>
                              <p className="text-[13px] text-h-muted ">
                                Wipes EXIF headers, XMP schemas, and C2PA Content Credentials (JUMBF manifests).
                              </p>
                            </div>
                          </label>

                          {/* Option 2: Disrupt SynthID Signals */}
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={disruptSignals}
                              onChange={(e) => setDisruptSignals(e.target.checked)}
                              className="mt-0.5 h-4 w-4 rounded border-h-line  bg-h-bg  accent-black dark:accent-white"
                            />
                            <div>
                              <span className="font-sans text-xs font-semibold text-h-ink ">
                                Disrupt SynthID Frequency Signals
                              </span>
                              <p className="text-[13px] text-h-muted ">
                                Desynchronizes spatial DCT bins and neural network receptive fields.
                              </p>
                            </div>
                          </label>

                          {/* Option 3: Auto-Erase Visible Gemini Sparkle Badge */}
                          <label className={`flex items-start gap-3 ${disruptionMode === 'metadata-only' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              checked={disruptionMode === 'metadata-only' ? false : removeVisibleBadge}
                              disabled={disruptionMode === 'metadata-only'}
                              onChange={(e) => setRemoveVisibleBadge(e.target.checked)}
                              className="mt-0.5 h-4 w-4 rounded border-h-line  bg-h-bg  accent-black dark:accent-white"
                            />
                            <div>
                              <span className="font-sans text-xs font-semibold text-h-ink ">
                                Auto-Erase Visible Gemini Sparkle Badge
                              </span>
                              <p className="text-[13px] text-h-muted ">
                                {disruptionMode === 'metadata-only'
                                  ? 'Bypassed in Metadata-Only mode to preserve 100% bit-for-bit lossless pixel integrity.'
                                  : 'Erases corner badges with adaptive Reverse Alpha Blending.'}
                              </p>
                            </div>
                          </label>

                          {/* Format Selector */}
                          <div className="mt-2 flex items-center justify-between border-t border-h-line  pt-3">
                            <span className="font-sans text-xs text-h-ink ">Export Format:</span>
                            <select
                              value={exportFormat}
                              onChange={(e) => setExportFormat(e.target.value as any)}
                              className="rounded border border-h-line  bg-h-bg  px-2.5 py-1  text-xs text-h-ink "
                            >
                              <option value="png">PNG (.png)</option>
                              <option value="jpeg">JPEG (.jpg)</option>
                              <option value="webp">WEBP (.webp)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Process Execution Button */}
                      <button
                        onClick={handleRunAutoPipeline}
                        disabled={isProcessing}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-black  bg-h-accent  text-h-accent-ink  hover:bg-neutral-800  py-3 font-sans text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 shadow-sm"
                      >
                        <Zap className="h-4 w-4" />
                        <span>{isProcessing ? 'Processing Pipeline...' : 'Run Pipeline'}</span>
                      </button>
                    </div>

                    {/* Right Image Preview / Result */}
                    <div className="lg:col-span-7 flex flex-col items-center justify-center rounded-xl border border-h-line  bg-h-surface  p-4">
                      {processedImageUrl ? (
                        <div className="flex flex-col items-center gap-4 w-full">
                          <img
                            src={processedImageUrl}
                            alt="Processed Result"
                            className="max-h-[380px] w-auto object-contain rounded-lg border border-h-line  shadow-xl"
                          />

                          {/* Real Byte-Level Provenance Audit Panel */}
                          <div className="w-full flex flex-col gap-2 rounded-xl border border-h-line  bg-h-surface  p-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-h-ink  flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                <span>Real-Time Binary Provenance Audit</span>
                              </span>
                              <span className=" text-[13px] text-h-muted">
                                {telemetryMeta.provenanceAudit ? `${telemetryMeta.provenanceAudit.bytesScanned} bytes inspected (${telemetryMeta.provenanceAudit.formatDetected})` : 'Byte scan ready'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1 text-[13px]">
                              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-h-bg  border border-h-line ">
                                {telemetryMeta.provenanceAudit?.c2paFound ? (
                                  <span className="text-amber-500 font-bold shrink-0">⚠️</span>
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                )}
                                <span className="truncate">C2PA (JUMBF): <strong className={telemetryMeta.provenanceAudit?.c2paFound ? 'text-amber-500' : 'text-emerald-500'}>{telemetryMeta.provenanceAudit?.c2paFound ? 'Found' : 'Clean (0)'}</strong></span>
                              </div>

                              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-h-bg  border border-h-line ">
                                {telemetryMeta.provenanceAudit?.exifFound ? (
                                  <span className="text-amber-500 font-bold shrink-0">⚠️</span>
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                )}
                                <span className="truncate">EXIF Header: <strong className={telemetryMeta.provenanceAudit?.exifFound ? 'text-amber-500' : 'text-emerald-500'}>{telemetryMeta.provenanceAudit?.exifFound ? 'Found' : 'Clean (0)'}</strong></span>
                              </div>

                              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-h-bg  border border-h-line ">
                                {telemetryMeta.provenanceAudit?.xmpFound ? (
                                  <span className="text-amber-500 font-bold shrink-0">⚠️</span>
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                )}
                                <span className="truncate">XMP Schemas: <strong className={telemetryMeta.provenanceAudit?.xmpFound ? 'text-amber-500' : 'text-emerald-500'}>{telemetryMeta.provenanceAudit?.xmpFound ? 'Found' : 'Clean (0)'}</strong></span>
                              </div>

                              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-h-bg  border border-h-line ">
                                {telemetryMeta.provenanceAudit?.iccFound ? (
                                  <span className="text-amber-500 font-bold shrink-0">⚠️</span>
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                )}
                                <span className="truncate">ICC Profile: <strong className={telemetryMeta.provenanceAudit?.iccFound ? 'text-amber-500' : 'text-emerald-500'}>{telemetryMeta.provenanceAudit?.iccFound ? 'Found' : 'Clean (0)'}</strong></span>
                              </div>

                              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-h-bg  border border-h-line ">
                                {telemetryMeta.provenanceAudit?.iptcFound ? (
                                  <span className="text-amber-500 font-bold shrink-0">⚠️</span>
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                )}
                                <span className="truncate">IPTC Data: <strong className={telemetryMeta.provenanceAudit?.iptcFound ? 'text-amber-500' : 'text-emerald-500'}>{telemetryMeta.provenanceAudit?.iptcFound ? 'Found' : 'Clean (0)'}</strong></span>
                              </div>
                            </div>
                          </div>

                          <a
                            href={processedImageUrl}
                            download={(() => {
                              const lastDot = selectedFile.name.lastIndexOf('.');
                              const base = lastDot !== -1 ? selectedFile.name.substring(0, lastDot) : selectedFile.name;
                              const ext = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
                              return `cleared_${base}.${ext}`;
                            })()}
                            className="flex items-center gap-2 rounded-lg border border-black  bg-h-accent  text-h-accent-ink  hover:bg-neutral-800  px-5 py-2.5 font-sans text-xs font-semibold transition-all shadow-sm"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download Cleared Image ({exportFormat.toUpperCase()})</span>
                          </a>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <img
                            src={previewUrl || ''}
                            alt="Original Preview"
                            className="max-h-[340px] w-auto object-contain rounded-lg border border-h-line opacity-90"
                          />
                          <span className=" text-xs text-h-muted">
                            Original Input Image Preview
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Visual Brush Inpaint Canvas */}
                {activeTab === 'inpaint' && (
                  <div className="flex flex-col gap-6">
                    <InpaintCanvas
                      imageSrc={previewUrl || ''}
                      onInpaintSubmit={handleInpaintSubmit}
                      isProcessing={isProcessing}
                    />

                    {processedImageUrl && (
                      <div className="flex flex-col items-center gap-4 border-t border-h-line pt-4">
                        <h5 className="font-sans text-xs font-semibold text-white  ">
                          Inpainted Result Preview
                        </h5>
                        <img
                          src={processedImageUrl}
                          alt="Inpaint Result"
                          className="max-h-[340px] w-auto object-contain rounded-lg border border-h-line"
                        />
                        <a
                          href={processedImageUrl}
                          download={(() => {
                            const lastDot = selectedFile.name.lastIndexOf('.');
                            const base = lastDot !== -1 ? selectedFile.name.substring(0, lastDot) : selectedFile.name;
                            const ext = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
                            return `inpainted_${base}.${ext}`;
                          })()}
                          className="flex items-center gap-2 rounded-lg border border-black  bg-h-accent  text-h-accent-ink  hover:bg-neutral-800  px-5 py-2.5 font-sans text-xs font-semibold transition-all shadow-sm"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Inpainted Image ({exportFormat.toUpperCase()})</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Telemetry Output Terminal */}
                <ProcessingLogs
                  logs={telemetryLogs}
                  isProcessing={isProcessing}
                  executionTimeMs={telemetryMeta.executionTimeMs}
                  dimensions={telemetryMeta.dimensions}
                  originalSize={telemetryMeta.originalSize}
                  processedSize={telemetryMeta.processedSize}
                />
              </div>
            )}
          </div>
        </div>
      </section>

    </>
  );
}
