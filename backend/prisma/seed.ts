import 'dotenv/config';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_DEMO_EMAIL ?? 'demo@testflow.local').toLowerCase();
  // No hardcoded credentials: use SEED_DEMO_PASSWORD or generate a random one.
  const generated = !process.env.SEED_DEMO_PASSWORD;
  const password = process.env.SEED_DEMO_PASSWORD ?? randomBytes(9).toString('base64url');

  if (await prisma.user.findUnique({ where: { email } })) {
    console.log(`Demo user ${email} already exists. Nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const workspace = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, name: 'Demo User', passwordHash } });
    const ws = await tx.workspace.create({ data: { name: 'Demo Workspace' } });
    await tx.workspaceMember.create({ data: { userId: user.id, workspaceId: ws.id, role: 'OWNER' } });
    return ws;
  });

  console.log(`Created demo account in workspace "${workspace.name}"`);
  console.log(`  email:    ${email}`);
  if (generated) console.log(`  password: ${password}   (generated - save it now, it is not stored anywhere)`);
  else console.log('  password: (the value of SEED_DEMO_PASSWORD)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
