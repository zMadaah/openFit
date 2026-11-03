// Formatação e datas. Portado de openGym/frontend/src/lib/format.js (AGPL-3.0), fixo em pt-BR.
import { t } from './i18n'

const LOCALE = 'pt-BR'
export const dateLocale = () => LOCALE

const p2 = (n: number) => String(n).padStart(2, '0')
export const isoOf = (d: Date) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate())
export const todayISO = () => isoOf(new Date())

export const DAYN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "12 de mai." ou, com `long`, "seg., 12 de mai." */
export function fmtDate(iso: string, long?: boolean) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString(LOCALE, long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' })
}
export function fmtDur(ms: number) {
  const m = Math.floor(ms / 60000)
  return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'min' : m + ' min'
}
// Histórico importado não tem horário: uma duração desconhecida fica de fora em vez de "0 min".
export const durPart = (ms: number) => (ms >= 60000 ? [fmtDur(ms)] : [])
export const fmtNum = (n: number) => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString(LOCALE)
export const fmtVol = (v: number, unit: string) => fmtNum(v) + ' ' + unit
export const exCount = (n: number) => t(n === 1 ? '{0} exercise' : '{0} exercises', n)

export function weekKey(d: string) {
  const dt = new Date(d + 'T12:00:00')
  const day = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - day + 3)
  const jan4 = new Date(dt.getFullYear(), 0, 4)
  const week = 1 + Math.round(((+dt - +jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
  return dt.getFullYear() + '-' + week
}

export const localTZ = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export const ACCENTS: Record<string, string> = {
  lime: '#30d158', sky: '#0a84ff', orange: '#ff9f0a', violet: '#bf5af2',
  pink: '#ff375f', red: '#ff453a', teal: '#40c8e0', gold: '#ffd60a',
}

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
