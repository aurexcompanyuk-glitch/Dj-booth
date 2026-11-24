// Bundles src/ into one self-contained HTML file (three.js inlined), plus an
// artifact-ready fragment (no html/head/body wrapper) for publishing.
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.dirname(new URL(import.meta.url).pathname);
const r = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const result = await esbuild.build({
  entryPoints: [path.join(dir, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020', 'safari14'],
  write: false,
  legalComments: 'eof',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const head = r('src/head.html').trim();
const css = r('src/style.css');
const body = r('src/body.html').trim();

const full = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
${head}
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), full);

const outDir = process.env.ARTIFACT_OUT;
if (outDir) {
  const frag = `${head}\n<style>\n${css}\n</style>\n${body}\n<script>\n${js}\n</script>\n`;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'summit-freeride.html'), frag);
}
console.log(`index.html ${(full.length / 1024).toFixed(0)} KB (js ${(js.length / 1024).toFixed(0)} KB)`);
