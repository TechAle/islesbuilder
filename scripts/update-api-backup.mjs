// Scarica le risposte API usate dall'app e aggiorna i backup locali in
// js/data/backup/. Uso: node scripts/update-api-backup.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL = 'https://isleswiki.net/api/v1';
const ENDPOINTS = {
    'items-weapons.json': '/items?category=weapons',
    'items-armor.json': '/items?category=armor',
    'items-accessories.json': '/items?category=accessories',
    'augments.json': '/augments',
    'elixirs.json': '/elixirs'
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'js', 'data', 'backup');
await mkdir(outDir, { recursive: true });

for (const [file, endpoint] of Object.entries(ENDPOINTS)) {
    const res = await fetch(API_URL + endpoint);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} at ${endpoint}`);
    }
    const json = await res.json();
    await writeFile(join(outDir, file), `${JSON.stringify(json, null, 2)}\n`, 'utf8');
    console.log(`${file}: API ${json.version ?? '?'} · ${json.count ?? '?'} elementi`);
}

console.log('Backup aggiornati in js/data/backup/');
