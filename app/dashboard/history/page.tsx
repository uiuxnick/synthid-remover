import Link from 'next/link';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { LocalHistory } from '@/app/components/LocalHistory';

export const metadata = { title: 'History', robots: { index: false } };

const PAGE_SIZE = 15;

export default async function HistoryPage({ searchParams }: { searchParams: { page?: string } }) {
  const user = await requireUser();
  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);

  const [total, jobs] = await Promise.all([
    prisma.imageJob.count({ where: { userId: user.id } }),
    prisma.imageJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-4 text-[32px] font-semibold leading-tight tracking-[-0.02em]">Processing history</h1>
        <div className="overflow-x-auto rounded-[14px] bg-h-surface ">
          <table className="w-full text-left text-[16px]">
            <thead className="bg-h-surface text-[14px]   text-h-muted ">
              <tr>
                {['Date', 'Type', 'Mode', 'PSNR', 'MSE', 'Time', 'Badge', 'Status'].map((h) => (
                  <th key={h} className="p-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-h-line ">
              {jobs.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-h-muted">No jobs yet.</td></tr>
              )}
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="p-3  text-[14px]">{j.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                  <td className="p-3 capitalize">{j.mediaType}</td>
                  <td className="p-3">{j.mode === 'METADATA_ONLY' ? 'metadata-only' : j.mediaType === 'video' ? 'remove mark' : j.mode.toLowerCase()}</td>
                  <td className="p-3 tabular-nums">{j.psnr?.toFixed(1) ?? '—'}</td>
                  <td className="p-3 tabular-nums">{j.mse?.toFixed(1) ?? '—'}</td>
                  <td className="p-3 tabular-nums">{j.processingTimeMs ? `${j.processingTimeMs} ms` : '—'}</td>
                  <td className="p-3">{j.badgeDetected ? 'Yes' : 'No'}</td>
                  <td className="p-3 text-[14px] ">{j.status.charAt(0) + j.status.slice(1).toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-[14px] text-h-muted">
          <span>Page {page} of {pages} · {total} job{total === 1 ? '' : 's'}</span>
          <span className="flex gap-3">
            {page > 1 && <Link className="underline" href={`/dashboard/history?page=${page - 1}`}>Previous</Link>}
            {page < pages && <Link className="underline" href={`/dashboard/history?page=${page + 1}`}>Next</Link>}
          </span>
        </div>
        <p className="mt-2 text-[14px] text-h-muted">Thumbnails and expiring re-download links arrive with cloud storage in a later phase.</p>
      </section>

      <section>
        <LocalHistory />
      </section>
    </div>
  );
}
