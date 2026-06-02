import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      callback(filepath);
    }
  }
}

walk('src', (filepath) => {
  const content = fs.readFileSync(filepath, 'utf8');
  if (content.includes('.questions.length') || content.includes('.questions?.length')) {
    console.log(`Found in: ${filepath}`);
    // Find matching lines
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('.questions.length') || line.includes('.questions?.length')) {
        console.log(`  Line ${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
