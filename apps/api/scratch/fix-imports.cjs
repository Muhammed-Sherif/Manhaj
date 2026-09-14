const fs = require('fs');
const path = require('path');
function fixImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const newContent = content.replace(/from\s+['"](\.[^'"]+)['"]/g, (match, p1) => {
        if (p1.endsWith('.js')) return match;
        return `from '${p1}.js'`;
      });
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
      }
    }
  }
}
fixImports(path.join(__dirname, '../src'));
console.log('Imports fixed.');
