// Requiere Docker con cgbg-postgres, DATABASE_URL local y salida a Internet (siteverify de Cloudflare).
// Claves de PRUEBA oficiales de Cloudflare: la primera siempre aprueba, la segunda siempre rechaza.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withLocalApiDatabase } = require('./local-api-fixture.cjs');

const SECRET_PASS = '1x0000000000000000000000000000000AA';
const SECRET_FAIL = '2x0000000000000000000000000000000AA';
const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

test('S1-08: Turnstile se verifica antes de crear la cita pública', async () => {
  await withLocalApiDatabase(13037, async ({ migrate, start }) => {
    migrate(() => true);
    const { db, api } = await start();
    const setSecret = (turnstileSecretKey) =>
      db.globalConfig.upsert({
        where: { id: 'SYSTEM' },
        update: { security: turnstileSecretKey ? { turnstileSecretKey } : {} },
        create: { id: 'SYSTEM', security: turnstileSecretKey ? { turnstileSecretKey } : {} },
      });
    // Cuerpo válido con un slug que no existe: si el captcha pasa, la respuesta es 404 del negocio.
    const body = (extra = {}) => ({
      slug: 'no-existe',
      branchId: '22222222-2222-4222-8222-222222222222',
      serviceId: '33333333-3333-4333-8333-333333333333',
      startTime: '2026-12-01T16:00:00.000Z',
      clientInfo: { firstName: 'Ana', lastName: 'Ejemplo', email: 'ana@example.test', phone: '+525500000001' },
      termsAccepted: true,
      ...extra,
    });

    await setSecret(SECRET_PASS);
    const missing = await api('/appointments/public', 'POST', body());
    assert.equal(missing.status, 400);
    assert.match(missing.body.message, /verificación de seguridad/i);

    const passed = await api('/appointments/public', 'POST', body({ turnstileToken: DUMMY_TOKEN }));
    assert.equal(passed.status, 404, 'con token válido llega a la lógica de reserva');

    await setSecret(SECRET_FAIL);
    const rejected = await api('/appointments/public', 'POST', body({ turnstileToken: DUMMY_TOKEN }));
    assert.equal(rejected.status, 400);
    assert.match(rejected.body.message, /falló/i);

    await setSecret(null);
    const skipped = await api('/appointments/public', 'POST', body());
    assert.equal(skipped.status, 404, 'sin clave y fuera de producción se omite el desafío');
  });
});
