// Ejecutar con la API local encendida y DATABASE_URL apuntando a su base local:
// node --env-file=.env --test apps/cgbg-backend/test/public-booking.security.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

function assertNoSecrets(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    assert.doesNotMatch(key, /password|token|activationExpires/i);
    assertNoSecrets(nested);
  }
}

test('S0-02: reserva pública y respuestas de usuarios sin secretos', async (t) => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3001';
  for (const url of [baseUrl, process.env.DATABASE_URL]) {
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname),
      'Esta prueba solo permite API y base de datos locales.');
  }
  const prisma = new PrismaClient();
  const suffix = randomUUID();
  const email = (name) => `${name}-${suffix}@example.test`;
  const password = randomBytes(12).toString('hex');
  let packageId;
  let tenantId;
  let admin;
  const createdEmails = ['admin', 'normal', 'manual', 'staff', 'register'].map(email);

  async function api(path, method = 'GET', body, token) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  }

  try {
    packageId = (await prisma.subscriptionPackage.create({
      data: { name: `Prueba S0-02 ${suffix}`, price: 100 },
    })).id;
    tenantId = (await prisma.tenant.create({
      data: { name: 'Negocio de prueba S0-02', slug: `s0-02-${suffix}`, packageId },
    })).id;
    const branch = await prisma.branch.create({
      data: { tenantId, name: 'Sucursal ficticia', address: 'Dirección ficticia' },
    });
    const service = await prisma.service.create({
      data: { tenantId, name: 'Corte de prueba', price: 100 },
    });
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 2);
    date.setUTCHours(10, 0, 0, 0);
    await prisma.businessSchedule.create({
      data: { branchId: branch.id, dayOfWeek: date.getUTCDay(), openTime: '09:00', closeTime: '18:00' },
    });
    admin = await prisma.user.create({
      data: {
        tenantId, email: email('admin'), firstName: 'Admin', lastName: 'Original',
        role: 'ADMIN', isActive: true, password: await argon2.hash(password),
        activationToken: randomUUID(), resetPasswordToken: randomUUID(),
        profile: { create: { phone: '5550000001' } },
      },
      include: { profile: true },
    });
    const booking = {
      branchId: branch.id, serviceId: service.id, startTime: date.toISOString(),
      clientInfo: {
        email: email('normal'), firstName: 'Cliente', lastName: 'Ficticio',
        phone: '5550000002', termsAccepted: true,
      },
    };

    await t.test('ADMIN recibe 409 y no cambia ningún campo ni crea citas', async () => {
      const result = await api('/appointments/public', 'POST', {
        ...booking, clientInfo: { ...booking.clientInfo, email: admin.email },
      });
      assert.equal(result.status, 409);
      assertNoSecrets(result.body);
      assert.deepEqual(await prisma.user.findUnique({ where: { id: admin.id }, include: { profile: true } }), admin);
      assert.equal(await prisma.appointment.count({ where: { tenantId } }), 0);
    });

    let clientId;
    await t.test('reserva normal devuelve 201 y solo identidad pública del cliente', async () => {
      const result = await api('/appointments/public', 'POST', booking);
      assert.equal(result.status, 201);
      assertNoSecrets(result.body);
      assert.deepEqual(Object.keys(result.body.client).sort(), ['firstName', 'id', 'lastName']);
      assert.deepEqual(Object.keys(result.body.tenant).sort(), ['id', 'logoUrl', 'name', 'slug']);
      clientId = result.body.client.id;
      // Evidencia para el PR: datos exclusivamente ficticios, sin credenciales.
      console.log('Reserva normal (HTTP 201):', JSON.stringify(result.body));
    });

    await t.test('CLIENT existente conserva nombre, teléfono y secretos internos', async () => {
      assert.ok(clientId);
      await prisma.user.update({ where: { id: clientId }, data: {
        password: await argon2.hash(password), activationToken: randomUUID(), resetPasswordToken: randomUUID(),
      } });
      const before = await prisma.user.findUnique({ where: { id: clientId }, include: { profile: true } });
      const later = new Date(date);
      later.setUTCHours(11);
      const result = await api('/appointments/public', 'POST', {
        ...booking, startTime: later.toISOString(),
        clientInfo: { ...booking.clientInfo, firstName: 'Reemplazo', lastName: 'Ajeno', phone: '5559999999' },
      });
      assert.equal(result.status, 201);
      assertNoSecrets(result.body);
      assert.equal(result.body.client.id, clientId);
      assert.equal(result.body.client.firstName, 'Cliente');
      assert.deepEqual(await prisma.user.findUnique({ where: { id: clientId }, include: { profile: true } }), before);
    });

    await t.test('registro público rechaza tenantId ajeno sin crear una cuenta', async () => {
      const result = await api('/auth/register', 'POST', {
        email: email('register'), password, firstName: 'Registro', lastName: 'Ficticio', tenantId,
      });
      assert.equal(result.status, 400);
      assert.equal(await prisma.user.count({ where: { email: email('register') } }), 0);
    });

    await t.test('registro, personal, clientes y citas del panel no exponen secretos', async () => {
      const registration = await api('/auth/register', 'POST', {
        email: email('register'), password, firstName: 'Registro', lastName: 'Ficticio',
      });
      assert.equal(registration.status, 201);
      assert.equal(registration.body.tenantId, null);
      assertNoSecrets(registration.body);
      const login = await api('/auth/login', 'POST', { email: admin.email, password });
      assert.equal(login.status, 200);
      assertNoSecrets(login.body.user);
      const token = login.body.access_token;
      const staff = await api('/users/staff', 'POST', {
        email: email('staff'), firstName: 'Personal', lastName: 'Ficticio', role: 'STAFF',
      }, token);
      assert.equal(staff.status, 201);
      assertNoSecrets(staff.body);
      const manual = await api('/clients', 'POST', {
        email: email('manual'), firstName: 'Manual', lastName: 'Ficticio',
      }, token);
      assert.equal(manual.status, 201);
      assertNoSecrets(manual.body);
      await prisma.user.update({ where: { id: manual.body.id }, data: {
        activationToken: randomUUID(), resetPasswordToken: randomUUID(),
      } });
      for (const path of ['/clients', `/clients/${manual.body.id}`, '/users/staff', '/appointments/merchant']) {
        const result = await api(path, 'GET', undefined, token);
        assert.equal(result.status, 200, path);
        assertNoSecrets(result.body);
      }
    });

    await t.test('CLIENT, SUPERADMIN y usuarios sin tenant no pueden operar el panel', async () => {
      const login = await api('/auth/login', 'POST', { email: admin.email, password });
      assert.equal(login.status, 200);
      const token = login.body.access_token;
      const id = randomUUID();
      const endpoints = [
        ['/appointments/merchant', 'GET'], ['/appointments/pending-approval', 'GET'],
        [`/appointments/${id}/approve`, 'PATCH'], [`/appointments/${id}/reject`, 'PATCH'],
        [`/appointments/${id}`, 'DELETE'], [`/appointments/${id}/status`, 'PATCH'],
        [`/appointments/${id}/reschedule`, 'PATCH'],
        ['/clients', 'GET'], [`/clients/${id}`, 'GET'], ['/clients', 'POST'],
        ['/dashboard/metrics', 'GET'], ['/dashboard/revenue-chart', 'GET'], ['/dashboard/service-stats', 'GET'],
        ['/notifications', 'GET'], [`/notifications/${id}/read`, 'PATCH'],
        ['/notifications/read-all', 'PATCH'], ['/notifications/clear-range/1', 'DELETE'],
        ['/notifications/all', 'DELETE'], [`/notifications/${id}`, 'DELETE'],
      ];
      try {
        for (const role of ['CLIENT', 'SUPERADMIN', 'ADMIN', 'STAFF']) {
          await prisma.user.update({ where: { id: admin.id }, data: {
            role, tenantId: ['ADMIN', 'STAFF'].includes(role) ? null : tenantId,
          } });
          for (const [path, method] of endpoints) {
            const result = await api(path, method, undefined, token);
            assert.equal(result.status, 403, `${role}: ${method} ${path}`);
          }
        }
        for (const role of ['ADMIN', 'STAFF']) {
          await prisma.user.update({ where: { id: admin.id }, data: { role, tenantId } });
          for (const path of ['/appointments/merchant', '/appointments/pending-approval', '/clients',
            '/dashboard/metrics', '/dashboard/revenue-chart', '/dashboard/service-stats', '/notifications']) {
            assert.equal((await api(path, 'GET', undefined, token)).status, 200, `${role}: ${path}`);
          }
        }
        assert.equal((await api('/appointments/mine', 'GET', undefined, token)).status, 200);
        assert.equal((await api('/appointments/merchant')).status, 401);
      } finally {
        await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN', tenantId } });
      }
    });

    await t.test('notificaciones se limitan al usuario y tenant del JWT', async () => {
      const login = await api('/auth/login', 'POST', { email: admin.email, password });
      const token = login.body.access_token;
      const own = await prisma.notification.create({ data: {
        userId: admin.id, tenantId, title: 'Propia', message: 'Ficticia',
      } });
      const peer = await prisma.notification.create({ data: {
        userId: clientId, tenantId, title: 'Ajena', message: 'Ficticia',
      } });
      const foreign = await prisma.notification.create({ data: {
        userId: admin.id, tenantId: randomUUID(), title: 'Otro negocio', message: 'Ficticia',
      } });
      const list = await api('/notifications', 'GET', undefined, token);
      assert.deepEqual(list.body.map((n) => n.id), [own.id]);
      for (const id of [peer.id, foreign.id]) {
        assert.equal((await api(`/notifications/${id}/read`, 'PATCH', undefined, token)).status, 404);
        assert.equal((await api(`/notifications/${id}`, 'DELETE', undefined, token)).status, 404);
      }
      assert.equal((await api(`/notifications/${own.id}/read`, 'PATCH', undefined, token)).status, 200);
      assert.equal((await api('/notifications/read-all', 'PATCH', undefined, token)).status, 200);
      assert.equal((await api('/notifications/clear-range/0', 'DELETE', undefined, token)).status, 200);
      assert.equal((await api('/notifications/all', 'DELETE', undefined, token)).status, 200);
      assert.equal(await prisma.notification.count({ where: { id: { in: [peer.id, foreign.id] }, isRead: false } }), 2);
    });
  } finally {
    // Solo elimina las filas ficticias de esta ejecución; conserva los volúmenes.
    if (tenantId) {
      await prisma.payment.deleteMany({ where: { appointment: { tenantId } } });
      await prisma.appointment.deleteMany({ where: { tenantId } });
      await prisma.businessSchedule.deleteMany({ where: { branch: { tenantId } } });
      await prisma.service.deleteMany({ where: { tenantId } });
      await prisma.branch.deleteMany({ where: { tenantId } });
    }
    const users = await prisma.user.findMany({ where: { email: { in: createdEmails } }, select: { id: true } });
    await prisma.notification.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: { in: createdEmails } } } });
    await prisma.profile.deleteMany({ where: { user: { email: { in: createdEmails } } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    if (tenantId) await prisma.tenant.delete({ where: { id: tenantId } });
    if (packageId) await prisma.subscriptionPackage.delete({ where: { id: packageId } });
    await prisma.$disconnect();
  }
});
