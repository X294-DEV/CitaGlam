// API real local encendida; ejecutar con DATABASE_URL de la misma base local.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

test('S1-09: catálogo público sin datos privados y aislado por slug', async () => {
  const base = process.env.TEST_API_URL || 'http://localhost:3001';
  for (const url of [base, process.env.DATABASE_URL]) {
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));
  }
  const db = new PrismaClient();
  const suffix = randomUUID();
  let packageId;
  const tenants = [];
  async function get(path) {
    const response = await fetch(`${base}${path}`);
    return { status: response.status, body: await response.json() };
  }
  try {
    packageId = (await db.subscriptionPackage.create({ data: { name: suffix, price: 100 } })).id;
    for (const [name, isActive] of [['a', true], ['b', true], ['c', false]]) {
      tenants.push(await db.tenant.create({ data: { slug: `${name}-${suffix}`, name, packageId, isActive } }));
    }
    await db.tenantConfig.create({ data: {
      tenantId: tenants[0].id, customSettings: { privateValue: 'NO_PUBLICAR' },
    } });
    const category = await db.serviceCategory.create({ data: { tenantId: tenants[0].id, name: 'Categoría' } });
    for (const data of [
      { tenantId: tenants[0].id, name: 'Visible', categoryId: category.id },
      { tenantId: tenants[0].id, name: 'Oculto', isActive: false },
      { tenantId: tenants[1].id, name: 'Ajeno' },
    ]) await db.service.create({ data: { price: 123.45, ...data } });
    const config = await get(`/tenants/config/${tenants[0].slug.toUpperCase()}`);
    assert.equal(config.status, 200);
    assert.deepEqual(Object.keys(config.body).sort(), ['config', 'id', 'logoUrl', 'name', 'slug']);
    assert.deepEqual(Object.keys(config.body.config).sort(), ['businessCategory', 'primaryColor', 'secondaryColor', 'welcomeMessage']);
    assert.doesNotMatch(JSON.stringify(config.body), /customSettings|NO_PUBLICAR|packageId|subscription|tenantId/i);
    const list = await get(`/tenants/public/${tenants[0].slug}/services`);
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].name, 'Visible');
    assert.equal(list.body[0].price, '123.45');
    assert.deepEqual(Object.keys(list.body[0]).sort(), ['category', 'color', 'description', 'durationMin', 'id', 'imageUrl', 'name', 'price']);
    assert.deepEqual(Object.keys(list.body[0].category).sort(), ['id', 'name', 'order']);
    const unconfigured = await get(`/tenants/config/${tenants[1].slug}`);
    assert.equal(unconfigured.body.config, null);
    const uncategorized = await get(`/tenants/public/${tenants[1].slug}/services`);
    assert.equal(uncategorized.body[0].category, null);
    for (const slug of [tenants[2].slug, `missing-${suffix}`]) {
      assert.equal((await get(`/tenants/config/${slug}`)).status, 404);
      assert.equal((await get(`/tenants/public/${slug}/services`)).status, 404);
    }
    console.log('HTTP real: 200 para catálogo/config; 404 para negocio inactivo o inexistente.');
  } finally {
    const ids = tenants.map((t) => t.id);
    await db.service.deleteMany({ where: { tenantId: { in: ids } } });
    await db.serviceCategory.deleteMany({ where: { tenantId: { in: ids } } });
    await db.tenantConfig.deleteMany({ where: { tenantId: { in: ids } } });
    await db.tenant.deleteMany({ where: { id: { in: ids } } });
    if (packageId) await db.subscriptionPackage.delete({ where: { id: packageId } });
    await db.$disconnect();
  }
});
