import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.appConfig.upsert({ where: { id: 'singleton' }, create: { id: 'singleton' }, update: {} });

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('AppConfig ready. SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set, skipping admin.');
    return;
  }
  if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters');

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, name: 'Admin', passwordHash, role: 'ADMIN', tier: 'ENTERPRISE', emailVerified: new Date() },
    update: { role: 'ADMIN' }, // never overwrites an existing password
  });
  console.log(`Admin ready: ${email}`);

  // Optional regular demo user for manual testing (local only; never set in production).
  const uEmail = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  const uPass = process.env.SEED_USER_PASSWORD;
  if (uEmail && uPass) {
    if (uPass.length < 12) throw new Error('SEED_USER_PASSWORD must be at least 12 characters');
    const exists = await prisma.user.findUnique({ where: { email: uEmail }, select: { id: true } });
    if (!exists) {
      await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { email: uEmail, name: 'Demo User', passwordHash: await bcrypt.hash(uPass, 12), emailVerified: new Date(), creditsBalance: 10 },
        });
        await tx.creditLedger.create({ data: { userId: u.id, delta: 10, balanceAfter: 10, reason: 'ADMIN_GRANT', note: 'seed demo credits' } });
      });
    }
    console.log(`Demo user ready: ${uEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
