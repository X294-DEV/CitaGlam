import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.globalConfig.findFirst({
    where: { id: 'SYSTEM' },
  });

  const templates = {
    ...(config?.emailTemplates as any || {}),
    'reset-password': {
      subject: 'Recuperación de Contraseña - {{system_name}}',
      body: '<h2 style="color: #1A3E3B;">Restablecer Contraseña</h2><p>Estimado(a) {{user_name}},</p><p>Hemos recibido una solicitud para restablecer la contraseña vinculada a tu cuenta en <strong>{{system_name}}</strong>.</p><p>Para proceder con el cambio, por favor haz clic en el siguiente botón (este enlace vence en 24 horas):</p>{{action_button}}<p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>',
    },
    'welcome-active': {
      subject: '¡Tu negocio ya está activo! Bienvenidos a {{system_name}}',
      body: '<h2 style="color: #1A3E3B;">¡Todo Listo!</h2><p>Hola de nuevo {{user_name}},</p><p>Tu cuenta ha sido configurada correctamente y el negocio <strong>{{business_name}}</strong> ya está activo y 100% operativo en nuestro ecosistema.</p><p>A partir de este momento puedes acceder a tu dashboard, configurar tus servicios y comenzar a recibir citas.</p><p>Estamos aquí para ayudarte a crecer.</p>',
    }
  };

  await prisma.globalConfig.upsert({
    where: { id: 'SYSTEM' },
    update: { emailTemplates: templates },
    create: {
      id: 'SYSTEM',
      emailTemplates: templates,
      branding: { systemName: 'CitaGlam' }
    }
  });

  console.log('Templates synchronized successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
