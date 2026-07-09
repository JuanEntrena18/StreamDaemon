import { Jimp, colorDiff } from 'jimp';
import path from 'path';

const artifactsDir = 'C:/Users/jentr/.gemini/antigravity-ide/brain/43871511-a49a-4da6-ba59-2fdc5b662474';
const spritesDir = '../packages/frontend/public/sprites';

const themes = [
  { name: 'default', source: 'default_magenta_1783588921712.png' },
  { name: 'cyberpunk', source: 'cyberpunk_magenta_1783588928783.png' },
  { name: '8bits', source: '8bits_magenta_1783588936626.png' },
  { name: 'horde', source: 'horde_orc_magenta_1783588899140.png' }
];

function isBackground(hex) {
  const r = (hex >>> 24) & 0xFF;
  const g = (hex >>> 16) & 0xFF;
  const b = (hex >>> 8) & 0xFF;
  
  // Magenta-ish (Red and Blue are dominant)
  if (r > g + 20 && b > g + 20) return true;
  
  // Pure white or very light gray (artifact noise)
  if (r > 240 && g > 240 && b > 240) return true;
  
  // Almost black/dark magenta (grid lines)
  if (r < 80 && g < 50 && b > 30 && r > 30) return true;
  
  // Specifically the dark cell in the horde sprite: 
  if (r > 100 && r < 180 && g < 40 && b > 80) return true;
  
  return false;
}

async function processSprite(theme) {
  console.log(`Processing ${theme.name}...`);
  try {
    const srcPath = path.join(artifactsDir, theme.source);
    const destPath = path.join(spritesDir, theme.name, 'spritesheet.png');
    
    let image = await Jimp.read(srcPath);
    image.resize({ w: 1024, h: 768, mode: 'nearestNeighbor' });
    
    for (let y = 0; y < image.bitmap.height; y++) {
      for (let x = 0; x < image.bitmap.width; x++) {
        const hex = image.getPixelColor(x, y);
        if (isBackground(hex)) {
          image.setPixelColor(0x00000000, x, y);
        }
      }
    }
    
    await image.write(destPath);
    console.log(`Successfully saved ${theme.name} to ${destPath}`);
  } catch (err) {
    console.error(`Error processing ${theme.name}:`, err);
  }
}

async function run() {
  for (const theme of themes) {
    await processSprite(theme);
  }
}

run();
