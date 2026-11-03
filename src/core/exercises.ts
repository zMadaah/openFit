// Catálogo de exercícios. Portado de openGym/frontend/src/lib/exercises.js (AGPL-3.0).
// Diferenças: os nomes vêm em pt-BR (com o nome original em `en`), as instruções ficam em `st`
// e não há mídia (as imagens do openGym são licenciadas só para o app original).
import data from '../data/exercises.json'
import { t } from './i18n'

export type Ex = {
  id: string
  n: string
  en?: string
  bp: string
  eq: string
  tg: string
  sm?: string[]
  st?: string[]
  cat?: string
  hd?: number
  desc?: string
  custom?: boolean
  missing?: boolean
}

export const EXDB = data as Ex[]
export const EXIDX: Record<string, Ex> = {}
EXDB.forEach(e => { EXIDX[e.id] = e })
export const BODYPARTS = [...new Set(EXDB.map(e => e.bp))].sort((a, b) => t(a).localeCompare(t(b), 'pt-BR'))

/** Equipamentos presentes numa lista, do mais comum ao menos comum. */
export function equipmentOf(list: Ex[]) {
  const c: Record<string, number> = {}
  list.forEach(e => { if (e.eq) c[e.eq] = (c[e.eq] || 0) + 1 })
  return Object.keys(c).sort((a, b) => c[b] - c[a] || (a < b ? -1 : 1))
}

// Exercícios criados pelo usuário ficam em S.customEx e entram no índice aqui, para que
// toda busca EXIDX[id] continue funcionando.
let customIds: string[] = []
export function registerCustom(list: Ex[] | undefined) {
  customIds.forEach(id => delete EXIDX[id])
  customIds = (list || []).map(e => e.id)
  ;(list || []).forEach(e => { EXIDX[e.id] = { ...e, custom: true, tg: e.tg || '', eq: e.eq || 'custom' } })
}
export const allExercises = (st: { customEx?: Ex[] }): Ex[] =>
  [...(st.customEx || []).map(e => EXIDX[e.id] || e), ...EXDB]

export const isCardio = (idOrEx: string | Ex | undefined) =>
  (typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx)?.bp === 'cardio'

/** Exercício "segurar por tempo" no catálogo (prancha, isometria): entra no modo tempo. */
export const isHold = (idOrEx: string | Ex | undefined) =>
  !!(typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx)?.hd

export const exOr = (id: string): Ex =>
  EXIDX[id] || { id, n: t('Unknown exercise'), bp: '', tg: '', eq: '', sm: [], st: [], missing: true }

/** Minúsculas, sem acento e sem pontuação: "Elevação" acha "elevacao". */
export const normalize = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

const HAY = new Map<string, string>()
const hayOf = (e: Ex) => {
  let h = HAY.get(e.id)
  if (h === undefined || e.custom) {
    h = normalize(`${e.n} ${e.en || ''} ${t(e.bp)} ${t(e.eq)} ${t(e.tg)} ${e.desc || ''}`)
    if (!e.custom) HAY.set(e.id, h)
  }
  return h
}

/** Busca por palavras (todas precisam aparecer), priorizando nomes que começam com a busca. */
export function searchExercises(list: Ex[], query: string): Ex[] {
  const q = normalize(query)
  if (!q) return list
  const words = q.split(' ')
  const hits: { e: Ex; s: number }[] = []
  for (const e of list) {
    const hay = hayOf(e)
    if (!words.every(w => hay.includes(w))) continue
    // Pontua pelo nome em português e pelo original em inglês, e fica com o melhor dos dois.
    let s = -Infinity
    for (const name of e.en ? [normalize(e.n), normalize(e.en)] : [normalize(e.n)]) {
      let v = 0
      if (name === q) v += 100
      if (name.startsWith(q)) v += 50
      if (words.every(w => name.includes(w))) v += 20
      v -= name.length / 100
      s = Math.max(s, v)
    }
    if (e.custom) s += 5
    hits.push({ e, s })
  }
  return hits.sort((a, b) => b.s - a.s).map(h => h.e)
}
