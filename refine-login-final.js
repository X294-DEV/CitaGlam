const Jimp = require('jimp');

async function refineLogin() {
  const loginSrc = 'apps/cgbg-admin/public/brand/citaglam-login.png';

  console.log('Refining transparency for login logo:', loginSrc);
  const img = await Jimp.read(loginSrc);
  
  // Make background transparent (Aggressive threshold to clear the texture)
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // Light pixels detection (removing the off-white texture)
    if (r > 200 && g > 200 && b > 200) {
      this.bitmap.data[idx + 3] = 0; // Alpha 0
    }
  });

  await img.writeAsync(loginSrc);
  console.log('Login logo refined with transparency.');
}

refineLogin().catch(console.error);
