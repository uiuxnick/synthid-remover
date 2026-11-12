import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import Nodemailer from 'next-auth/providers/nodemailer';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import authConfig from './auth.config';
import { prisma } from '@/lib/db';
import { grantSignupBonus } from '@/lib/credits';
import { escapeHtml, sendMail } from '@/lib/mailer';
import { loginSchema } from '@/lib/validation';
import { clientIp, rateLimit } from '@/lib/ratelimit';
import { sendWelcome } from '@/lib/emailTemplates';

// Compared against when the email is unknown so response time doesn't reveal account existence.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // allowDangerousEmailAccountLinking intentionally OFF: see signIn callback below.
    }),
    Nodemailer({
      // Transport is resolved at send time from AppConfig (admin) or SMTP_* env; see lib/mailer.ts.
      server: { host: 'unused' },
      from: process.env.SMTP_FROM ?? 'no-reply@localhost',
      maxAge: 15 * 60,
      async sendVerificationRequest({ identifier, url }) {
        const safeUrl = escapeHtml(url);
        await sendMail({
          to: identifier,
          subject: 'Your sign-in link',
          text: `Sign in: ${url}\n\nThis link expires in 15 minutes. If you did not request it, ignore this email.`,
          html: `<p>Click to sign in. The link expires in 15 minutes.</p><p><a href="${safeUrl}">Sign in</a></p><p>If you did not request this, ignore this email.</p>`,
        });
      },
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        // Brute-force guard: per IP+email (stops targeted guessing) and per IP (stops spraying).
        const ip = clientIp(request);
        const [a, b] = await Promise.all([
          rateLimit(`login:${ip}:${parsed.data.email}`, 8),
          rateLimit(`login-ip:${ip}`, 30),
        ]);
        if (!a.ok || !b.ok) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !user.passwordHash || !ok || user.isBanned) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      if (!user.id) return true; // brand-new magic-link user: adapter creates them after this check
      const db = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isBanned: true, passwordHash: true, emailVerified: true },
      });
      if (db?.isBanned) return false;

      // Pre-registration takeover guard: someone may have registered a password for an email they
      // don't own. If the real owner proves ownership via magic link, drop that unverified password.
      if (account?.provider === 'nodemailer' && db?.passwordHash && !db.emailVerified) {
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash: null } });
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if (!token.id) return token;

      // Re-read role / ban state so demotions and bans take effect without waiting for expiry.
      const db = await prisma.user.findUnique({
        where: { id: token.id },
        select: { role: true, tier: true, isBanned: true },
      });
      if (!db || db.isBanned) return null; // null invalidates the session
      token.role = db.role;
      token.tier = db.tier;
      return token;
    },
  },
  events: {
    // Fires for OAuth and magic-link signups (credentials signups are handled in /api/auth/register).
    async createUser({ user }) {
      if (!user.id) return;
      if (user.email && user.email !== user.email.toLowerCase()) {
        await prisma.user.update({ where: { id: user.id }, data: { email: user.email.toLowerCase() } });
      }
      await grantSignupBonus(user.id);
      await sendWelcome(user.id);
    },
    async signIn({ user }) {
      if (user.id) {
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      }
    },
  },
});
