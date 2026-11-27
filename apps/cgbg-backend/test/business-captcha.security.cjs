// PostgreSQL/API locales y siteverify real con claves oficiales de PRUEBA:
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withLocalApiDatabase } = require('./local-api-fixture.cjs');
const SITE_KEY = '1x00000000000000000000AA';
const SECRET_PASS = '1x0000000000000000000000000000000AA';
const SECRET_FAIL = '2x0000000000000000000000000000000AA';
const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

test('#60: registro de negocio usa CaptchaService y falla sin llave en producción', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await withLocalApiDatabase(13060, async ({ migrate, start }) => {
      migrate(() => true);
      const { db, api } = await start();
      const setSecret = turnstileSecretKey => db.globalConfig.upsert({
        where: { id: 'SYSTEM' },
        create: { id: 'SYSTEM', security: { turnstileSiteKey: SITE_KEY, ...(turnstileSecretKey ? { turnstileSecretKey } : {}) } },
        update: { security: { turnstileSiteKey: SITE_KEY, ...(turnstileSecretKey ? { turnstileSecretKey } : {}) } },
      });
      const body = extra => ({ fullName: 'Ana Ejemplo', email: 'business-captcha@example.test', businessName: 'Negocio ficticio', phone: '+525500000001', ...extra });
      await setSecret(null);
      const notConfigured = await api('/auth/register-request', 'POST', body());
      assert.equal(notConfigured.status, 503);
      assert.match(notConfigured.body.message, /no está configurada/);
      assert.equal(await db.businessRequest.count(), 0);
      await setSecret(SECRET_FAIL);
      const rejected = await api('/auth/register-request', 'POST', body({ turnstileToken: DUMMY_TOKEN }));
      assert.equal(rejected.status, 400);
      assert.match(rejected.body.message, /falló/);
      assert.equal(await db.businessRequest.count(), 0);
      await setSecret(SECRET_PASS);
      const missing = await api('/auth/register-request', 'POST', body());
      assert.equal(missing.status, 400);
      assert.match(missing.body.message, /verificación de seguridad/);
      assert.equal(await db.businessRequest.count(), 0);
      const config = await api('/auth/config/public');
      assert.equal(config.status, 200);
      assert.equal(config.body.turnstileSiteKey, SITE_KEY);
      assert.ok(!JSON.stringify(config.body).includes(SECRET_PASS));
      assert.ok(!Object.keys(config.body).some(k => /secret/i.test(k)));
      const accepted = await api('/auth/register-request', 'POST', body({ turnstileToken: DUMMY_TOKEN }));
      assert.equal(accepted.status, 201);
      assert.equal(accepted.body.status, 'PENDING');
      assert.equal(await db.businessRequest.count(), 1);
      const stored = await db.businessRequest.findUnique({ where: { id: accepted.body.id } });
      assert.equal(stored.email, 'business-captcha@example.test');
      assert.ok(!JSON.stringify(stored).includes(DUMMY_TOKEN));
      assert.equal((await api('/auth/register-request', 'POST', body())).status, 400);
      const limited = await api('/auth/register-request', 'POST', body({ turnstileToken: DUMMY_TOKEN }));
      assert.equal(limited.status, 429, 'Conserva el límite de cinco solicitudes por minuto');
      assert.equal(await db.businessRequest.count(), 1);
      console.log('Producción: sin llave 503, token inválido 400, sin token 400, token oficial válido 201; sin filas en rechazos, sitekey pública sin secreto y límite 429.');
    });
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});
