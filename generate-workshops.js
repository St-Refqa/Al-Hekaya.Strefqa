import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workshopsDir = path.join(__dirname, 'public', 'workshops');
const outputFilePath = path.join(workshopsDir, 'index.json');

try {
  if (fs.existsSync(workshopsDir)) {
    const files = fs.readdirSync(workshopsDir);
    const validFiles = files.filter(f => f !== 'index.json' && (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.webp')));
    fs.writeFileSync(outputFilePath, JSON.stringify(validFiles, null, 2));
    console.log(`Generated workshops index with ${validFiles.length} files.`);
  } else {
    console.log('Workshops directory does not exist yet.');
  }
} catch (error) {
  console.error('Error generating workshops index:', error);
}
