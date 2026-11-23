import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { Prisma } from '@prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { customerSelect } from './customer.select';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      select: { ...customerSelect, appointments: {
        where: { tenantId }, orderBy: { startTime: 'desc' },
        select: { id: true, status: true, startTime: true, service: { select: { price: true } } },
      } },
    });
    return customers.map(({ appointments, ...customer }) => ({
      ...customer,
      totalSpent: appointments.filter(a => a.status === 'COMPLETED' || a.status === 'AUTHORIZED')
        .reduce((sum, a) => sum + Number(a.service.price), 0),
      appointmentsCount: appointments.length,
      lastVisit: appointments[0]?.startTime ?? null,
    }));
  }

  async findOne(id: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      select: { ...customerSelect, appointments: {
        where: { tenantId }, orderBy: { startTime: 'desc' },
        include: { service: true, branch: true },
      } },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    return {
      ...customer,
      totalSpent: customer.appointments.filter(a => a.status === 'COMPLETED' || a.status === 'AUTHORIZED')
        .reduce((sum, a) => sum + Number(a.service.price), 0),
      appointmentsCount: customer.appointments.length,
      lastVisit: customer.appointments[0]?.startTime ?? null,
    };
  }

  async createManual(tenantId: string, data: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({
        data: { tenantId, firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone },
        select: customerSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('El teléfono ya está registrado en este negocio.');
      }
      throw error;
    }
  }
}
