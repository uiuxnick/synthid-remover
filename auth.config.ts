import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe config shared with middleware: no Prisma, no bcrypt, no nodemailer.
 * Providers and DB-backed callbacks live in auth.ts.
 *
 * NOTE: the role read here comes from the JWT cookie, which is only refreshed when
 * auth() runs in a Node route. Treat middleware as a first gate and re-check with
 * requireAdmin() (lib/auth-helpers.ts) in every admin page / action / route.
 */
export default {
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 14, updateAge: 60 * 60 },
  providers: [],
  callbacks: {
    // Pure token -> session mapping. It must live HERE (not only in auth.ts) so the edge middleware,
    // which only loads this file, sees id/role/tier; otherwise every admin is bounced at /admin.
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      if (token.tier) session.user.tier = token.tier;
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const path = nextUrl.pathname;
      const loggedIn = !!auth?.user;

      if (path.startsWith('/admin')) return loggedIn && auth?.user.role === 'ADMIN';
      if (path.startsWith('/dashboard')) return loggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;
