const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

exports.withLocalApiDatabase = async function (port, run) {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['cgbg-postgres','localhost','127.0.0.1'].includes(url.hostname), 'Solo base local');
  const name = `cgbg_test_${randomUUID().replaceAll('-','')}`;
  assert.match(name,/^cgbg_test_[a-f0-9]{32}$/);
  function command(args,input) {
    return spawnSync('docker',['exec',...(input ? ['-i'] : []),'cgbg-postgres',...args],{input,encoding:'utf8'});
  }
  const created = command(['createdb','-U','postgres',name]); assert.equal(created.status,0,created.stderr);
  let child, db, logs='';
  function sql(text) {
    const r=command(['psql','-U','postgres','-d',name,'-At','-v','ON_ERROR_STOP=1'],text);
    if(r.status)throw Error(r.stderr);return r.stdout.trim();
  }
  const migrations=path.resolve('libs/prisma/prisma/migrations');
  const all=fs.readdirSync(migrations).filter(n=>/^\d/.test(n)).sort();
  function migrate(predicate) {
    for(const dir of all.filter(predicate))sql(fs.readFileSync(path.join(migrations,dir,'migration.sql'),'utf8'));
  }
  url.hostname='localhost';url.port='5433';url.pathname=`/${name}`;
  try {
    await run({sql,migrate,url:url.toString(),async start() {
      db=new PrismaClient({datasources:{db:{url:url.toString()}}});
      child=spawn(process.execPath,['-r','ts-node/register','-r','tsconfig-paths/register','apps/cgbg-backend/src/main.ts'],{
        env:{...process.env,DATABASE_URL:url.toString(),PORT:String(port),REDIS_URL:'redis://localhost:6379',RMQ_URL:'amqp://guest:guest@localhost:5672'},stdio:['ignore','pipe','pipe'],
      });
      child.stdout.on('data',b=>logs+=b.toString());child.stderr.on('data',b=>logs+=b.toString());
      const base=`http://localhost:${port}`;
      let ready=false;
      for(let i=0;i<240;i++){
        if(child.exitCode!==null)throw Error(logs);
        try{if((await fetch(base)).ok){ready=true;break}}catch{}
        await new Promise(r=>setTimeout(r,250));
      }
      assert.ok(ready,logs);
      return {db,base,async api(route,method='GET',body,token){
        const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
        return {status:r.status,body:await r.json()};
      }};
    }});
  } finally {
    if(child){child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));}
    if(db)await db.$disconnect();
    const dropped=command(['dropdb','-U','postgres','--force',name]);assert.equal(dropped.status,0,dropped.stderr);
  }
};
