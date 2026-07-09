import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.streamSession.findMany().then(console.log).finally(() => prisma.$disconnect());
