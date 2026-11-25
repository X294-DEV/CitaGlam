const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {withLocalApiDatabase}=require('./local-api-fixture.cjs');

test('Regresiones de privacidad, roles y reprogramación sobre el contrato Customer',async()=>{
  await withLocalApiDatabase(13034,async({migrate,start,url})=>{
    migrate(()=>true);
    const {base}=await start();
    const env={...process.env,DATABASE_URL:url,TEST_API_URL:base};
    // No heredar el marcador de node:test: el proceso hijo ejecuta su propio runner.
    delete env.NODE_TEST_CONTEXT;
    const child=spawn(process.execPath,['--test','--test-concurrency=1',
      'apps/cgbg-backend/test/public-booking.security.cjs',
      'apps/cgbg-backend/test/appointments-integrity.security.cjs'],{
      env,stdio:'inherit',
    });
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve)});
    assert.equal(code,0);
  });
});
