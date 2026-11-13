// API real local encendida; DATABASE_URL debe apuntar al mismo Postgres local.
// node --env-file=.env --test apps/cgbg-backend/test/appointments-integrity.security.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

test('S0-10: sucursal del negocio y reprogramación sin conflicto propio', async (t) => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3001';
  for (const url of [baseUrl, process.env.DATABASE_URL]) {
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Solo se permiten servicios locales.');
  }
  const prisma = new PrismaClient();
  const suffix = randomUUID();
  const email = (name) => `${name}-${suffix}@example.test`;
  const emails = ['admin', 'client', 'invalid'].map(email);
  const tenantIds = [];
  let packageId;
  async function api(path, method = 'GET', body, token) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    packageId = (await prisma.subscriptionPackage.create({ data: { name: `S0-10 ${suffix}`, price: 100 } })).id;
    for (const name of ['A', 'B']) {
      tenantIds.push((await prisma.tenant.create({ data: {
        name: `Negocio ficticio ${name}`, slug: `s0-10-${name.toLowerCase()}-${suffix}`, packageId,
      } })).id);
    }
    const branches = [];
    for (const tenantId of tenantIds) {
      branches.push(await prisma.branch.create({ data: { tenantId, name: 'Sucursal ficticia', address: 'Ficticia' } }));
    }
    const service = await prisma.service.create({ data: { tenantId: tenantIds[0], name: 'Servicio ficticio', price: 100 } });
    const password = randomBytes(12).toString('hex');
    await prisma.user.create({ data: {
      email: email('admin'), firstName: 'Admin', lastName: 'Ficticio', tenantId: tenantIds[0],
      role: 'ADMIN', isActive: true, password: await argon2.hash(password),
    } });
    const client = await prisma.user.create({ data: {
      email: email('client'), firstName: 'Cliente', lastName: 'Ficticio', role: 'CLIENT', isActive: true,
    } });
    const login = await api('/auth/login', 'POST', { email: email('admin'), password });
    assert.equal(login.status, 200);
    const token = login.body.access_token;
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 2);
    date.setUTCHours(10, 0, 0, 0);
    for (const branch of branches) {
      await prisma.businessSchedule.create({ data: {
        branchId: branch.id, dayOfWeek: date.getUTCDay(), openTime: '09:00', closeTime: '18:00',
      } });
    }
    const appointment = await prisma.appointment.create({ data: {
      tenantId: tenantIds[0], clientId: client.id, branchId: branches[0].id, serviceId: service.id,
      startTime: date, endTime: new Date(date.getTime() + 3600000), status: 'PENDING_PAYMENT',
    } });

    await t.test('reserva y disponibilidad rechazan sucursal ajena o inexistente con 404', async () => {
      for (const branchId of [branches[1].id, randomUUID()]) {
        const booking = await api('/appointments/public', 'POST', {
          branchId, serviceId: service.id, startTime: date.toISOString(),
          clientInfo: { email: email('invalid'), firstName: 'Sin', lastName: 'Crear', termsAccepted: true },
        });
        assert.equal(booking.status, 404);
        const query = new URLSearchParams({ branchId, serviceId: service.id, date: date.toISOString() });
        assert.equal((await api(`/appointments/available?${query}`)).status, 404);
      }
      assert.equal(await prisma.user.count({ where: { email: email('invalid') } }), 0);
      assert.equal(await prisma.appointment.count({ where: { tenantId: { in: tenantIds } } }), 1);
    });

    await t.test('COMPLETED y CANCELLED reciben 400 y no cambian', async () => {
      for (const status of ['COMPLETED', 'CANCELLED']) {
        const before = await prisma.appointment.update({ where: { id: appointment.id }, data: { status } });
        const result = await api(`/appointments/${appointment.id}/reschedule`, 'PATCH', { newStartTime: date.toISOString() }, token);
        assert.equal(result.status, 400);
        assert.deepEqual(await prisma.appointment.findUnique({ where: { id: appointment.id } }), before);
      }
    });

    await t.test('los tres estados permitidos conservan estado y aceptan su propio horario', async () => {
      for (const status of ['PENDING_PAYMENT', 'WAITING_APPROVAL', 'AUTHORIZED']) {
        await prisma.appointment.update({ where: { id: appointment.id }, data: { status } });
        const result = await api(`/appointments/${appointment.id}/reschedule`, 'PATCH', { newStartTime: date.toISOString() }, token);
        assert.equal(result.status, 200);
        assert.equal(result.body.status, status);
        assert.equal(result.body.startTime, date.toISOString());
      }
    });

    await t.test('otra cita ocupada sigue causando 409 y otra pertenencia devuelve 404', async () => {
      const nextHour = new Date(date.getTime() + 3600000);
      await prisma.appointment.create({ data: {
        tenantId: tenantIds[0], clientId: client.id, branchId: branches[0].id, serviceId: service.id,
        startTime: nextHour, endTime: new Date(nextHour.getTime() + 3600000), status: 'AUTHORIZED',
      } });
      assert.equal((await api(`/appointments/${appointment.id}/reschedule`, 'PATCH', { newStartTime: nextHour.toISOString() }, token)).status, 409);
      await prisma.appointment.update({ where: { id: appointment.id }, data: { tenantId: tenantIds[1] } });
      assert.equal((await api(`/appointments/${appointment.id}/reschedule`, 'PATCH', { newStartTime: date.toISOString() }, token)).status, 404);
    });
  } finally {
    await prisma.payment.deleteMany({ where: { appointment: { tenantId: { in: tenantIds } } } });
    await prisma.appointment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.businessSchedule.deleteMany({ where: { branch: { tenantId: { in: tenantIds } } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.service.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    if (packageId) await prisma.subscriptionPackage.delete({ where: { id: packageId } });
    await prisma.$disconnect();
  }
});
