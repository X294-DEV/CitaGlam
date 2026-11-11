import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '@cgbg/prisma';
import { EmailOptions, EmailProvider } from './email-provider.interface';

@Injectable()
export class NodemailerProvider implements EmailProvider {
  private readonly logger = new Logger(NodemailerProvider.name);

  constructor(private prisma: PrismaService) {}

  private async getTransporter(customConfig?: any) {
    try {
      let mailConfig = customConfig;
      
      if (!mailConfig) {
        const config = await this.prisma.globalConfig.findFirst({
          where: { id: 'SYSTEM' },
          select: { emailConfig: true }
        });
        mailConfig = (config?.emailConfig as any) || {};
      }

      // Fallback logic: check DB config first, then environment variables
      const host = mailConfig.host || process.env.SMTP_HOST;
      const port = Number(mailConfig.port) || Number(process.env.SMTP_PORT) || 587;
      const user = mailConfig.user || process.env.SMTP_USER;
      const pass = mailConfig.pass || process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        this.logger.warn('SMTP configuration is missing in both DB and Environment.');
        return null;
      }

      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } catch (error) {
      this.logger.error('Error initializing SMTP transporter', error);
      return null;
    }
  }

  async verifyConnection(config?: any): Promise<boolean> {
    const transporter = await this.getTransporter(config);
    if (!transporter) return false;

    try {
      await transporter.verify();
      this.logger.log('SMTP connection verified successfully.');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed:', error.message);
      return false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      this.logger.error('Email aborted: Transporter not initialized.');
      return;
    }

    try {
      const globalConfig = await this.prisma.globalConfig.findFirst({
        where: { id: 'SYSTEM' },
        select: { emailTemplates: true, branding: true }
      });

      const templates = (globalConfig?.emailTemplates as any) || {};
      const templateData = options.template ? templates[options.template] || {} : {};
      const systemName = (globalConfig?.branding as any)?.systemName || 'CitaGlam';

      // Combine default context with provided context
      const fullContext = {
        ...options.context,
        system_name: systemName,
        current_year: new Date().getFullYear().toString(),
        user_email: options.to
      };

      // Use template from DB, provided direct HTML, or fallback to default hardcoded logic
      let htmlBody = options.html || templateData.body || (options.template ? this.getDefaultTemplate(options.template, fullContext) : '');
      let subject = options.subject || templateData.subject || 'Notificación de ' + systemName;

      const branding = globalConfig?.branding as any || {};
      // Ensure logoUrl is absolute for email clients
      if (branding.logoUrl && !branding.logoUrl.startsWith('http')) {
        const apiUrl = process.env.API_URL || 'http://localhost:3001';
        branding.logoUrl = `${apiUrl}${branding.logoUrl.startsWith('/') ? '' : '/'}${branding.logoUrl}`;
      }

      // Wrap in Fixed Layout (Master Header/Footer)
      const finalHtml = this.wrapInLayout(htmlBody, fullContext, branding);

      await transporter.sendMail({
        from: `"${systemName}" <${(transporter.options as any).auth?.user}>`,
        to: options.to,
        subject: this.replacePlaceholders(subject, fullContext),
        html: finalHtml,
      });

      this.logger.log(`Email sent to ${options.to} with template: ${options.template}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error.stack);
      if (process.env.NODE_ENV === 'production') throw error;
    }
  }

  private replacePlaceholders(content: string, context: any): string {
    if (!content) return '';
    let processedContent = content;

    // 1. First Pass: Structural Components (Robust regex for optional spaces/HTML)
    processedContent = processedContent.replace(/\{\{\s*action_button\s*\}\}/g, () => this.renderActionButton(context));
    processedContent = processedContent.replace(/\{\{\s*appointment_summary\s*\}\}/g, () => this.renderAppointmentSummary(context));
    processedContent = processedContent.replace(/\{\{\s*payment_summary\s*\}\}/g, () => this.renderPaymentSummary(context));

    // 2. Second Pass: Standard Variable replacement
    return processedContent.replace(/\{\{(.*?)\}\}/g, (match, key) => {
      const value = context[key.trim()];
      return value !== undefined ? value : match;
    });
  }

  private renderActionButton(context: any): string {
    const text = context.cta_text || 'Continuar';
    const url = context.magic_link || context.cta_url || '#';
    const primaryColor = context.primary_color || '#2D4A47';

    return `
      <div style="text-align: center; margin: 35px 0;">
        <a href="${url}" style="background-color: ${primaryColor}; color: #ffffff; padding: 15px 35px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; box-shadow: 0 4px 15px rgba(45,74,71,0.2); font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">${text}</a>
      </div>
    `;
  }

  private renderAppointmentSummary(context: any): string {
    const labelsStyle = 'color: #64748B; padding: 15px; border-bottom: 1px solid #F1F5F9; font-size: 14px;';
    const valuesStyle = 'font-weight: 700; color: #1E293B; padding: 15px; border-bottom: 1px solid #F1F5F9; font-size: 14px; text-align: right;';

    return `
      <div style="background-color: #FDFEFE; border-radius: 12px; border: 1px solid #E2E8F0; margin: 25px 0; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <tr><td style="${labelsStyle}">Servicio:</td><td style="${valuesStyle}">${context.service_name || 'N/D'}</td></tr>
          <tr><td style="${labelsStyle}">Fecha:</td><td style="${valuesStyle}">${context.appointment_date || 'N/D'}</td></tr>
          <tr><td style="${labelsStyle}">Horario:</td><td style="${valuesStyle}">${context.appointment_time || 'N/D'}</td></tr>
          <tr><td style="${labelsStyle}">Ubicación:</td><td style="${valuesStyle}">${context.business_name || 'N/D'}</td></tr>
        </table>
      </div>
    `;
  }

  private renderPaymentSummary(context: any): string {
    return `
      <div style="border: 2px dashed #CBD5E1; padding: 40px; border-radius: 16px; margin: 25px 0; text-align: center; background-color: #F8FAFC; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <p style="color: #64748B; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Comprobante de Operación</p>
        <h1 style="color: #2D4A47; margin: 15px 0 5px 0; font-size: 42px; font-weight: 800;">${context.payment_amount || '$0.00'}</h1>
        <p style="color: #64748B; font-size: 14px; margin: 0;">Confirmación de recepción exitosa</p>
      </div>
    `;
  }

  public wrapInLayout(body: string, context: any, branding: any): string {
    const systemName = branding?.systemName || 'CitaGlam Software';
    const primaryColor = branding?.primaryColor || '#2D4A47';
    const logoUrl = branding?.logoUrl;
    const currentYear = new Date().getFullYear();
    const defaultFont = "'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif";

    // Clean body to prevent duplication issues
    const processedBody = this.replacePlaceholders(body, context);

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFCFB; font-family: ${defaultFont};">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAFCFB; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        
        <!-- Bloque Principal de 600px -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 20px; border-collapse: separate; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid #E8F0ED; margin: 0 auto; width: 600px !important;">
          
          <!-- FILA 1: Header Estilizado (Color Suave para Contraste) -->
          <tr>
            <td align="center" bgcolor="#95bcb8" style="padding: 45px 0; background-color: #95bcb8 !important;">
               <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100% !important;">
                 <tr>
                   <td align="center">
                     ${logoUrl 
                       ? `<img src="${logoUrl}" alt="${systemName}" height="60" style="display: block; border: 0;" />` 
                       : `<div style="color: #1A3E3B !important; font-family: ${defaultFont}; font-size: 28px; font-weight: 800; letter-spacing: -1px; line-height: 1;">${systemName}</div>`
                     }
                   </td>
                 </tr>
               </table>
            </td>
          </tr>

          <!-- FILA 2: Contenido Principal -->
          <tr>
            <td style="padding: 60px 45px; background-color: #ffffff;">
               <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100% !important;">
                 <tr>
                    <td style="color: #334155; line-height: 1.8; font-size: 16px; font-family: ${defaultFont};">
                      ${processedBody}
                    </td>
                 </tr>
               </table>
            </td>
          </tr>

          <!-- FILA 3: Footer Estilizado -->
          <tr>
            <td align="center" style="background-color: #F8FAFC; padding: 40px 45px; border-top: 1px solid #F1F5F9;">
              <div style="color: #64748B; font-size: 13px; font-weight: 500; font-family: ${defaultFont};">
                Enviado de forma segura por <strong>${systemName}</strong>
              </div>
              <div style="color: #94A3B8; font-size: 11px; margin-top: 10px; font-family: ${defaultFont};">
                &copy; ${currentYear} | Ecosistema de Operaciones Digitales
              </div>
            </td>
          </tr>
        </table>
        
        <!-- Marcador Final Externo (Clean Look) -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="margin-top: 25px; width: 600px !important;">
          <tr>
            <td align="center" style="color: #CBD5E1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; font-family: ${defaultFont};">
              Protegido por CitaGlam Technology
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  public async renderPreview(body: string, subject: string): Promise<string> {
    const globalConfig = await this.prisma.globalConfig.findFirst({
      where: { id: 'SYSTEM' },
      select: { branding: true }
    });

    const context = {
      user_name: 'Juan Pérez',
      user_email: 'juan.perez@ejemplo.com',
      business_name: 'Mi Negocio Demo',
      magic_link: '#',
      system_name: (globalConfig?.branding as any)?.systemName || 'CitaGlam',
      current_year: new Date().getFullYear().toString(),
      appointment_date: '15/10/2026',
      appointment_time: '14:00',
      service_name: 'Corte de Cabello Premium',
      payment_amount: '$450.00 MXN'
    };

    const branding = globalConfig?.branding as any || {};
    // Ensure logoUrl is absolute for preview
    if (branding.logoUrl && !branding.logoUrl.startsWith('http')) {
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      branding.logoUrl = `${apiUrl}${branding.logoUrl.startsWith('/') ? '' : '/'}${branding.logoUrl}`;
    }

    return this.wrapInLayout(body, context, branding);
  }

  private getDefaultTemplate(templateName: string, context: any): string {
    // Fallback basic templates if not defined in DB
    switch (templateName) {
      case 'activation':
        return `
          <h2 style="color: #2D4A47;">¡Hola {{user_name}}!</h2>
          <p>Bienvenido a {{system_name}}. Para activar tu cuenta y comenzar a gestionar tu negocio, haz clic en el siguiente enlace:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{magic_link}}" style="background-color: #4A8E8A; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Activar mi cuenta</a>
          </div>
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador: <br> <small>{{magic_link}}</small></p>
        `;
      case 'subscription-approved':
        return `
          <h2 style="color: #2D4A47;">¡Pago Confirmado!</h2>
          <p>Hola <strong>{{businessName}}</strong>,</p>
          <p>Nos complace informarte que hemos validado exitosamente tu comprobante de pago.</p>
          <div style="background-color: #F8FBF9; padding: 20px; border-radius: 12px; border-left: 4px solid #4A8E8A; margin: 20px 0;">
            <p style="margin: 0;"><strong>Plan Activado:</strong> {{planName}}</p>
            <p style="margin: 5px 0 0 0;"><strong>Vigencia hasta:</strong> {{expiryDate}}</p>
          </div>
          <p>Tu cuenta ya cuenta con todas las funcionalidades habilitadas. ¡Gracias por confiar en nosotros!</p>
        `;
      case 'subscription-rejected':
        return `
          <h2 style="color: #E57373;">Aviso sobre tu Solicitud de Suscripción</h2>
          <p>Hola <strong>{{businessName}}</strong>,</p>
          <p>Lamentamos informarte que no hemos podido validar tu comprobante de pago por el siguiente motivo:</p>
          <div style="background-color: #FFF5F5; padding: 20px; border-radius: 12px; border-left: 4px solid #E57373; margin: 20px 0;">
            <p style="margin: 0; color: #D32F2F;"><strong>Motivo:</strong> {{reason}}</p>
          </div>
          <p>Te invitamos a corregir el inconveniente y subir nuevamente un comprobante válido pulsando el siguiente botón:</p>
          {{action_button}}
          <p style="font-size: 13px; color: #889; margin-top: 20px;">Si tienes dudas sobre este proceso, por favor contáctanos.</p>
        `;
      case 'reset-password':
        return `
          <h2 style="color: #1A3E3B;">Recuperación de Contraseña</h2>
          <p>Hola {{user_name}}, has solicitado un cambio de contraseña para acceder a {{system_name}}.</p>
          <p>Haz clic en el siguiente botón para restablecer tu acceso. Este enlace vence en 24 horas.</p>
          {{action_button}}
          <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        `;
      case 'welcome-active':
        return `
          <h2 style="color: #1A3E3B; font-weight: 800; font-size: 24px; margin-bottom: 20px;">¡Tu cuenta ya está activa!</h2>
          <p>Hola <strong>{{user_name}}</strong>,</p>
          <p>Es un gusto saludarte. Te confirmamos que tu cuenta ha sido activada exitosamente y ya tienes acceso total a la gestión de <strong>{{business_name}}</strong>.</p>
          <p>A partir de ahora, puedes comenzar a gestionar citas y ver el crecimiento de tu negocio desde tu panel administrativo.</p>
          {{action_button}}
          <p>¡Mucho éxito en esta nueva etapa digital!</p>
        `;
      case 'express-invitation':
        return `
          <h2 style="color: #1A3E3B; font-weight: 800; font-size: 26px; margin-bottom: 20px; letter-spacing: -0.5px;">Panel de Control CitaGlam</h2>
          <p>Estimado(a) <strong>{{user_name}}</strong>,</p>
          <p>Has sido invitado para tomar las riendas de <strong>{{business_name}}</strong> en nuestra plataforma de gestión inteligente.</p>
          <p>Para comenzar y asegurar tu acceso, es necesario que verifiques tu cuenta y configures tu contraseña de acceso a través del siguiente enlace seguro:</p>
          
          {{action_button}}

          <p style="color: #889; font-size: 13px; line-height: 1.6; margin-top: 30px; padding: 15px; background: #F8FAFC; border-radius: 10px;">
            <i-lucide name="info" class="icon-xs"></i-lucide>
            <strong>Nota de seguridad:</strong> Este enlace es personal y vencerá en 24 horas por motivos de protección de datos.
          </p>
          <p>Si no esperabas esta invitación, puedes ignorar este correo de forma segura.</p>
        `;
      case 'new-lead':
        return `
          <h2 style="color: #1A3E3B;">Nueva Solicitud de Registro</h2>
          <p>Se ha registrado un nuevo lead interesado en la plataforma:</p>
          <ul style="color: #334155; line-height: 2;">
            <li><strong>Nombre:</strong> {{prospect_name}}</li>
            <li><strong>Email:</strong> {{prospect_email}}</li>
            <li><strong>Teléfono:</strong> {{prospect_phone}}</li>
            <li><strong>Negocio:</strong> {{business_name}}</li>
          </ul>
          <p>Ingresa al panel administrativo para gestionar este prospecto.</p>
        `;
      case 'business-proposal':
        return `
          <h2 style="color: #1A3E3B;">Propuesta de Negocio</h2>
          <p>Hola <strong>{{user_name}}</strong>, es un gusto saludarte.</p>
          <p>Presentamos la propuesta formal para la activación de <strong>{{business_name}}</strong>:</p>
          <ul style="color: #334155; line-height: 1.8;">
            <li><strong>Paquete:</strong> {{package_name}}</li>
            <li><strong>Inversión:</strong> {{negotiated_price}}</li>
            <li><strong>Vigencia:</strong> {{months_count}} Mes(es)</li>
          </ul>
          <h3 style="color: #2D4A47; margin-top: 25px;">Datos de Transferencia</h3>
          <div style="background: #F8FAFC; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0;">
            <p style="margin: 5px 0;"><strong>Banco:</strong> {{bank_name}}</p>
            <p style="margin: 5px 0;"><strong>Cuenta CLABE:</strong> {{clabe}}</p>
            <p style="margin: 5px 0;"><strong>Referencia:</strong> {{reference}}</p>
          </div>
          <p>Para activar tu cuenta, sube el comprobante de pago aquí:</p>
          {{action_button}}
        `;
      case 'payment-proof-uploaded':
        return `
          <h2 style="color: #1A3E3B;">Nuevo Comprobante Recibido</h2>
          <p>Hola <strong>{{admin_name}}</strong>,</p>
          <p>Se ha recibido un nuevo comprobante de pago para la solicitud de activación de negocio.</p>
          <div style="background: #F8FAFC; padding: 25px; border-radius: 12px; border: 1px solid #E2E8F0; margin: 25px 0;">
            <p style="margin: 5px 0;"><strong>Negocio:</strong> {{business_name}}</p>
            <p style="margin: 5px 0;"><strong>Cliente:</strong> {{client_name}}</p>
          </div>
          <p>Por favor, ingresa al panel administrativo para verificar el documento y activar el Tenant correspondiente.</p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="{{action_url}}" style="background-color: #2D4A47; color: #ffffff; padding: 15px 35px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block;">Gestionar Solicitudes</a>
          </div>
        `;
      default:
        return `<p>Mensaje automático de <strong>{{system_name}}</strong></p>`;
    }
  }
}
