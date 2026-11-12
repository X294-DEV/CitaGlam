import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding CGBG Packages and SuperAdmin...');

  // 1. Basic Package (Esencial)
  const basicPackage = await prisma.subscriptionPackage.upsert({
    where: { name: 'Básico' },
    update: {},
    create: {
      name: 'Básico',
      description: 'Ideal para negocios individuales y freelancers.',
      price: 199.00,
      interval: 'monthly',
      pricesByTerm: {
        "1": 199,
        "3": 567,
        "6": 1075,
        "12": 1990
      },
      limits: {
        maxClients: 100,
        maxServices: 5,
        maxBranches: 1,
        maxUsers: 2
      },
      features: {
        canCustomBranding: false,
        canWhatsApp: false,
        canOfflinePayments: true,
        canAdvancedReports: false
      }
    },
  });

  // 2. Standard Package (Profesional)
  const standardPackage = await prisma.subscriptionPackage.upsert({
    where: { name: 'Estándar' },
    update: {},
    create: {
      name: 'Estándar',
      description: 'Para locales establecidos, clínicas y salones.',
      price: 449.00,
      interval: 'monthly',
      pricesByTerm: {
        "1": 449,
        "3": 1280,
        "6": 2425,
        "12": 4490
      },
      limits: {
        maxClients: 9999, // Ilimitado conceptually
        maxServices: 99,
        maxBranches: 3,
        maxUsers: 10
      },
      features: {
        canCustomBranding: true,
        canWhatsApp: true,
        canOfflinePayments: true,
        canAdvancedReports: true
      }
    },
  });

  // 3. SuperAdmin User
  const superAdminEmail = 'admin@cgbg.com';
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedAdminPassword) {
    throw new Error('Falta SEED_ADMIN_PASSWORD en el .env (contraseña inicial del superadmin).');
  }
  const hashedPassword = await argon2.hash(seedAdminPassword);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      password: hashedPassword,
      firstName: 'CGBG',
      lastName: 'SuperAdmin',
      role: 'SUPERADMIN',
      isActive: true,
    },
  });

  // 4. Global Config
  await prisma.globalConfig.upsert({
    where: { id: 'SYSTEM' },
    update: {},
    create: {
      id: 'SYSTEM',
      gracePeriodDays: 3,
      reminderHours: 24,
    },
  });

  console.log({ basicPackage, standardPackage, superAdmin });
  console.log('✅ Seeding finished successfully with Global Config.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
