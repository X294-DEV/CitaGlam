const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const argon2 = require('argon2');
const { withLocalApiDatabase } = require('./local-api-fixture.cjs');

test('#53: exclusión solo del tenant JWT, ocupaciones restantes y límite global', async () => {
  await withLocalApiDatabase(13053, async ({ migrate, start }) => {
    migrate(() => true);
    const { db, api } = await start();
    const pkg = await db.subscriptionPackage.create({ data: { name: randomUUID(), price: 100 } });
    const tenants = [];
    for (let i = 0; i < 2; i++) tenants.push(await db.tenant.create({ data: { name: 'Ficticio', slug: `exclude-${randomUUID()}`, packageId: pkg.id } }));
    const [tenant, foreignTenant] = tenants;
    const branch = await db.branch.create({ data: { tenantId: tenant.id, name: 'Sucursal', address: 'Ficticia', timezone: 'America/Mexico_City' } });
    const otherBranch = await db.branch.create({ data: { tenantId: tenant.id, name: 'Otra sucursal', address: 'Ficticia' } });
    const foreignBranch = await db.branch.create({ data: { tenantId: foreignTenant.id, name: 'Ajena', address: 'Ficticia' } });
    const service = await db.service.create({ data: { tenantId: tenant.id, name: 'Largo', durationMin: 90, price: 100 } });
    const foreignService = await db.service.create({ data: { tenantId: foreignTenant.id, name: 'Ajeno', durationMin: 90, price: 100 } });
    const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const dayOfWeek = new Date(`${date}T12:00Z`).getUTCDay();
    await db.businessSchedule.create({ data: { branchId: branch.id, dayOfWeek, openTime: '10:00', closeTime: '16:00', isOpen: true } });
    const customer = await db.customer.create({ data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Ejemplo', email: 'exclude@example.test', phone: '+525500000001' } });
    const foreignCustomer = await db.customer.create({ data: { tenantId: foreignTenant.id, firstName: 'Otra', lastName: 'Ejemplo', email: 'foreign@example.test', phone: '+525500000001' } });
    const at = (time) => new Date(`${date}T${time}:00-06:00`);
    const row = { tenantId: tenant.id, branchId: branch.id, serviceId: service.id, customerId: customer.id, status: 'AUTHORIZED' };
    // Un intervalo histórico desfasado respecto a los inicios actuales: solo choca consigo mismo.
    const own = await db.appointment.create({ data: { ...row, startTime: at('11:00'), endTime: at('12:30') } });
    const occupied = await db.appointment.create({ data: { ...row, startTime: at('13:00'), endTime: at('14:30') } });
    const differentBranch = await db.appointment.create({ data: { ...row, branchId: otherBranch.id, startTime: at('11:00'), endTime: at('12:30') } });
    const foreign = await db.appointment.create({ data: { tenantId: foreignTenant.id, branchId: foreignBranch.id, serviceId: foreignService.id, customerId: foreignCustomer.id, status: 'AUTHORIZED', startTime: at('11:00'), endTime: at('12:30') } });
    const tokens = {};
    const password = randomBytes(18).toString('hex');
    const hash = await argon2.hash(password);
    for (const [key, role, tenantId] of [['admin', 'ADMIN', tenant.id], ['staff', 'STAFF', tenant.id], ['client', 'CLIENT', tenant.id], ['foreign', 'ADMIN', foreignTenant.id], ['noTenant', 'ADMIN', null]]) {
      const email = `${key}-exclude@example.test`;
      await db.user.create({ data: { email, password: hash, tenantId, role, isActive: true, firstName: key, lastName: 'Ficticio' } });
      const login = await api('/auth/login', 'POST', { email, password });
      assert.equal(login.status, 200);
      assert.ok(login.body.access_token);
      tokens[key] = login.body.access_token;
    }
    const query = (id) => `/appointments/available?${new URLSearchParams({ branchId: branch.id, serviceId: service.id, date, ...(id ? { excludeAppointmentId: id } : {}) })}`;
    const normal = await api(query());
    assert.equal(normal.status, 200);
    assert.deepEqual(normal.body.map(s => s.startTime), [at('14:30').toISOString()]);
    for (const key of ['admin', 'staff']) {
      assert.deepEqual(await api(query(), 'GET', undefined, tokens[key]), normal);
      const excluded = await api(query(own.id), 'GET', undefined, tokens[key]);
      assert.equal(excluded.status, 200);
      assert.deepEqual(excluded.body.map(s => s.startTime), ['10:00', '11:30', '14:30'].map(t => at(t).toISOString()));
      assert.ok(!excluded.body.some(s => s.startTime === at('13:00').toISOString()), 'La otra cita sigue ocupada');
      for (const id of [foreign.id, randomUUID(), differentBranch.id]) {
        assert.deepEqual(await api(query(id), 'GET', undefined, tokens[key]), normal);
      }
    }
    for (const key of [undefined, 'client', 'foreign', 'noTenant']) {
      assert.deepEqual(await api(query(own.id), 'GET', undefined, tokens[key]), normal);
    }
    assert.equal((await api(query(own.id), 'GET', undefined, 'invalido')).status, 401);
    assert.equal((await api(query('no-es-uuid'))).status, 400);
    assert.equal((await api(`${query()}&tenantId=${tenant.id}`)).status, 400);
    assert.equal((await api(query().replace(date, '2026-02-30'))).status, 400);
    // La disponibilidad informativa no permite saltarse el conflicto al guardar.
    const conflict = await api(`/appointments/${own.id}/reschedule`, 'PATCH', { newStartTime: occupied.startTime.toISOString() }, tokens.admin);
    assert.equal(conflict.status, 409);
    const moved = await api(`/appointments/${own.id}/reschedule`, 'PATCH', { newStartTime: at('10:00').toISOString() }, tokens.staff);
    assert.equal(moved.status, 200);
    assert.equal(moved.body.startTime, at('10:00').toISOString());
    assert.equal(moved.body.endTime, at('11:30').toISOString());
    // El guard global también protege esta ruta pública (300 solicitudes por minuto/IP).
    let limited;
    for (let i = 0; i < 301; i++) {
      limited = await api(query());
      if (limited.status === 429) break;
      assert.equal(limited.status, 200);
    }
    assert.equal(limited.status, 429);
    console.log('HTTP real: exclusión ADMIN/STAFF 200; ajena/inexistente/sin autorización sin cambios; JWT inválido 401; query inválida 400; conflicto 409; reprogramación 200; límite global 429.');
  });
});
