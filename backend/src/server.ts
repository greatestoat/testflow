import { env } from './config/env';
import { prisma } from './config/prisma';
import { createApp } from './app';

async function main() {
  await prisma.$connect();
  console.log('MongoDB connected');
  const server = createApp().listen(env.PORT, () => console.log(`TestFlow API listening on :${env.PORT}`));

  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start', err);
  process.exit(1);
});
