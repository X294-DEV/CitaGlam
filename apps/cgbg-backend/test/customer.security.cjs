const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

test('S1-01: migración poblada, rollback y clientes aislados por tenant', async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['cgbg-postgres', 'localhost', '127.0.0.1'].includes(url.hostname), 'Solo base local');
  const dbName = `cgbg_customer_${Date.now()}`;
  assert.match(dbName, /^cgbg_customer_\d+$/);
  const p = randomUUID(), t = randomUUID(), t2 = randomUUID(), u = randomUUID(), orphan = randomUUID();
  const b = randomUUID(), s = randomUUID(), a = randomUUID(), duplicate = randomUUID();
  const migrationRoot = path.resolve('libs/prisma/prisma/migrations');
  const migration = fs.readFileSync(path.join(migrationRoot, '20261123093000_customer_per_tenant/migration.sql'), 'utf8');
  function sql(text, expectedFailure = false) {
    const r = spawnSync('docker', ['exec', '-i', 'cgbg-postgres', 'psql', '-U', 'postgres', '-d', dbName, '-At', '-v', 'ON_ERROR_STOP=1'], { input: text, encoding: 'utf8' });
    if (!expectedFailure && r.status) throw Error(r.stderr);
    return r;
  }
  let apiProcess, db;
  let logs = '';
  const create = spawnSync('docker', ['exec', 'cgbg-postgres', 'createdb', '-U', 'postgres', dbName], { encoding: 'utf8' });
  assert.equal(create.status, 0, create.stderr);
  try {
    for (const dir of fs.readdirSync(migrationRoot).filter(n => /^\d/.test(n) && n < '20261123093000').sort()) {
      sql(fs.readFileSync(path.join(migrationRoot, dir, 'migration.sql'), 'utf8'));
    }
    sql(`
      INSERT INTO "SubscriptionPackage" (id,name,price,"updatedAt") VALUES ('${p}','Ficticio',100,now());
      INSERT INTO "Tenant" (id,name,slug,"packageId","updatedAt") VALUES
        ('${t}','A','a-${t}','${p}',now()),('${t2}','B','b-${t2}','${p}',now());
      INSERT INTO "User" (id,email,"firstName","lastName",role,"isActive","tenantId","updatedAt") VALUES
        ('${u}','cliente@example.test','Ana','Ejemplo','CLIENT',true,'${t2}',now()),
        ('${orphan}','sin-negocio@example.test','Sin','Negocio','CLIENT',true,null,now());
      INSERT INTO "Branch" (id,"tenantId",name,address,"updatedAt") VALUES ('${b}','${t}','Sucursal','Ficticia',now());
      INSERT INTO "Service" (id,"tenantId",name,price,"updatedAt") VALUES ('${s}','${t}','Servicio',100,now());
      INSERT INTO "Appointment" (id,"tenantId","clientId","branchId","serviceId","startTime","endTime",status,"updatedAt")
        VALUES ('${a}','${t}','${u}','${b}','${s}','2026-12-01 10:00','2026-12-01 11:00','AUTHORIZED',now());
    `);
    let failure = sql(migration, true);
    assert.notEqual(failure.status, 0);
    assert.match(failure.stderr, /Customer: corregir/);
    assert.equal(sql(`SELECT count(*) FROM information_schema.tables WHERE table_name='Customer'`).stdout.trim(), '0');
    sql(`INSERT INTO "Profile" (id,"userId",phone) VALUES ('${randomUUID()}','${u}','+52 55 0000 0001');
      INSERT INTO "User" (id,email,"firstName","lastName",role,"tenantId","updatedAt") VALUES ('${duplicate}','duplicado@example.test','Otra','Persona','CLIENT','${t}',now());
      INSERT INTO "Profile" (id,"userId",phone) VALUES ('${randomUUID()}','${duplicate}','+525500000001');`);
    failure = sql(migration, true);
    assert.notEqual(failure.status, 0);
    assert.match(failure.stderr, /teléfonos duplicados/);
    sql(`DELETE FROM "Profile" WHERE "userId"='${duplicate}'; DELETE FROM "User" WHERE id='${duplicate}';`);
    sql(migration);
    url.hostname = 'localhost'; url.port = '5433'; url.pathname = `/${dbName}`;
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    assert.equal(await db.customer.count({ where: { userId: u } }), 2);
    assert.equal(await db.customer.count({ where: { userId: orphan } }), 0);
    assert.equal(await db.user.count({ where: { id: { in: [u, orphan] } } }), 2);
    const preserved = await db.appointment.findUnique({ where: { id: a }, include: { customer: true } });
    assert.equal(preserved.customer.tenantId, t);
    assert.equal(preserved.customer.userId, u);
    assert.equal(preserved.customer.phone, '+525500000001');
    assert.equal(preserved.startTime.toISOString(), '2026-12-01T10:00:00.000Z');
    const password = randomBytes(12).toString('hex');
    const hashed = await argon2.hash(password);
    for (const [tenantId, email] of [[t,'admin-a@example.test'],[t2,'admin-b@example.test']]) {
      await db.user.create({ data: { tenantId, email, firstName: 'Admin', lastName: 'Ficticio', role: 'ADMIN', isActive: true, password: hashed } });
    }
    await db.user.update({ where: { id: u }, data: { password: hashed } });
    const base = 'http://localhost:13030';
    apiProcess = spawn(process.execPath, ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'apps/cgbg-backend/src/main.ts'], {
      env: { ...process.env, DATABASE_URL: url.toString(), PORT: '13030', REDIS_URL: 'redis://localhost:6379', RMQ_URL: 'amqp://guest:guest@localhost:5672' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    apiProcess.stdout.on('data', b => logs += b.toString());
    apiProcess.stderr.on('data', b => logs += b.toString());
    let ready = false;
    for (let i = 0; i < 240; i++) {
      if (apiProcess.exitCode !== null) throw Error(logs);
      try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
      await new Promise(r => setTimeout(r, 250));
    }
    assert.ok(ready, logs);
    async function api(route, method='GET', body, token) {
      const r = await fetch(base+route, { method, headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) }, ...(body ? { body:JSON.stringify(body) } : {}) });
      return { status:r.status, body:await r.json() };
    }
    const tokenA = (await api('/auth/login','POST',{ email:'admin-a@example.test',password })).body.access_token;
    const tokenB = (await api('/auth/login','POST',{ email:'admin-b@example.test',password })).body.access_token;
    assert.ok(tokenA); assert.ok(tokenB);
    const input = { firstName:'Nueva',lastName:'Persona',email:'nueva@example.test',phone:'+52 55 0000 0099' };
    const first = await api('/clients','POST',input,tokenA);
    assert.equal(first.status,201);
    assert.equal(first.body.phone,'+525500000099');
    assert.equal((await api('/clients','POST',input,tokenA)).status,409);
    assert.equal((await api('/clients','POST',input,tokenB)).status,201);
    assert.equal((await api(`/clients/${first.body.id}`,'GET',undefined,tokenB)).status,404);
    assert.equal((await api('/clients','POST',{ ...input,tenantId:t2 },tokenA)).status,400);
    const list = await api('/clients','GET',undefined,tokenA);
    assert.equal(list.status,200);
    assert.doesNotMatch(JSON.stringify(list.body), /password|activationToken|resetPassword|userId|role|isActive/);
    const clientToken = (await api('/auth/login','POST',{ email:'cliente@example.test',password })).body.access_token;
    const mine = await api('/appointments/mine','GET',undefined,clientToken);
    assert.equal(mine.status,200);
    assert.deepEqual(mine.body.map(x=>x.id),[a]);
    console.log('Migración poblada conserva citas/cuentas; rollback por teléfono ausente/duplicado. HTTP 201/409/404/400 y mine por vínculo autenticado verificados.');
  } finally {
    if (apiProcess) {
      apiProcess.kill();
      await new Promise(resolve => apiProcess.exitCode !== null ? resolve() : apiProcess.once('exit', resolve));
    }
    if (db) await db.$disconnect();
    // Solo la base temporal creada por esta prueba, nunca volúmenes ni la base local del usuario.
    const drop = spawnSync('docker', ['exec', 'cgbg-postgres', 'dropdb', '-U', 'postgres', '--force', dbName], { encoding:'utf8' });
    assert.equal(drop.status,0,drop.stderr);
  }
});
