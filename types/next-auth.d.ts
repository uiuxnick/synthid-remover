import type { Role, Tier } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      tier: Tier;
    } & DefaultSession['user'];
  }
  interface User {
    role?: Role;
    tier?: Tier;
  }
}

// JWT lives in @auth/core; next-auth/jwt only re-exports it, so augment the source module.
declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: Role;
    tier?: Tier;
  }
}
