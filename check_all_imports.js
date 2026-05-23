
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
  // Extract all JSX tags like <ComponentName
  const jsxTags = [...content.matchAll(/<([A-Z][a-zA-Z0-9]*)/g)].map(m => m[1]);
  // Filter for potential icons (starting with uppercase)
  const potentialIcons = [...new Set(jsxTags)].filter(tag => 
     !['React', 'Fragment', 'Link', 'Navigate', 'Route', 'Routes', 'BrowserRouter', 'AnimatePresence', 'div', 'span', 'button', 'input', 'img', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'main', 'header', 'footer', 'form', 'label', 'textarea', 'select', 'option', 'aside', 'nav', 'ul', 'li', 'a', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'svg', 'path', 'circle', 'line', 'polyline', 'rect', 'ellipse', 'polygon', 'defs', 'linearGradient', 'stop', 'use', 'text', 'tspan', 'g', 'marker', 'pattern', 'filter', 'mask', 'clipPath', 'symbol', 'view'].includes(tag)
  );

  potentialIcons.forEach(icon => {
     // Check if this icon is imported
     const importFound = content.includes(`import {`) && content.includes(icon);
     const componentDefined = content.includes(`function ${icon}`) || content.includes(`const ${icon} =`);
     
     if (!importFound && !componentDefined && !['SmartImage', 'Timer', 'NotificationBell', 'StudentSidebar', 'AdminSidebar', 'ProtectedRoute', 'App', 'StudentLayout', 'AdminLayout', 'StatCard', 'CountdownTimer', 'Certificate', 'NetworkStatus', 'InfoChip'].includes(icon)) {
        console.log(`Potential missing import for <${icon}> in ${file}`);
     }
  });
});
