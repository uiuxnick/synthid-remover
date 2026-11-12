'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  Trash2,
  Download,
  ShieldCheck,
  Zap,
  ArrowLeft,
  HardDrive,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { getLocalHistory, clearLocalHistory, LocalJobRecord } from '@/lib/localHistory';

export function LocalHistory() {
  const [history, setHistory] = useState<LocalJobRecord[]>([]);

  useEffect(() => {
    setHistory(getLocalHistory());
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your local processing history?')) {
      clearLocalHistory();
      setHistory([]);
    }
  };

  const totalProcessed = history.length;
  const totalSavedBytes = history.reduce((acc, job) => acc + Math.max(0, job.originalSize - job.processedSize), 0);

  return (
    <div>
      <div>
{/* Dashboard Title & Engine Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-h-line pb-6">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded bg-h-surface  px-2 py-0.5  text-[13px] font-medium text-h-muted   border border-h-line ">
              <ShieldCheck className="h-3 w-3 text-h-ink " />
              <span>On this device</span>
            </div>
            <h1 className="font-sans text-3xl font-semibold tracking-tight text-h-ink  sm:text-4xl">
              Local Job History
            </h1>
            <p className="mt-1 text-[16px] text-h-muted ">
              Processing logs and exports saved in your browser storage.
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 rounded-lg border border-black  bg-h-bg text-h-ink hover:bg-black hover:text-white     px-3.5 py-2 font-sans text-[14px] font-semibold transition-all duration-200 shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Stats Metrics Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[14px] bg-h-surface  bg-h-surface  p-5 shadow-sm">
            <div className="flex items-center justify-between text-h-muted ">
              <span className=" text-[14px]  ">Engine Status</span>
              <ShieldCheck className="h-4 w-4 text-h-ink " />
            </div>
            <div className="mt-3 font-sans text-2xl font-semibold text-h-ink ">Unlimited Free</div>
            <p className="mt-1  text-[13px] text-h-muted ">Zero network usage</p>
          </div>

          <div className="rounded-[14px] bg-h-surface  bg-h-surface  p-5 shadow-sm">
            <div className="flex items-center justify-between text-h-muted ">
              <span className=" text-[14px]  ">Total Processed</span>
              <Zap className="h-4 w-4 text-h-ink " />
            </div>
            <div className="mt-3 font-sans text-2xl font-semibold text-h-ink ">{totalProcessed} Jobs</div>
            <p className="mt-1  text-[13px] text-h-muted ">Completed locally</p>
          </div>

          <div className="rounded-[14px] bg-h-surface  bg-h-surface  p-5 shadow-sm">
            <div className="flex items-center justify-between text-h-muted ">
              <span className=" text-[14px]  ">Data Optimization</span>
              <HardDrive className="h-4 w-4 text-h-ink " />
            </div>
            <div className="mt-3 font-sans text-2xl font-semibold text-h-ink ">
              {(totalSavedBytes / 1024).toFixed(1)} KB
            </div>
            <p className="mt-1  text-[13px] text-h-muted ">Metadata stripped</p>
          </div>
        </div>

        {/* Job History Table */}
        <div className="rounded-[14px] bg-h-surface  bg-h-surface  overflow-hidden shadow-2xl">
          <div className="border-b border-h-line  px-6 py-4">
            <h3 className="font-sans text-[16px] font-semibold text-h-ink   ">
              Recent Job Telemetry
            </h3>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-h-muted ">
              <History className="mb-3 h-8 w-8 text-h-muted " />
              <p className="font-sans text-[16px] font-medium text-h-ink ">No jobs recorded yet</p>
              <p className="mt-1 text-[14px] text-h-muted ">
                Process an image in the workspace to see local telemetry logs here.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-black  bg-h-accent  px-4 py-2 font-sans text-[14px] font-semibold text-h-accent-ink  hover:bg-neutral-800  transition-colors"
              >
                Go to Workspace
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-[14px] text-h-ink ">
                <thead className="border-b border-h-line  bg-h-surface   text-[13px]  text-h-muted ">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Filename</th>
                    <th className="px-6 py-3">Dimensions</th>
                    <th className="px-6 py-3">Removed Layers</th>
                    <th className="px-6 py-3">Execution</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-h-line ">
                  {history.map((job) => (
                    <tr key={job.id} className="hover:bg-h-surface2  transition-colors">
                      <td className="whitespace-nowrap px-6 py-4  text-[13px] text-h-muted ">
                        {new Date(job.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-h-ink ">
                        {job.filename}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4  text-h-muted ">
                        {job.dimensions}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {job.watermarkTypesRemoved.map((type, idx) => (
                            <span
                              key={idx}
                              className="rounded border border-h-line  bg-h-surface2  px-1.5 py-0.5  text-[13px] text-h-ink "
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4  text-emerald-600 dark:text-emerald-400">
                        {job.executionTimeMs}ms
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {job.previewUrl && (
                          <a
                            href={job.previewUrl}
                            download={`cleared_${job.filename}`}
                            className="inline-flex items-center gap-1 rounded border border-h-line  bg-h-surface2  px-2.5 py-1 text-[13px] font-medium text-h-ink  hover:bg-neutral-300   transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
