// S0-05: comprobantes con tipo real validado y sin acceso público.
// Ejecutar con la API local encendida, DATABASE_URL apuntando a la base local y Redis local:
// node --env-file=.env --test apps/cgbg-backend/test/receipts-files.security.cjs
// (si tu .env usa hosts de Docker, sobreescribe DATABASE_URL y REDIS_URL con localhost)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { existsSync, unlinkSync } = require('node:fs');
const { join } = require('node:path');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const argon2 = require('argon2');

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  randomBytes(32),
]);
const PDF = Buffer.from('%PDF-1.4\n% comprobante ficticio\n%%EOF\n');
const HTML = Buffer.from('<html><body><script>alert(1)</script></body></html>');
const UPLOADS = join(process.cwd(), 'apps', 'cgbg-backend', 'uploads');

test('S0-05: comprobantes validados por contenido y servidos solo con permiso', async (t) => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3001';
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  for (const url of [baseUrl, process.env.DATABASE_URL, redisUrl]) {
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname),
      'Esta prueba solo permite API, base de datos y Redis locales.');
  }
  const prisma = new PrismaClient();
  const redis = new Redis(redisUrl);
  const suffix = randomUUID();
  const email = (name) => `${name}-${suffix}@example.test`;
  const password = randomBytes(12).toString('hex');
  const createdEmails = ['admin-a', 'admin-b', 'super'].map(email);
  const tenantIds = [];
  const createdFiles = [];
  let packageId;
  let businessRequestId;

  async function upload(path, buffer, filename, contentType) {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: contentType }), filename);
    const response = await fetch(`${baseUrl}${path}`, { method: 'POST', body: form });
    return { status: response.status, body: await response.json() };
  }

  async function get(path, token) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return { status: response.status, headers: response.headers, buffer: Buffer.from(await response.arrayBuffer()) };
  }

  async function login(userEmail) {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password }),
    });
    assert.equal(response.status, 200, `login ${userEmail}`);
    return (await response.json()).access_token;
  }

  async function createTenant(label) {
    const tenant = await prisma.tenant.create({
      data: { name: `Negocio ${label} S0-05`, slug: `s0-05-${label}-${suffix}`, packageId },
    });
    tenantIds.push(tenant.id);
    const branch = await prisma.branch.create({
      data: { tenantId: tenant.id, name: 'Sucursal ficticia', address: 'Dirección ficticia' },
    });
    const service = await prisma.service.create({
      data: { tenantId: tenant.id, name: 'Corte de prueba', price: 100 },
    });
    await prisma.user.create({
      data: {
        tenantId: tenant.id, email: email(`admin-${label}`), firstName: 'Admin', lastName: label,
        role: 'ADMIN', isActive: true, password: await argon2.hash(password),
      },
    });
    return { tenant, branch, service };
  }

  async function pendingAppointment({ tenant, branch, service }) {
    // Cliente ficticio: se reutiliza el admin del mismo tenant, basta para la relación.
    const client = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 3);
    start.setUTCHours(10, 0, 0, 0);
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id, branchId: branch.id, serviceId: service.id, clientId: client.id,
        startTime: start, endTime: new Date(start.getTime() + 3_600_000), status: 'PENDING_PAYMENT',
      },
    });
    const token = randomBytes(24).toString('hex');
    await redis.set(`cgbg:payment:link:${token}`, appointment.id, 'EX', 600);
    return { appointment, token };
  }

  try {
    packageId = (await prisma.subscriptionPackage.create({
      data: { name: `Prueba S0-05 ${suffix}`, price: 100 },
    })).id;
    const a = await createTenant('a');
    const b = await createTenant('b');
    await prisma.user.create({
      data: {
        email: email('super'), firstName: 'Super', lastName: 'Admin', role: 'SUPERADMIN',
        isActive: true, password: await argon2.hash(password),
      },
    });

    await t.test('HTML renombrado a .png y declarado image/png es rechazado', async () => {
      const { appointment, token } = await pendingAppointment(a);
      const result = await upload(`/receipts/upload/${token}`, HTML, 'comprobante.png', 'image/png');
      assert.equal(result.status, 400);
      const after = await prisma.appointment.findUnique({ where: { id: appointment.id }, include: { payment: true } });
      assert.equal(after.status, 'PENDING_PAYMENT');
      assert.equal(after.payment, null);
    });

    let receiptPath;
    let appointmentA;
    await t.test('PNG real se guarda con nombre y extensión del servidor y ruta interna', async () => {
      const { appointment, token } = await pendingAppointment(a);
      appointmentA = appointment;
      // Nombre y mimetype del cliente engañosos: deben ignorarse.
      const result = await upload(`/receipts/upload/${token}`, PNG, '../../evil.html', 'text/html');
      assert.equal(result.status, 201);
      assert.equal(result.body.receiptUrl, undefined, 'la respuesta pública no expone la ruta');
      const payment = await prisma.payment.findUnique({ where: { appointmentId: appointment.id } });
      receiptPath = payment.receiptUrl;
      assert.match(receiptPath, new RegExp(`^receipts/${appointment.id}-\\d+-[0-9a-f-]{36}\\.png$`));
      createdFiles.push(join(UPLOADS, receiptPath));
      assert.ok(existsSync(join(UPLOADS, receiptPath)));
    });

    await t.test('/uploads/receipts/<archivo> ya no se sirve sin sesión', async () => {
      const name = receiptPath.split('/').pop();
      for (const path of [`/uploads/receipts/${name}`, `/uploads/${receiptPath}`]) {
        const result = await get(path);
        assert.ok([401, 403, 404].includes(result.status), `${path} => ${result.status}`);
      }
    });

    const tokenA = await login(email('admin-a'));
    const tokenB = await login(email('admin-b'));
    const tokenSuper = await login(email('super'));

    await t.test('el admin del tenant dueño descarga el comprobante con nosniff', async () => {
      const result = await get(`/receipts/${appointmentA.id}/file`, tokenA);
      assert.equal(result.status, 200);
      assert.equal(result.headers.get('content-type'), 'image/png');
      assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
      assert.match(result.headers.get('cache-control'), /no-store/);
      assert.deepEqual(result.buffer, PNG);
    });

    await t.test('sin sesión, otro tenant o SUPERADMIN no pueden descargarlo', async () => {
      assert.equal((await get(`/receipts/${appointmentA.id}/file`)).status, 401);
      assert.equal((await get(`/receipts/${appointmentA.id}/file`, tokenB)).status, 404);
      assert.equal((await get(`/receipts/${appointmentA.id}/file`, tokenSuper)).status, 403);
      assert.equal((await get(`/receipts/no-es-uuid/file`, tokenA)).status, 400);
    });

    let proofFile;
    await t.test('proofs: HTML rechazado y PDF real guardado como ruta interna', async () => {
      businessRequestId = (await prisma.businessRequest.create({
        data: {
          fullName: 'Solicitante Ficticio', email: email('request'), businessName: 'Negocio ficticio',
          phone: '5550000003', selectedPackageId: packageId, monthsCount: 1, negotiatedPrice: 100,
          status: 'PROPOSAL_SENT',
        },
      })).id;
      const bad = await upload(`/auth/upload-payment-evidence/${businessRequestId}`, HTML, 'pago.pdf', 'application/pdf');
      assert.equal(bad.status, 400);
      const ok = await upload(`/auth/upload-payment-evidence/${businessRequestId}`, PDF, 'pago.html', 'text/html');
      assert.equal(ok.status, 200);
      const request = await prisma.businessRequest.findUnique({ where: { id: businessRequestId } });
      assert.match(request.evidenceUrl, new RegExp(`^proofs/proof-${businessRequestId}-\\d+-[0-9a-f-]{36}\\.pdf$`));
      createdFiles.push(join(UPLOADS, request.evidenceUrl));
      proofFile = request.evidenceUrl.split('/').pop();
      assert.ok([401, 403, 404].includes((await get(`/uploads/proofs/${proofFile}`)).status));
    });

    await t.test('proofs: solo SUPERADMIN descarga por nombre de archivo', async () => {
      const ok = await get(`/admin/global/proof-files/${proofFile}`, tokenSuper);
      assert.equal(ok.status, 200);
      assert.equal(ok.headers.get('content-type'), 'application/pdf');
      assert.equal(ok.headers.get('x-content-type-options'), 'nosniff');
      assert.deepEqual(ok.buffer, PDF);
      assert.equal((await get(`/admin/global/proof-files/${proofFile}`, tokenA)).status, 403);
      assert.equal((await get(`/admin/global/proof-files/${proofFile}`)).status, 401);
      assert.equal((await get('/admin/global/proof-files/..%2F..%2F.env', tokenSuper)).status, 404);
    });

    await t.test('proofs: el tenant ve solo el comprobante de sus pagos de suscripción', async () => {
      const ownPayment = await prisma.subscriptionPayment.create({
        data: { tenantId: a.tenant.id, packageId, amount: 100, monthsCount: 1, evidenceUrl: `proofs/${proofFile}` },
      });
      const ok = await get(`/subscriptions/my-history/${ownPayment.id}/evidence`, tokenA);
      assert.equal(ok.status, 200);
      assert.deepEqual(ok.buffer, PDF);
      assert.equal((await get(`/subscriptions/my-history/${ownPayment.id}/evidence`, tokenB)).status, 404);
    });

    await t.test('proofs: un tenant no puede apuntar evidenceUrl a un archivo interno ajeno', async () => {
      for (const evidenceUrl of [`proofs/${proofFile}`, `/uploads/proofs/${proofFile}`, `x/proofs/${proofFile}`]) {
        const response = await fetch(`${baseUrl}/merchant/subscriptions/request-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
          body: JSON.stringify({ packageId, monthsCount: 1, evidenceUrl }),
        });
        assert.equal(response.status, 400, evidenceUrl);
      }
      assert.equal(await prisma.subscriptionPayment.count({ where: { tenantId: b.tenant.id } }), 0);
    });
  } finally {
    // Solo elimina las filas y archivos ficticios de esta ejecución; conserva los volúmenes.
    for (const file of createdFiles) if (existsSync(file)) unlinkSync(file);
    if (businessRequestId) {
      await prisma.businessRequestProof.deleteMany({ where: { businessRequestId } });
      await prisma.businessRequest.delete({ where: { id: businessRequestId } });
    }
    await prisma.notification.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.subscriptionPayment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.payment.deleteMany({ where: { appointment: { tenantId: { in: tenantIds } } } });
    await prisma.appointment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.service.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: tenantIds } } });
    const users = await prisma.user.findMany({ where: { email: { in: createdEmails } }, select: { id: true } });
    await prisma.notification.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: { in: createdEmails } } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    if (packageId) await prisma.subscriptionPackage.delete({ where: { id: packageId } });
    redis.disconnect();
    await prisma.$disconnect();
  }
});
