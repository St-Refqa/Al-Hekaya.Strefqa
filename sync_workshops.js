import fs from 'fs';
import path from 'path';

const sourceDir = path.join(process.cwd(), 'حل الورش');
const destDir = path.join(process.cwd(), 'public', 'workshops');
const indexPath = path.join(destDir, 'index.json');

// Ensure destination exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy files if source exists
if (fs.existsSync(sourceDir)) {
  const files = fs.readdirSync(sourceDir);
  
  files.forEach(file => {
    // Only copy image files
    if (file.match(/\.(png|jpe?g|gif|webp)$/i)) {
      const srcFile = path.join(sourceDir, file);
      const destFile = path.join(destDir, file);
      
      // Copy over
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

// Read destination and build index.json
const destFiles = fs.readdirSync(destDir);
const imageList = destFiles.filter(file => file.match(/\.(png|jpe?g|gif|webp)$/i));

fs.writeFileSync(indexPath, JSON.stringify(imageList, null, 2), 'utf-8');
console.log(`Synced ${imageList.length} workshop files and updated index.json!`);
