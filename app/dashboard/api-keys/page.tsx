import Link from 'next/link';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { CreateKeyForm } from '@/app/components/CreateKeyForm';
import { revokeApiKey } from './actions';

export const metadata = { title: 'API keys', robots: { index: false } };

export default async function ApiKeysPage() {
  const sessionUser = await requireUser();
  const [user, keys] = await Promise.all([
    prisma.user.findUnique({ where: { id: sessionUser.id }, select: { tier: true, role: true } }),
    prisma.apiKey.findMany({ where: { userId: sessionUser.id }, orderBy: { createdAt: 'desc' } }),
  ]);
  const allowed = user?.tier === 'ENTERPRISE' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">API keys</h1>
      {allowed ? (
        <CreateKeyForm />
      ) : (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-[16px]">
          The developer API is part of the Enterprise plan. <a className="underline" href="/pricing">See plans</a>.
        </p>
      )}
      <ul className="divide-y divide-h-line rounded-[14px] bg-h-surface text-[16px]  ">
        {keys.length === 0 && <li className="p-6 text-center text-h-muted">No keys yet.</li>}
        {keys.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{k.name} {!k.isActive && <span className="text-[14px] text-red-500">REVOKED</span>}</p>
              <p className=" text-[14px] text-h-muted">{k.prefix}… · {k.usageCount} calls · {k.lastUsedAt ? `last used ${k.lastUsedAt.toISOString().slice(0, 10)}` : 'never used'}</p>
            </div>
            {k.isActive && (
              <form action={revokeApiKey}>
                <input type="hidden" name="id" value={k.id} />
                <button className="rounded-[10px] bg-h-surface2 px-4 py-2.5 text-[14px] font-medium ">Revoke</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[14px] text-h-muted">Docs: <Link href="/api-docs" className="underline">/api-docs</Link>. Keys are stored only as a SHA-256 hash.</p>
    </div>
  );
}
