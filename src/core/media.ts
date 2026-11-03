// De onde vem a demonstração de cada exercício, em ordem de preferência:
//
// 1. Vídeo licenciado, se EXPO_PUBLIC_EXERCISE_VIDEO_BASE estiver definido (ex.: um bucket S3
//    com `{id}.mp4`, os mesmos nomes de arquivo do openGym). É aqui que entram as animações da
//    Gym visual, que o openGym usa, depois de você ter licença própria (gymvisual.com).
// 2. Fotos de posição inicial e final do free-exercise-db (Unlicense / domínio público),
//    alternadas para mostrar o movimento. Só para os exercícios em src/data/media.json.
// 3. Sempre: um atalho para buscar o vídeo no YouTube.
import mediaMap from '../data/media.json'
import type { Ex } from './exercises'

const VIDEO_BASE = (process.env.EXPO_PUBLIC_EXERCISE_VIDEO_BASE || '').replace(/\/+$/, '')
const PHOTO_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const MAP = mediaMap as Record<string, string>

export const PHOTO_CREDIT = 'Fotos: free-exercise-db (domínio público)'

export function videoOf(ex: Ex): string | null {
  if (!VIDEO_BASE || ex.custom || ex.missing) return null
  return `${VIDEO_BASE}/${encodeURIComponent(ex.id)}.mp4`
}

export function framesOf(ex: Ex): [string, string] | null {
  const dir = MAP[ex.id]
  if (!dir) return null
  return [`${PHOTO_BASE}${dir}/0.jpg`, `${PHOTO_BASE}${dir}/1.jpg`]
}

export const hasDemo = (ex: Ex) => !!(videoOf(ex) || framesOf(ex))

/** Busca no YouTube pelo nome original em inglês, que acha muito mais vídeos de execução. */
export function youtubeSearchUrl(ex: Ex) {
  const q = `${ex.en || ex.n} exercise proper form`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}
