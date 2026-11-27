const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const argon2 = require('argon2');
const { withLocalApiDatabase } = require('./local-api-fixture.cjs');

test('#48: disponibilidad futura y rechazo de reservas/reprogramaciones pasadas', async () => {
  await withLocalApiDatabase(13048, async ({ migrate, start }) => {
    migrate(() => true);
    const { db, api } = await start();
    const pkg = await db.subscriptionPackage.create({ data: { name: randomUUID(), price: 100 } });
    const tenant = await db.tenant.create({ data: { name: 'Ficticio', slug: `future-${randomUUID()}`, packageId: pkg.id } });
    const service = await db.service.create({ data: { tenantId: tenant.id, name: 'Media hora', price: 100, durationMin: 30 } });
    const customer = await db.customer.create({ data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Ejemplo', email: 'future@example.test', phone: '+525500000001' } });
    const password = randomBytes(18).toString('hex');
    const email = 'admin-future@example.test';
    await db.user.create({ data: { tenantId: tenant.id, email, password: await argon2.hash(password), firstName: 'Admin', lastName: 'Ficticio', role: 'ADMIN', isActive: true } });
    const login = await api('/auth/login', 'POST', { email, password });
    assert.equal(login.status, 200);
    const token = login.body.access_token;

    for (const timezone of ['America/Mexico_City', 'Asia/Tokyo']) {
      const branch = await db.branch.create({ data: { tenantId: tenant.id, name: timezone, address: 'Ficticia', timezone } });
      await db.businessSchedule.createMany({ data: Array.from({ length: 7 }, (_, dayOfWeek) => ({ branchId: branch.id, dayOfWeek, openTime: '00:00', closeTime: '23:59', isOpen: true })) });
      const [calendar] = await db.$queryRaw`SELECT
        to_char(now() AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS today,
        to_char((now() AT TIME ZONE ${timezone}) - interval '1 day', 'YYYY-MM-DD') AS yesterday,
        to_char((now() AT TIME ZONE ${timezone}) + interval '1 day', 'YYYY-MM-DD') AS tomorrow`;
      const available = (date) => api(`/appointments/available?${new URLSearchParams({ branchId: branch.id, serviceId: service.id, date })}`);
      const before = Date.now();
      const today = await available(calendar.today);
      const after = Date.now();
      assert.equal(today.status, 200);
      assert.ok(today.body.every(s => Date.parse(s.startTime) > before));
      // Comparar todos los rangos esperados; solo tolerar un inicio que cruce el reloj durante HTTP.
      const [day] = await db.$queryRaw`SELECT ((${calendar.today}::date + '00:00'::time) AT TIME ZONE ${timezone}) AS start`;
      const expected = Array.from({ length: 47 }, (_, i) => new Date(day.start.getTime() + i * 1800000).toISOString());
      assert.ok(today.body.every(s => expected.includes(s.startTime)));
      for (const time of expected.filter(s => Date.parse(s) > after)) {
        assert.ok(today.body.some(s => s.startTime === time), `Falta ${time} en ${timezone}`);
      }
      assert.deepEqual((await available(calendar.yesterday)).body, []);
      const tomorrow = await available(calendar.tomorrow);
      assert.equal(tomorrow.status, 200);
      assert.equal(tomorrow.body.length, 47);
      const past = new Date(Date.now() - 86400000).toISOString();
      const customerCount = await db.customer.count({ where: { tenantId: tenant.id } });
      const panel = { branchId: branch.id, serviceId: service.id, customerId: customer.id, startTime: past };
      const publicBody = { slug: tenant.slug, branchId: branch.id, serviceId: service.id, startTime: past, termsAccepted: true,
        clientInfo: { firstName: 'Nueva', lastName: 'Ejemplo', email: 'new@example.test', phone: '+525500000002' } };
      for (const response of [await api('/appointments', 'POST', panel, token), await api('/appointments/public', 'POST', publicBody)]) {
        assert.equal(response.status, 409);
        assert.match(response.body.message, /futuro.*pasó/);
      }
      assert.equal(await db.customer.count({ where: { tenantId: tenant.id } }), customerCount);
      const created = await api('/appointments', 'POST', { ...panel, startTime: tomorrow.body[0].startTime }, token);
      assert.equal(created.status, 201);
      const rescheduled = await api(`/appointments/${created.body.id}/reschedule`, 'PATCH', { newStartTime: past }, token);
      assert.equal(rescheduled.status, 409);
      assert.match(rescheduled.body.message, /futuro.*pasó/);
      assert.equal((await db.appointment.findUnique({ where: { id: created.body.id } })).startTime.toISOString(), created.body.startTime);
      const publicCreated = await api('/appointments/public', 'POST', { ...publicBody, startTime: tomorrow.body[1].startTime });
      assert.equal(publicCreated.status, 201);
      console.log(`${timezone}: hoy filtrado, ayer vacío; POST panel/público y PATCH pasados 409; reservas futuras 201.`);
    }
  });
});
