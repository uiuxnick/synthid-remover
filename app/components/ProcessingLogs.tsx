'use client';

import React from 'react';
import { Terminal, CheckCircle2, Clock, Cpu, HardDrive } from 'lucide-react';

interface ProcessingLogsProps {
  logs: string[];
  isProcessing?: boolean;
  executionTimeMs?: number;
  dimensions?: { width: number; height: number };
  originalSize?: number;
  processedSize?: number;
}

export const ProcessingLogs: React.FC<ProcessingLogsProps> = ({
  logs,
  isProcessing,
  executionTimeMs,
  dimensions,
  originalSize,
  processedSize,
}) => {
  return (
    <div className="w-full rounded-xl border border-h-line  bg-h-surface  p-4 font-mono text-xs shadow-2xl">
      {/* Terminal Header */}
      <div className="mb-3 flex items-center justify-between border-b border-h-line  pb-2.5">
        <div className="flex items-center gap-2 text-h-ink ">
          <Terminal className="h-4 w-4 text-h-ink " />
          <span className="font-sans text-xs font-semibold tracking-wide text-h-ink  ">
            Telemetry & Processing Terminal
          </span>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 rounded-full border border-h-line  bg-h-surface2  px-2.5 py-0.5 text-[13px] text-h-ink ">
              <span className="h-2 w-2 rounded-full bg-h-ink  animate-ping" />
              <span>Processing...</span>
            </div>
          ) : logs.length > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-emerald-900/60 bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[13px] text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>Pipeline Complete</span>
            </div>
          ) : (
            <span className="text-[13px] text-h-muted ">IDLE</span>
          )}
        </div>
      </div>

      {/* Telemetry Metrics Bar */}
      {(executionTimeMs || dimensions || originalSize) && (
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-h-line  bg-h-surface  p-2.5 text-[13px] text-h-muted  sm:grid-cols-4">
          <div className="flex flex-col">
            <span className="text-[13px] text-h-muted  ">Execution</span>
            <span className="font-semibold text-h-ink ">{executionTimeMs ? `${executionTimeMs}ms` : '0ms'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] text-h-muted  ">Dimensions</span>
            <span className="font-semibold text-h-ink ">
              {dimensions ? `${dimensions.width}x${dimensions.height}px` : 'N/A'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] text-h-muted  ">Original Size</span>
            <span className="font-semibold text-h-ink ">
              {originalSize ? `${(originalSize / 1024).toFixed(1)} KB` : 'N/A'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] text-h-muted  ">Processed Size</span>
            <span className="font-semibold text-h-ink ">
              {processedSize ? `${(processedSize / 1024).toFixed(1)} KB` : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Scrollable Terminal Output */}
      <div className="h-44 w-full overflow-y-auto rounded-lg border border-h-line  bg-neutral-900  p-3 font-mono text-[13px] leading-relaxed text-neutral-200 ">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-h-muted">
            <span>Awaiting image upload to initialize local processing pipeline...</span>
          </div>
        ) : (
          logs.map((log, index) => {
            let textColor = 'text-neutral-300';
            if (log.includes('[SUCCESS]')) textColor = 'text-emerald-400 font-semibold';
            if (log.includes('[PROCESS]')) textColor = 'text-white';
            if (log.includes('[TELEMETRY]')) textColor = 'text-h-muted';
            if (log.includes('[INPAINT]')) textColor = 'text-sky-400';

            return (
              <div key={index} className={`flex items-start gap-2 ${textColor}`}>
                <span className="select-none text-h-muted">&gt;</span>
                <span>{log}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
