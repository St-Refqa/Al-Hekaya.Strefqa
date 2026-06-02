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
  if (content.includes('.questions')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('.questions') && !line.includes('.questions.easy') && !line.includes('.questions.medium') && !line.includes('.questions.hard') && !line.includes('.questions?') && !line.includes('?.questions')) {
        console.log(`${filepath}:${idx + 1}: ${line.trim()}`);
      } else if (line.includes('?.questions')) {
        console.log(`[Optional/Optional Chaining] ${filepath}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
