#!/usr/bin/env node
// Gera src/data/exercises.json a partir do catálogo do openGym (AGPL-3.0 / MIT, ver NOTICE.md).
// Uso: node scripts/build-catalogue.mjs /caminho/para/openGym
//
// Os ids são os mesmos do openGym (0025 = supino com barra, etc.), então backups, planos
// compartilhados e o plano inicial PPL funcionam entre o app web e este app.
// Não copia nenhuma mídia: catalogue/media é licenciada pela Gym visual só para o openGym.
import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2]
if (!root) { console.error('uso: node scripts/build-catalogue.mjs <pasta do openGym>'); process.exit(1) }

const src = fs.readFileSync(path.join(root, 'frontend/src/lib/exercises-data.js'), 'utf8')
const m = src.match(/EXDB=JSON\.parse\('(.*?)'\)/s) || src.match(/EXDB=(\[.*\])/s)
if (!m) { console.error('não achei EXDB em exercises-data.js'); process.exit(1) }
const db = JSON.parse(m[1].replace(/\\'/g, "'"))

const ptFile = path.join(root, 'catalogue/i18n/pt-BR.json')
const pt = fs.existsSync(ptFile) ? JSON.parse(fs.readFileSync(ptFile, 'utf8')) : {}

const out = db
  // As variações "(form check)" são só referência visual da mídia original; sem mídia não servem.
  .filter(e => !/\(form check\)/i.test(e.n))
  .map(e => {
    const o = { id: e.id, n: pt[e.id]?.name || e.n, en: e.n, bp: e.bp, eq: e.eq, tg: e.tg || '' }
    if (e.sm?.length) o.sm = e.sm
    if (e.cat) o.cat = e.cat
    if (e.hd) o.hd = 1
    const st = pt[e.id]?.instructions || e.st
    if (st?.length) o.st = st
    return o
  })
  .sort((a, b) => a.n.localeCompare(b.n, 'pt-BR'))

const dest = path.join(path.dirname(new URL(import.meta.url).pathname), '../src/data/exercises.json')
fs.writeFileSync(dest, JSON.stringify(out))
console.log(`${out.length} exercícios → ${path.relative(process.cwd(), dest)} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB), ` +
  `${out.filter(e => e.n !== e.en).length} com nome em pt-BR`)
