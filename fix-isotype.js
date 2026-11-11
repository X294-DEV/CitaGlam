const Jimp = require('jimp');

async function fixIsotype() {
  const source = 'brands-source-cg.png';
  const sidebarTarget = 'apps/cgbg-admin/public/brand/citaglam-sidebar.png';
  const faviconTarget = 'apps/cgbg-admin/public/brand/favicon.png';

  console.log('Reading clean source:', source);
  const img = await Jimp.read(source);
  
  // Make background transparent (Aggressive threshold for light texture)
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // Light pixels detection (texture is light grey/white)
    if (r > 205 && g > 205 && b > 205) {
      this.bitmap.data[idx + 3] = 0; // Alpha 0
    }
  });

  // Save Sidebar Icon
  await img.clone().writeAsync(sidebarTarget);
  console.log('Sidebar icon saved with transparency:', sidebarTarget);

  // Save Favicon
  await img.clone().resize(64, 64).writeAsync(faviconTarget);
  console.log('Favicon saved with transparency:', faviconTarget);
}

fixIsotype().catch(console.error);
