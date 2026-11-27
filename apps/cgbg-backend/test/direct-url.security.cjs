const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { sign } = require('jsonwebtoken');
const { withLocalApiDatabase } = require('./local-api-fixture.cjs');

test('#59: migrate deploy usa DIRECT_URL y API usa DATABASE_URL; exclusión real', async () => {
  await withLocalApiDatabase(13059, async ({ start, url, sql }) => {
    const unreachable = new URL(url); unreachable.port = '1';
    const deploy = () => {
      const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema=libs/prisma/prisma/schema.prisma'], {
        env: { ...process.env, DIRECT_URL: url, DATABASE_URL: unreachable.toString() }, encoding: 'utf8', timeout: 60000,
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    };
    deploy();
    assert.equal(sql(`SELECT count(*) FROM pg_extension WHERE extname='btree_gist'`), '1');
    assert.equal(sql(`SELECT count(*) FROM pg_constraint WHERE conname='appointment_no_overlap' AND contype='x'`), '1');
    const previous = process.env.DIRECT_URL;
    process.env.DIRECT_URL = unreachable.toString();
    try {
      const { db, api } = await start();
      const pkg = await db.subscriptionPackage.create({ data: { name: randomUUID(), price: 100 } });
      const tenant = await db.tenant.create({ data: { slug: `direct-${randomUUID()}`, name: 'Ficticio', packageId: pkg.id } });
      const branch = await db.branch.create({ data: { tenantId: tenant.id, name: 'Sucursal', address: 'Ficticia' } });
      const service = await db.service.create({ data: { tenantId: tenant.id, name: 'Servicio', price: 100, durationMin: 30 } });
      const customer = await db.customer.create({ data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Ejemplo', email: 'direct@example.test', phone: '+525500000001' } });
      const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      await db.businessSchedule.create({ data: { branchId: branch.id, dayOfWeek: new Date(`${date}T12:00Z`).getUTCDay(), openTime: '10:00', closeTime: '15:00' } });
      const admin = await db.user.create({ data: { tenantId: tenant.id, email: 'admin-direct@example.test', firstName: 'Admin', lastName: 'Ejemplo', role: 'ADMIN', isActive: true } });
      const token = sign({ sub: admin.id }, process.env.JWT_SECRET, { expiresIn: '5m' });
      const created = await api('/appointments', 'POST', { branchId: branch.id, serviceId: service.id, customerId: customer.id, startTime: `${date}T16:00:00.000Z` }, token);
      assert.equal(created.status, 201, 'La API usa DATABASE_URL aunque DIRECT_URL no conecte');
      const row = { tenantId: tenant.id, branchId: branch.id, serviceId: service.id, customerId: customer.id, status: 'AUTHORIZED' };
      await assert.rejects(db.appointment.create({ data: { ...row, startTime: new Date(`${date}T16:15Z`), endTime: new Date(`${date}T16:45Z`) } }), /23P01|appointment_no_overlap/);
      await db.appointment.create({ data: { ...row, startTime: new Date(`${date}T16:30Z`), endTime: new Date(`${date}T17:00Z`) } });
      deploy();
      assert.equal(await db.appointment.count({ where: { tenantId: tenant.id } }), 2, 'Repetir deploy conserva datos');
      console.log('migrate deploy por DIRECT_URL con DATABASE_URL inaccesible: OK; API POST 201 con DIRECT_URL inaccesible; btree_gist, traslape rechazado y adyacencia aceptada. Validación solo en Docker local, sin Neon ni pooler remoto.');
    } finally {
      if (previous === undefined) delete process.env.DIRECT_URL; else process.env.DIRECT_URL = previous;
    }
  });
});
