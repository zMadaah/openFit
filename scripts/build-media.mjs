#!/usr/bin/env node
// Gera src/data/media.json: para cada exercício do nosso catálogo, a pasta de fotos
// correspondente no free-exercise-db (domínio público, Unlicense):
//   https://github.com/yuhonas/free-exercise-db
// Cada exercício lá tem 0.jpg (posição inicial) e 1.jpg (final); o app alterna as duas.
//
// Uso: node scripts/build-media.mjs /caminho/para/free-exercise-db/dist/exercises.json
//
// O cruzamento é por nome em inglês e é conservador de propósito: uma foto do exercício
// errado ensina errado, então na dúvida o exercício fica sem foto (e mostra o link de vídeo).
import fs from 'node:fs'
import path from 'node:path'

const src = process.argv[2]
if (!src) { console.error('uso: node scripts/build-media.mjs <free-exercise-db/dist/exercises.json>'); process.exit(1) }
const fe = JSON.parse(fs.readFileSync(src, 'utf8'))
const here = path.dirname(new URL(import.meta.url).pathname)
const ours = JSON.parse(fs.readFileSync(path.join(here, '../src/data/exercises.json'), 'utf8'))

const SYN = {
  dumbbells: 'dumbbell', db: 'dumbbell', barbells: 'barbell', bb: 'barbell', cables: 'cable',
  machine: 'lever', lever: 'lever', kettlebells: 'kettlebell', bands: 'band', curls: 'curl',
  raises: 'raise', presses: 'press', rows: 'row', squats: 'squat', lunges: 'lunge', crunches: 'crunch',
  extensions: 'extension', flyes: 'fly', flye: 'fly', flys: 'fly', pulldowns: 'pulldown', 'pull-down': 'pulldown',
  pushups: 'push-up', pushup: 'push-up', 'push-ups': 'push-up', pullups: 'pull-up', pullup: 'pull-up', 'pull-ups': 'pull-up',
  situp: 'sit-up', situps: 'sit-up', 'sit-ups': 'sit-up', chinup: 'chin-up', 'chin-ups': 'chin-up', dips: 'dip',
  shrugs: 'shrug', deadlifts: 'deadlift', triceps: 'tricep', biceps: 'bicep', calves: 'calf',
}
const STOP = new Set(['the', 'a', 'with', 'on', 'of', 'to', 'and', 'or', 'v', 'version', 'exercise', 'medium', 'grip', 'standard', 'regular'])
const words = s => s.toLowerCase().replace(/[^a-z0-9\- ]+/g, ' ').split(/\s+/)
  .map(w => SYN[w] || w).filter(w => w && !STOP.has(w))
const NEUTRAL = new Set(['bodyweight', 'body', 'attachment', 'free', 'basic', 'floor', 'standing', 'stretch', 'bands', 'flat'])
const key = ws => [...new Set(ws)].sort().join(' ')
const EQUIP = ['barbell', 'dumbbell', 'cable', 'kettlebell', 'band', 'lever', 'smith', 'ez', 'sled', 'trap', 'landmine']
const eqOf = ws => EQUIP.filter(e => ws.includes(e))
const sameEquip = (a, b) => { const x = eqOf(a), y = eqOf(b); return x.length === y.length && x.every(e => y.includes(e)) }

const feIdx = fe.filter(e => e.images?.length >= 1).map(e => {
  const w = words(e.name)
  // "body only" no free-exercise-db equivale ao nosso "body weight" (sem equipamento no nome)
  return { id: e.id, w, set: new Set(w), k: key(w), n: e.images.length }
})
const byKey = new Map(feIdx.map(e => [e.k, e]))

// Os exercícios mais usados (plano inicial e o básico de academia), conferidos à mão.
const MANUAL = {
  '0025': 'Barbell_Bench_Press_-_Medium_Grip', '0047': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  '0030': 'Close-Grip_Barbell_Bench_Press', '0289': 'Dumbbell_Bench_Press', '0314': 'Incline_Dumbbell_Press',
  '0241': 'Triceps_Pushdown_-_V-Bar_Attachment', '0739': 'Leg_Press', '2224': 'Leg_Press',
  '0585': 'Leg_Extensions', '0586': 'Lying_Leg_Curls', '0334': 'Side_Lateral_Raise',
  '0085': 'Romanian_Deadlift', '0117': 'Sumo_Deadlift', '1162': 'Standing_Military_Press',
  '2330': 'Full_Range-Of-Motion_Lat_Pulldown', '1323': 'Seated_Cable_Rows', '0861': 'Seated_Cable_Rows',
  '0180': 'Seated_Cable_Rows', '0313': 'Hammer_Curls', '0308': 'Dumbbell_Flyes', '0095': 'Barbell_Shrug',
  '0662': 'Pushups', '1060': 'Barbell_Hip_Thrust', '1326': 'Chin-Up', '0652': 'Pullups',
  '0060': 'EZ-Bar_Skullcrusher', '0447': 'EZ-Bar_Curl', '0605': 'Standing_Calf_Raises',
  '0594': 'Seated_Calf_Raise', '0426': 'Standing_Dumbbell_Press', '0251': 'Dips_-_Chest_Version', '0043': 'Barbell_Full_Squat',
}
const feIds = new Set(fe.map(e => e.id))
const out = {}
for (const [k, v] of Object.entries(MANUAL)) if (feIds.has(v) && ours.some(e => e.id === k)) out[k] = v
let exact = 0, close = 0
for (const ex of ours) {
  if (out[ex.id]) continue
  const w = words(ex.en || ex.n)
  if (!w.length) continue
  const k = key(w)
  const hit = byKey.get(k)
  if (hit) { out[ex.id] = hit.id; exact++; continue }
  // Quase igual: mesmo equipamento, todas as palavras de um contidas no outro, diferença de no
  // máximo uma palavra, e só um candidato nesse nível (empate = não chuta).
  const q = new Set(w)
  let best = null, ties = 0
  for (const c of feIdx) {
    if (!sameEquip(w, c.w)) continue
    // Só aceita quando o nome de lá contém TODAS as nossas palavras (e no máximo uma a mais).
    // O contrário perde a palavra que define o exercício: "romanian deadlift" virava "deadlift".
    const inter = [...q].filter(x => c.set.has(x)).length
    const diff = c.set.size - q.size
    if (inter !== q.size || diff < 0 || diff > 1 || q.size < 2) continue
    // A palavra a mais só pode ser neutra; "seated", "crossover", "double" mudam o exercício.
    if (diff === 1 && ![...c.set].every(x => q.has(x) || NEUTRAL.has(x))) continue
    if (!best || diff < best.diff) { best = { c, diff }; ties = 1 } else if (diff === best.diff) ties++
  }
  if (best && ties === 1) { out[ex.id] = best.c.id; close++ }
}
fs.writeFileSync(path.join(here, '../src/data/media.json'), JSON.stringify(out))
console.log(`${Object.keys(out).length} exercícios com fotos (${exact} nome igual, ${close} quase igual) de ${ours.length}`)
