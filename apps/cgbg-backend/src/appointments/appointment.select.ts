import type { Prisma } from '@prisma/client';
import type {
  AppointmentDto,
  PublicAppointmentResponse,
} from '@cgbg/shared-types';
import { customerSelect } from '../clients/customer.select';

export const appointmentInclude = {
  customer: { select: customerSelect },
  branch: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      phone: true,
      timezone: true,
    },
  },
  service: {
    select: {
      id: true,
      name: true,
      durationMin: true,
      price: true,
      color: true,
    },
  },
  payment: {
    select: {
      id: true,
      amount: true,
      receiptUrl: true,
      isApproved: true,
      approvedAt: true,
    },
  },
  tenant: { select: { name: true } },
} as const;
export type AppointmentRecord = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

export function toAppointmentDto(row: AppointmentRecord): AppointmentDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    branchId: row.branchId,
    serviceId: row.serviceId,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    status: row.status,
    notes: row.notes,
    paymentExpiry: row.paymentExpiry?.toISOString() ?? null,
    termsAcceptedAt: row.termsAcceptedAt?.toISOString() ?? null,
    customer: {
      ...row.customer,
      createdAt: row.customer.createdAt.toISOString(),
      updatedAt: row.customer.updatedAt.toISOString(),
    },
    branch: row.branch,
    service: { ...row.service, price: row.service.price.toString() },
    payment: row.payment
      ? {
          ...row.payment,
          amount: row.payment.amount.toString(),
          approvedAt: row.payment.approvedAt?.toISOString() ?? null,
        }
      : null,
  };
}
export function toPublicAppointment(
  row: AppointmentRecord,
): PublicAppointmentResponse {
  return {
    id: row.id,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    status: row.status,
    paymentExpiry: row.paymentExpiry?.toISOString() ?? null,
    branch: {
      name: row.branch.name,
      address: row.branch.address,
      timezone: row.branch.timezone,
    },
    service: {
      name: row.service.name,
      durationMin: row.service.durationMin,
      price: row.service.price.toString(),
    },
    payment: row.payment ? { amount: row.payment.amount.toString() } : null,
  };
}
