import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const config = await prisma.globalConfig.findFirst({ where: { id: 'SYSTEM' } });
    const branding = (config?.branding as any) || {};
    
    await prisma.globalConfig.upsert({
      where: { id: 'SYSTEM' },
      update: {
        branding: {
          ...branding,
          logoUrl: '/uploads/branding/logo.png',
          systemName: 'CitaGlam'
        }
      },
      create: {
        id: 'SYSTEM',
        branding: {
          logoUrl: '/uploads/branding/logo.png',
          systemName: 'CitaGlam'
        }
      }
    });
    console.log('✅ Base de datos actualizada con logoUrl y systemName.');
  } catch (error) {
    console.error('❌ Error actualizando la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
