#!/usr/bin/env node
/**
 * Licensed exercise icon ingestion scaffold.
 *
 * Usage:
 *   node scripts/ingest-exercise-icons.mjs
 *
 * This script does NOT scrape arbitrary websites. It documents approved sources
 * and prepares a manifest for bundled icons. Extend `APPROVED_SOURCES` with
 * additional permissive repos (MIT/CC0) as needed.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'assets/exercise-icons/manifest.json');
const catalogPath = path.join(root, 'data/exerciseCatalog.ts');

const APPROVED_SOURCES = [
  {
    id: 'healthicons',
    license: 'CC0-1.0',
    repo: 'https://github.com/resolvetosavelives/healthicons',
    svgGlob: 'public/icons/svg/filled/body/exercise.svg',
  },
];

async function main() {
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: APPROVED_SOURCES.map(({ id, license, repo }) => ({ id, license, repo })),
    icons: [
      {
        key: 'healthicons:exercise',
        fallbackMaterialIcon: 'fitness-center',
        source: 'healthicons',
        license: 'CC0-1.0',
        status: 'manifest-only',
      },
    ],
  };

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const catalogExists = await fs
    .access(catalogPath)
    .then(() => true)
    .catch(() => false);

  console.log(`Wrote ${path.relative(root, manifestPath)}`);
  console.log(
    catalogExists
      ? `Catalog present at ${path.relative(root, catalogPath)} (${APPROVED_SOURCES.length} approved sources).`
      : 'Warning: exercise catalog file missing.'
  );
  console.log(
    'Next step: download SVGs from approved repos into assets/exercise-icons/svg/ and map keys in manifest.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
