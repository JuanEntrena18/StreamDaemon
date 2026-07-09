import { Jimp } from 'jimp';

async function check() {
  const image = await Jimp.read('../packages/frontend/public/sprites/horde/spritesheet.png');
  console.log('Top left pixel:', image.getPixelColor(0, 0).toString(16));
  console.log('Next pixel:', image.getPixelColor(1, 0).toString(16));
  console.log('Next pixel:', image.getPixelColor(2, 0).toString(16));
  
  // scan a 10x10 area to find unique colors
  const colors = new Set();
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      colors.add(image.getPixelColor(x, y).toString(16));
    }
  }
  console.log('Unique colors in 10x10:', Array.from(colors));
}

check().catch(console.error);
