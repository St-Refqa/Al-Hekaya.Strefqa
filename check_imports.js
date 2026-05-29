
import fs from 'fs';
import path from 'path';

function getAllFiles(dir, fileList = []) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const files = getAllFiles('./src');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  ['Award', 'ArrowRight'].forEach(icon => {
    if (content.includes(`<${icon}`) || content.includes(`icon: ${icon}`)) {
       // Search for the icon in import statements
       const importRegex = new RegExp(`import\\s+\\{[^}]*\\b${icon}\\b[^}]*\\}\\s+from\\s+['"]lucide-react['"]`, 's');
       if (!importRegex.test(content)) {
          console.log(`Missing ${icon} import in: ${file}`);
       }
    }
  });
});
