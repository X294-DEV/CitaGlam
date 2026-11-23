const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
const argon2=require('argon2');
const {withLocalApiDatabase}=require('./local-api-fixture.cjs');

test('S1-03: duración, concurrencia, cancelación y traslapes en PostgreSQL',async()=>{
  await withLocalApiDatabase(13032,async({sql,migrate,start})=>{
    migrate(n=>n<'20261123000000');
    const p=randomUUID(),t=randomUUID(),u=randomUUID(),b=randomUUID(),short=randomUUID(),long=randomUUID();
    const slug=`dur-${t}`;
    sql(`INSERT INTO "SubscriptionPackage" (id,name,price,"updatedAt") VALUES ('${p}','Ficticio',100,now());
      INSERT INTO "Tenant" (id,name,slug,"packageId","updatedAt") VALUES ('${t}','Negocio','${slug}','${p}',now());
      INSERT INTO "User" (id,email,"firstName","lastName",role,"isActive","tenantId","updatedAt") VALUES ('${u}','dur@example.test','Ana','Ejemplo','CLIENT',true,'${t}',now());
      INSERT INTO "Profile" (id,"userId",phone) VALUES ('${randomUUID()}','${u}','+525500000001');
      INSERT INTO "Branch" (id,"tenantId",name,address,"updatedAt") VALUES ('${b}','${t}','Sucursal','Ficticia',now());
      INSERT INTO "Service" (id,"tenantId",name,price,"durationMin","updatedAt") VALUES
        ('${short}','${t}','Corto',100,30,now()),('${long}','${t}','Largo',200,90,now());
      INSERT INTO "BusinessSchedule" (id,"branchId","dayOfWeek","openTime","closeTime") VALUES ('${randomUUID()}','${b}',2,'09:00','18:00');`);
    migrate(n=>n>='20261123000000');
    const modern=sql(`SELECT count(*) FROM information_schema.columns WHERE table_name='Appointment' AND column_name='termsAcceptedAt'`)==='1';
    const {db,api}=await start();
    const password=randomBytes(12).toString('hex');
    await db.user.create({data:{tenantId:t,email:'admin-dur@example.test',firstName:'Admin',lastName:'Ficticio',role:'ADMIN',isActive:true,password:await argon2.hash(password)}});
    const token=(await api('/auth/login','POST',{email:'admin-dur@example.test',password})).body.access_token;
    assert.ok(token);
    const query=(serviceId)=>new URLSearchParams({branchId:b,serviceId,date:'2026-12-01'});
    const a30=await api(`/appointments/available?${query(short)}`);
    const a90=await api(`/appointments/available?${query(long)}`);
    assert.equal(a30.status,200);assert.equal(a90.status,200);
    assert.equal(a30.body[0].startTime,'2026-12-01T15:00:00.000Z');
    assert.equal(a30.body[0].endTime,'2026-12-01T15:30:00.000Z');
    assert.equal(a30.body[1].startTime,'2026-12-01T15:30:00.000Z');
    assert.equal(a90.body[0].endTime,'2026-12-01T16:30:00.000Z');
    assert.equal(a90.body[1].startTime,'2026-12-01T16:30:00.000Z');
    const request=(i)=>{
      const clientInfo={firstName:'Cliente',lastName:'Ficticio',email:`race${i}@example.test`,phone:`+52550000001${i}`};
      return {branchId:b,serviceId:long,startTime:a90.body[0].startTime,
        ...(modern?{slug,termsAccepted:true,clientInfo}:{clientInfo:{...clientInfo,termsAccepted:true}})};
    };
    const race=await Promise.all([api('/appointments/public','POST',request(1)),api('/appointments/public','POST',request(2))]);
    assert.deepEqual(race.map(x=>x.status).sort(),[201,409]);
    const winner=race.find(x=>x.status===201).body;
    assert.equal(winner.endTime,'2026-12-01T16:30:00.000Z');
    assert.equal(await db.appointment.count({where:{tenantId:t}}),1);
    const identity=db.customer?{customerId:(await db.customer.findFirst({where:{tenantId:t,userId:u}})).id}:{clientId:u};
    const row={tenantId:t,branchId:b,serviceId:short,...identity,status:'AUTHORIZED'};
    await assert.rejects(db.appointment.create({data:{...row,startTime:new Date('2026-12-01T15:30Z'),endTime:new Date('2026-12-01T16:00Z')}}),/23P01|appointment_no_overlap/);
    const adjacent=await db.appointment.create({data:{...row,startTime:new Date('2026-12-01T16:30Z'),endTime:new Date('2026-12-01T17:00Z')}});
    await db.appointment.delete({where:{id:adjacent.id}});
    assert.equal((await api(`/appointments/${winner.id}/reschedule`,'PATCH',{newStartTime:winner.startTime},token)).status,200);
    assert.equal((await api(`/appointments/${winner.id}`,'DELETE',undefined,token)).status,200);
    assert.ok((await api(`/appointments/available?${query(long)}`)).body.some(x=>x.startTime===winner.startTime));
    await db.workException.create({data:{tenantId:t,exceptionDate:new Date('2026-12-01T00:00Z'),isFullDay:false,startTime:'14:00',endTime:'15:00'}});
    const partial=(await api(`/appointments/available?${query(long)}`)).body;
    assert.ok(!partial.some(x=>x.startTime==='2026-12-01T19:30:00.000Z'));
    await db.businessSchedule.updateMany({where:{branchId:b},data:{openTime:'00:00',closeTime:'02:00'}});
    await db.appointment.create({data:{...row,startTime:new Date('2026-12-01T05:45Z'),endTime:new Date('2026-12-01T06:15Z')}});
    const midnight=(await api(`/appointments/available?${query(short)}`)).body;
    assert.ok(!midnight.some(x=>x.startTime==='2026-12-01T06:00:00.000Z'));
    assert.ok(midnight.some(x=>x.startTime==='2026-12-01T06:30:00.000Z'));
    console.log('HTTP concurrente: 201 + 409; exclusión SQL directa, adyacencia, 30/90 min, cancelación, excepción parcial y cruce de medianoche verificados.');
  });
});
