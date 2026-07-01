const fs = require('fs');
const Jimp = require('jimp');

async function findRedDots(imagePath) {
  const image = await Jimp.read(imagePath);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  
  const redPixels = [];
  
  // Find all reddish pixels
  image.scan(0, 0, width, height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // A simple heuristic for the red dots (they look pure red #ff0000 or similar)
    if (r > 150 && g < 80 && b < 80) {
      redPixels.push({ x, y });
    }
  });

  // Group nearby pixels to find centroids
  const groups = [];
  for (const p of redPixels) {
    let foundGroup = false;
    for (const g of groups) {
      if (Math.abs(g.x - p.x) < 20 && Math.abs(g.y - p.y) < 20) {
        g.pixels.push(p);
        g.x = g.pixels.reduce((sum, curr) => sum + curr.x, 0) / g.pixels.length;
        g.y = g.pixels.reduce((sum, curr) => sum + curr.y, 0) / g.pixels.length;
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      groups.push({ x: p.x, y: p.y, pixels: [p] });
    }
  }

  // Calculate percentages and sort
  const points = groups.map(g => ({
    x: (g.x / width) * 100,
    y: (g.y / height) * 100
  })).sort((a, b) => a.x - b.x); // sort by X for easier matching

  console.log(`Found ${points.length} dots in ${imagePath}:`);
  points.forEach((p, i) => {
    console.log(`  Dot ${i+1}: { x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)} }`);
  });
  
  return points;
}

async function run() {
  await findRedDots('public/assets/maps/journey1.png');
  await findRedDots('public/assets/maps/journey2.png');
  await findRedDots('public/assets/maps/journey3.png');
  await findRedDots('public/assets/maps/journey4.png');
}

run();
