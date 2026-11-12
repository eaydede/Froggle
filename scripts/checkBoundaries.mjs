import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function sources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules') return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}
const failures = [];
for (const file of [...sources('client/src'), ...sources('server'), ...sources('engine'), ...sources('models')]) {
  const source = fs.readFileSync(file, 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  for (const statement of parsed.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const specifier = statement.moduleSpecifier.text;
    const target = specifier.startsWith('.') ? path.normalize(path.join(path.dirname(file), specifier)) : specifier;
    if (/client\/src\/(ui|platform|gameplay)\//.test(file) && target.startsWith('client/src/features/')) failures.push(`${file} imports feature-owned code: ${specifier}`);
    if (file.startsWith('client/src/features/') && target.startsWith('client/src/app/')) failures.push(`${file} imports the composition root: ${specifier}`);
    if (file.endsWith('/repository.ts') && /\/service(\.js)?$/.test(target)) failures.push(`${file} imports a service: ${specifier}`);
    if (file.startsWith('engine/') && !specifier.startsWith('.') && specifier !== 'models' && !specifier.startsWith('models/') && specifier !== 'vitest') failures.push(`${file} imports a framework or persistence library: ${specifier}`);
  }
  if (/server\/features\/.*\/(api|service)\.ts$/.test(file) && /\.(selectFrom|insertInto|updateTable|deleteFrom)\(/.test(source)) failures.push(`${file} contains persistence queries outside a repository`);
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Capability dependency boundaries passed.');
