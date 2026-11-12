import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { DeleteForm, PasswordForm, ProfileForm } from '@/app/components/ProfileForms';

export const metadata = { title: 'Profile', robots: { index: false } };

export default async function ProfilePage({ searchParams }: { searchParams: { complete?: string } }) {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, phone: true, passwordHash: true, createdAt: true },
  });
  if (!user) return null;

  return (
    <div className="max-w-[640px] space-y-6">
      <div>
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">Profile</h1>
        <p className="mt-2 text-[16px] text-h-muted">Member since {user.createdAt.toISOString().slice(0, 10)}.</p>
      </div>
      {(!user.phone || searchParams.complete) && !user.phone && (
        <p role="status" className="rounded-[14px] bg-h-surface2 px-5 py-4 text-[16px] font-medium text-h-accent">
          Add your mobile number to finish setting up your account.
        </p>
      )}
      <ProfileForm name={user.name ?? ''} phone={user.phone ?? ''} email={user.email} />
      <PasswordForm hasPassword={!!user.passwordHash} />
      <DeleteForm email={user.email} />
    </div>
  );
}
