'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * A mobile number is mandatory. Password signups give it on the form; Google and email-link
 * signups cannot, so those accounts are sent to the profile page until they add one.
 */
export function PhoneGate({ hasPhone }: { hasPhone: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!hasPhone && pathname !== '/dashboard/profile') router.replace('/dashboard/profile?complete=1');
  }, [hasPhone, pathname, router]);
  return null;
}
