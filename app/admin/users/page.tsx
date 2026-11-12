import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { adjustCredits, setBan, setRoleTier } from '../actions';
import { Banner, btn, btnGhost, input } from '../ui';

const PAGE = 20;

export default async function UsersPage({ searchParams }: { searchParams: { q?: string; page?: string; ok?: string; error?: string } }) {
  const admin = await requireAdmin();
  const q = (searchParams.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);
  const where = q ? { OR: [{ email: { contains: q, mode: 'insensitive' as const } }, { name: { contains: q, mode: 'insensitive' as const } }] } : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: { id: true, email: true, name: true, role: true, tier: true, creditsBalance: true, isBanned: true, createdAt: true, lastLoginAt: true },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => `/admin/users?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <div className="space-y-4">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">Users</h1>
      <Banner ok={searchParams.ok} error={searchParams.error} />
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search email or name" className={input} />
        <button className={btn}>Search</button>
      </form>

      <ul className="divide-y divide-h-line rounded-[14px] bg-h-surface  ">
        {users.length === 0 && <li className="p-6 text-center text-[16px] text-h-muted">No users found.</li>}
        {users.map((u) => (
          <li key={u.id} className="p-4 text-[16px]">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{u.email ?? u.id}{u.id === admin.id && ' (you)'}</span>
                <span className="flex items-center gap-3 text-[14px] text-h-muted">
                  {u.isBanned && <span className="text-red-500">BANNED</span>}
                  <span>{u.role}</span><span>{u.tier}</span>
                  <span className="tabular-nums">{u.creditsBalance} cr</span>
                </span>
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <form action={adjustCredits} className="space-y-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <p className="text-[14px] font-medium">Adjust credits (+/−)</p>
                  <input name="delta" type="number" step={1} required className={input} placeholder="e.g. 25 or -10" />
                  <input name="note" className={input} placeholder="Reason (audit log)" maxLength={200} />
                  <button className={btnGhost}>Apply</button>
                </form>
                <form action={setRoleTier} className="space-y-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <p className="text-[14px] font-medium">Role / tier</p>
                  <select name="role" defaultValue={u.role} className={input}><option>USER</option><option>ADMIN</option></select>
                  <select name="tier" defaultValue={u.tier} className={input}><option>FREE</option><option>PRO</option><option>ENTERPRISE</option></select>
                  <button className={btnGhost}>Save</button>
                </form>
                <form action={setBan} className="space-y-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="ban" value={u.isBanned ? '0' : '1'} />
                  <p className="text-[14px] font-medium">Access</p>
                  <p className="text-[14px] text-h-muted">Joined {u.createdAt.toISOString().slice(0, 10)}{u.lastLoginAt && ` · last login ${u.lastLoginAt.toISOString().slice(0, 10)}`}</p>
                  <button className={btnGhost} disabled={u.id === admin.id}>{u.isBanned ? 'Unban' : 'Ban user'}</button>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between text-[14px] text-h-muted">
        <span>Page {page} of {pages} · {total} user{total === 1 ? '' : 's'}</span>
        <span className="flex gap-3">
          {page > 1 && <a className="underline" href={link(page - 1)}>Previous</a>}
          {page < pages && <a className="underline" href={link(page + 1)}>Next</a>}
        </span>
      </div>
    </div>
  );
}
