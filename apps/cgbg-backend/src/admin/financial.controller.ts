import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UnauthorizedException } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { CreateSaaSExpenseDto, UpdateSaaSExpenseDto } from './dto/finance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('admin/finance')
@UseGuards(JwtAuthGuard)
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  private checkSuperAdmin(user: { role: Role }) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException('Acceso restringido al SuperAdministrador.');
    }
  }

  @Get('health')
  getFinancialHealth(@CurrentUser() user: { role: Role }) {
    this.checkSuperAdmin(user);
    return this.financialService.getFinancialHealth();
  }

  @Get('expenses')
  getExpenses(@CurrentUser() user: { role: Role }) {
    this.checkSuperAdmin(user);
    return this.financialService.getExpenses();
  }

  @Post('expenses')
  createExpense(@CurrentUser() user: { role: Role }, @Body() createSaaSExpenseDto: CreateSaaSExpenseDto) {
    this.checkSuperAdmin(user);
    return this.financialService.createExpense(createSaaSExpenseDto);
  }

  @Patch('expenses/:id')
  updateExpense(@CurrentUser() user: { role: Role }, @Param('id') id: string, @Body() updateSaaSExpenseDto: UpdateSaaSExpenseDto) {
    this.checkSuperAdmin(user);
    return this.financialService.updateExpense(id, updateSaaSExpenseDto);
  }

  @Delete('expenses/:id')
  removeExpense(@CurrentUser() user: { role: Role }, @Param('id') id: string) {
    this.checkSuperAdmin(user);
    return this.financialService.deleteExpense(id);
  }

  @Post('test-reminders')
  testReminders(@CurrentUser() user: { role: Role }) {
    this.checkSuperAdmin(user);
    return this.financialService.checkPaymentReminders();
  }
}
