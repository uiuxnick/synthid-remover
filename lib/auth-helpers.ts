import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/** For server components / actions: returns the session user or redirects to /login. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

/**
 * Authoritative admin check. Reads role from the DB, not the JWT, so a demoted
 * admin loses access immediately. Call at the top of every /admin page, action and route.
 */
export async function requireAdmin() {
  const user = await requireUser();
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, isBanned: true },
  });
  if (!db || db.isBanned || db.role !== 'ADMIN') redirect('/dashboard');
  return user;
}
