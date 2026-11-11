import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { CreateSaaSExpenseDto, UpdateSaaSExpenseDto } from './dto/finance.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationActionType, Role } from '@prisma/client';

@Injectable()
export class FinancialService {
  private readonly logger = new Logger(FinancialService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createExpense(dto: CreateSaaSExpenseDto) {
    return this.prisma.saaSExpense.create({
      data: {
        ...dto,
      },
    });
  }

  async updateExpense(id: string, dto: UpdateSaaSExpenseDto) {
    return this.prisma.saaSExpense.update({
      where: { id },
      data: dto,
    });
  }

  async deleteExpense(id: string) {
    return this.prisma.saaSExpense.delete({
      where: { id },
    });
  }

  async getExpenses() {
    return this.prisma.saaSExpense.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFinancialHealth() {
    const expenses = await this.prisma.saaSExpense.findMany({
      where: { isActive: true },
    });
    
    const totalMonthlyCost = expenses.reduce((acc: number, curr: any) => acc + Number(curr.monthlyCost), 0);

    const approvedPayments = await this.prisma.subscriptionPayment.findMany({
      where: { status: 'APPROVED' },
    });
    
    // Saldo Total (Liquidez Real)
    const totalLiquidity = approvedPayments.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    
    // MRR (Ingresos Recurrentes Mensuales basados en tenants activos)
    const activeTenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      include: { package: true }
    });
    
    const mrr = activeTenants.reduce((acc: number, curr: any) => acc + Number(curr.package.price), 0);
    
    // Cálculo de Métricas Base
    const netProfit = mrr - totalMonthlyCost;
    const runwayMonths = totalMonthlyCost > 0 ? (totalLiquidity / totalMonthlyCost) : 0;
    const runwayYears = runwayMonths / 12;
    
    // Lógica del Consejero Financiero (Advisor)
    let advisor = {
      status: 'INITIAL',
      message: 'Registra ingresos y gastos para iniciar la consultoría financiera.',
      recommendedSalary: '$0',
      recommendedSalaryRange: { min: 0, max: 0 },
      recommendedCapital: '100%',
      color: 'gray',
      runwayText: `${Math.round(runwayMonths)} meses`
    };

    if (totalMonthlyCost > 0) {
      const runwayDisplay = runwayMonths >= 12 
        ? `${runwayYears.toFixed(1)} años` 
        : `${Math.round(runwayMonths)} meses`;

      if (runwayMonths < 3) {
        advisor = {
          status: 'CRITICAL',
          message: `¡Peligro! Tienes un runway de apenas ${runwayDisplay}. Por el momento te recomiendo NO retirar dinero; enfócate 100% en ventas y capitalización.`,
          recommendedSalary: '$0',
          recommendedSalaryRange: { min: 0, max: 0 },
          recommendedCapital: '100%',
          color: 'red',
          runwayText: runwayDisplay
        };
      } else if (runwayMonths >= 3 && runwayMonths < 6) {
        advisor = {
          status: 'STARTING',
          message: `Estás en fase inicial con un runway de ${runwayDisplay}. Sugiero mantener todo el capital para fortalecer el fondo de maniobra del SaaS.`,
          recommendedSalary: '$0',
          recommendedSalaryRange: { min: 0, max: 0 },
          recommendedCapital: '100%',
          color: 'orange',
          runwayText: runwayDisplay
        };
      } else if (runwayMonths >= 6 && runwayMonths < 12) {
        const minSalary = Math.max(0, netProfit * 0.15);
        const maxSalary = Math.max(0, netProfit * 0.25);
        advisor = {
          status: 'GROWTH',
          message: `Crecimiento detectado. Con un runway de ${runwayDisplay}, ya puedes considerar un retiro prudente para uso personal.`,
          recommendedSalary: `$${Math.round(minSalary).toLocaleString()} - $${Math.round(maxSalary).toLocaleString()}`,
          recommendedSalaryRange: { min: minSalary, max: maxSalary },
          recommendedCapital: '75% - 85%',
          color: 'teal',
          runwayText: runwayDisplay
        };
      } else if (runwayMonths >= 12 && runwayMonths < 24) {
        const minSalary = Math.max(0, netProfit * 0.35);
        const maxSalary = Math.max(0, netProfit * 0.50);
        advisor = {
          status: 'STABLE',
          message: `SaaS consolidado. Tienes un runway de ${runwayDisplay}. Tienes libertad para un sueldo competitivo manteniendo el crecimiento.`,
          recommendedSalary: `$${Math.round(minSalary).toLocaleString()} - $${Math.round(maxSalary).toLocaleString()}`,
          recommendedSalaryRange: { min: minSalary, max: maxSalary },
          recommendedCapital: '50% - 65%',
          color: 'green',
          runwayText: runwayDisplay
        };
      } else if (runwayMonths >= 24) {
        const minSalary = Math.max(0, netProfit * 0.50);
        const maxSalary = Math.max(0, netProfit * 0.70);
        advisor = {
          status: 'EXCELLENT',
          message: `¡Vas excelente! Tienes un runway estable de ${runwayDisplay}. Puedes disponer de ingresos personales significativos y reinvertir el resto como capital agresivo.`,
          recommendedSalary: `$${Math.round(minSalary).toLocaleString()} - $${Math.round(maxSalary).toLocaleString()}`,
          recommendedSalaryRange: { min: minSalary, max: maxSalary },
          recommendedCapital: '30% - 50%',
          color: 'green',
          runwayText: runwayDisplay
        };
      }
    }

    return {
      metrics: {
        totalMonthlyCost,
        totalLiquidity,
        mrr,
        runwayMonths: Math.round(runwayMonths * 10) / 10,
        runwayYears: Math.round(runwayYears * 10) / 10,
        netProfit,
        profitabilityMargin: mrr > 0 ? (netProfit / mrr) * 100 : 0
      },
      advisor,
      expenses
    };
  }

  // Notificaciones de Fecha de Pago
  async checkPaymentReminders() {
    const today = new Date().getDate();
    const expenses = await this.prisma.saaSExpense.findMany({
      where: { 
        isActive: true,
        dueDay: { not: null }
      }
    });

    for (const exp of expenses) {
      if (exp.dueDay! - today <= 3 && exp.dueDay! - today >= 0) {
        const superAdmins = await this.prisma.user.findMany({
          where: { role: Role.SUPERADMIN, isActive: true }
        });

        for (const admin of superAdmins) {
          await this.notificationsService.create({
            userId: admin.id,
            title: '⚠️ Recordatorio de Pago',
            message: `El servicio "${exp.name}" vence en ${exp.dueDay! - today} días ($${exp.monthlyCost}).`,
            type: NotificationType.WARNING,
            actionType: NotificationActionType.INTERNAL_NAV,
            actionUrl: '/admin/saas/balance'
          });
        }
      }
    }
  }
}
