require('ts-node/register');
require('tsconfig-paths/register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { sign } = require('jsonwebtoken');
const { PaymentLinkService, PAYMENT_LINK_TTL_MS } = require('../../../libs/prisma/src/payment-link.service');
const { withLocalApiDatabase } = require('./local-api-fixture.cjs');
const migration = '20261127060000_payment_link';
const invalid = e => e.getStatus?.() === 404 && e.message === 'El enlace de comprobante no está disponible o expiró.';

test('#56: migración en base limpia', async () => {
  await withLocalApiDatabase(13055, async ({ migrate, sql }) => {
    migrate(() => true);
    assert.equal(sql('SELECT count(*) FROM "PaymentLink"'), '0');
  });
});

test('#56: datos conservados, hash, vigencia y consumo atómico en PostgreSQL real', async () => {
  await withLocalApiDatabase(13056, async ({ migrate, start }) => {
    migrate(n => n < migration);
    const { db, api } = await start();
    const pkg = await db.subscriptionPackage.create({ data: { name: randomUUID(), price: 100 } });
    const tenant = await db.tenant.create({ data: { slug: `link-${randomUUID()}`, name: 'Ficticio', packageId: pkg.id } });
    const branch = await db.branch.create({ data: { tenantId: tenant.id, name: 'Sucursal', address: 'Ficticia' } });
    const service = await db.service.create({ data: { tenantId: tenant.id, name: 'Servicio', price: 100, durationMin: 30 } });
    const customer = await db.customer.create({ data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Ejemplo', email: 'link@example.test', phone: '+525500000001' } });
    const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    await db.businessSchedule.create({ data: { branchId: branch.id, dayOfWeek: new Date(`${date}T12:00Z`).getUTCDay(), openTime: '10:00', closeTime: '15:00' } });
    const data = { tenantId: tenant.id, branchId: branch.id, serviceId: service.id, customerId: customer.id,
      startTime: new Date(`${date}T16:00Z`), endTime: new Date(`${date}T16:30Z`), paymentExpiry: new Date(Date.now() + 86400000) };
    const legacy = await db.appointment.create({ data });
    migrate(n => n === migration);
    assert.deepEqual(await db.appointment.findUnique({ where: { id: legacy.id } }), legacy, 'La migración conserva todos los datos de la cita');
    const links = new PaymentLinkService(db);
    await assert.rejects(links.create(legacy.id, randomUUID()), invalid);
    const before = Date.now();
    const issued = await links.create(legacy.id, tenant.id);
    const after = Date.now();
    assert.match(issued.token, /^[A-Za-z0-9_-]{43}$/);
    assert.deepEqual(Object.keys(issued).sort(), ['appointmentId', 'expiresAt', 'token']);
    assert.ok(issued.expiresAt.getTime() >= before + PAYMENT_LINK_TTL_MS);
    assert.ok(issued.expiresAt.getTime() <= after + PAYMENT_LINK_TTL_MS);
    const stored = await db.paymentLink.findFirst({ where: { appointmentId: legacy.id } });
    assert.equal(stored.tokenHash, createHash('sha256').update(issued.token).digest('hex'));
    assert.ok(!JSON.stringify(stored).includes(issued.token));
    assert.equal((await db.appointment.findUnique({ where: { id: legacy.id } })).paymentExpiry.toISOString(), issued.expiresAt.toISOString());
    assert.deepEqual(await links.validate(issued.token), { appointmentId: legacy.id, expiresAt: issued.expiresAt });
    assert.deepEqual(await links.validate(issued.token), { appointmentId: legacy.id, expiresAt: issued.expiresAt }, 'Mostrar el formulario no consume');
    const attempts = await Promise.allSettled([links.consume(issued.token), links.consume(issued.token)]);
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    assert.ok(attempts.filter(r => r.status === 'rejected').every(r => invalid(r.reason)));
    await assert.rejects(links.validate(issued.token), invalid);
    await assert.rejects(links.consume(issued.token), invalid);
    for (const invented of ['inventado', 'x'.repeat(43)]) {
      await assert.rejects(links.validate(invented), invalid);
      await assert.rejects(links.consume(invented), invalid);
    }
    const another = await links.create(legacy.id, tenant.id);
    await db.paymentLink.updateMany({ where: { appointmentId: legacy.id, usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await assert.rejects(links.validate(another.token), invalid);
    await assert.rejects(links.consume(another.token), invalid);
    const rollbackLink = await links.create(legacy.id, tenant.id);
    await assert.rejects(db.$transaction(async tx => { await links.consume(rollbackLink.token, tx); throw Error('Fallo ficticio al guardar comprobante'); }), /Fallo ficticio/);
    assert.ok(await links.validate(rollbackLink.token));
    const unchangedExpiry = (await db.appointment.findUnique({ where: { id: legacy.id } })).paymentExpiry;
    assert.equal(rollbackLink.expiresAt.toISOString(), unchangedExpiry.toISOString(), 'Reintentar no extiende la vigencia');
    await db.appointment.update({ where: { id: legacy.id }, data: { status: 'CANCELLED' } });
    await assert.rejects(links.validate(rollbackLink.token), invalid);
    await assert.rejects(links.consume(rollbackLink.token), invalid);
    await assert.rejects(links.create(legacy.id, tenant.id), invalid);
    await db.appointment.update({ where: { id: legacy.id }, data: { status: 'PENDING_PAYMENT', paymentExpiry: new Date(Date.now() - 1000) } });
    await assert.rejects(links.create(legacy.id, tenant.id), invalid);
    const admin = await db.user.create({ data: { tenantId: tenant.id, email: 'admin-link@example.test', firstName: 'Admin', lastName: 'Ejemplo', role: 'ADMIN', isActive: true } });
    const jwt = sign({ sub: admin.id }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const requestAt = Date.now();
    const created = await api('/appointments', 'POST', { branchId: branch.id, serviceId: service.id, customerId: customer.id, startTime: `${date}T17:00:00.000Z` }, jwt);
    assert.equal(created.status, 201);
    const expiry = Date.parse(created.body.paymentExpiry);
    assert.ok(expiry >= requestAt + PAYMENT_LINK_TTL_MS && expiry <= Date.now() + PAYMENT_LINK_TTL_MS);
    assert.ok(!JSON.stringify(created.body).includes('tokenHash'));
    console.log('Migración con datos preservada; hash SHA-256, 60 min, consumo concurrente único, errores uniformes y rollback verificados. POST real 201 con paymentExpiry de 60 min.');
  });
});
