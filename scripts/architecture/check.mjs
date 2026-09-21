import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import ts from "typescript";
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  );
}
const root = resolve(".");
const roots = [
  "packages/contracts/src",
  "packages/game-core/src",
  "packages/kernel-adapters/src",
  "apps/headless/src",
];
const graph = new Map();
let count = 0;
for (const dir of roots)
  for (const file of walk(dir).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
  )) {
    const text = readFileSync(file, "utf8"),
      core = file.startsWith("packages/game-core");
    count++;
    if (
      core &&
      /Date\.now\(|Math\.random\(|process\.env|setTimeout\(|setInterval\(/.test(
        text,
      )
    )
      throw Error(`Core nondeterminism: ${file}`);
    const parsed = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    for (const stmt of parsed.statements) {
      if (
        !(ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt)) ||
        !stmt.moduleSpecifier ||
        !ts.isStringLiteral(stmt.moduleSpecifier)
      )
        continue;
      const spec = stmt.moduleSpecifier.text;
      if (core && !spec.startsWith(".") && spec !== "@3ker/contracts")
        throw Error(`Core dependency ${file}: ${spec}`);
      if (
        file.startsWith("packages/contracts") &&
        !spec.startsWith(".") &&
        spec !== "zod"
      )
        throw Error(`Contracts dependency ${spec}`);
      if (
        file.startsWith("packages/kernel-adapters") &&
        spec.startsWith("@3ker/game-core") &&
        spec !== "@3ker/game-core/ports"
      )
        throw Error(`Adapter bypasses ports: ${spec}`);
      if (core && spec.startsWith(".")) {
        const target = relative(root, resolve(dirname(file), spec)).replaceAll(
          "\\",
          "/",
        );
        if (!target.startsWith("packages/game-core/src/"))
          throw Error(`Core escape: ${file}`);
        const feature = file.match(/\/features\/([^/]+)\//)?.[1],
          other = target.match(/\/features\/([^/]+)\//)?.[1];
        if (feature && target.includes("/application/"))
          throw Error(`Feature reverse import: ${file}`);
        if (other && other !== feature && !spec.endsWith("/index.js"))
          throw Error(`Private feature import: ${file}: ${spec}`);
        if (feature && other && feature !== other) {
          if (!graph.has(feature)) graph.set(feature, new Set());
          graph.get(feature).add(other);
        }
      }
    }
  }
function visit(node, path = []) {
  if (path.includes(node)) throw Error(`Feature cycle ${[...path, node]}`);
  for (const next of graph.get(node) ?? []) visit(next, [...path, node]);
}
for (const node of graph.keys()) visit(node);
console.log(
  `Architecture check passed: ${count} production TypeScript files; dependency direction and feature cycles checked`,
);
