'use client';

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, FileWarning, CheckCircle, Lock } from 'lucide-react';

interface ImageDropzoneProps {
  /** true = in-browser trial; false = signed-in workspace, which uploads to the server. */
  local?: boolean;
  onImageSelected: (file: File) => void;
  disabled?: boolean;
}

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic'];
const MAX_FILE_SIZE_MB = 20;

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({ onImageSelected, disabled, local = true }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndHandleFile = (file: File) => {
    setErrorMessage(null);

    // Size validation
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File exceeds the maximum size limit of ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    // Format validation (allow standard image formats)
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Unsupported file format. Please upload JPG, PNG, WEBP, or AVIF.');
      return;
    }

    onImageSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? 'border-h-accent bg-h-surface2' : 'border-h-line bg-h-surface hover:border-h-accent hover:bg-h-surface2'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] bg-h-accent text-h-accent-ink"><Upload aria-hidden className="h-6 w-6" /></span>
        <h3 className="text-[22px] font-semibold tracking-[-0.01em]">Drop an image here, or click to choose one</h3>
        <p className="mt-2 text-[15px] opacity-70">JPG, PNG, WEBP or AVIF, up to {MAX_FILE_SIZE_MB} MB</p>
        <p className="mt-6 flex items-center gap-2 text-[14px] opacity-70">
          <Lock aria-hidden className="h-3.5 w-3.5" />
          {local ? 'Runs in your browser. Never uploaded.' : 'Processed on our servers. Not stored.'}
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-400">
          <FileWarning className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
