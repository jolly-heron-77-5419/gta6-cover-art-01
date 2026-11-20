// Vice Cover Studio — hand-in program (Node 22, standard library only).
//
// The app is plain static files under app/ (index.html plus its ES modules,
// no build step, no network requests), and this program copies app/ and
// screenshots/ next to this file into the output directory and writes
// /output/dossier.json with the vendored make.fun library, which is the
// summary the judge reads. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output, so a local check looks like:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's gate (see the kit's reference/gate.json): the
// dossier text is capped at 160 KiB, at most 4 screenshots of 256 KiB each,
// and app/ stays inside 993 files / 48 MiB with no path over 1,000 bytes.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
