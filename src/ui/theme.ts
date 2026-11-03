// Paleta escura do openGym (cores de sistema do iOS). O destaque segue S.accent, como no original.
import { ACCENTS } from '../core/format'

export const C = {
  bg: '#000000',
  bgEl: '#0e0e10',
  surface: '#1c1c1e',
  surface2: '#2c2c2e',
  surface3: '#3a3a3c',
  label: '#ffffff',
  label2: 'rgba(235,235,245,0.6)',
  label3: 'rgba(235,235,245,0.3)',
  sep: 'rgba(84,84,88,0.6)',
  red: '#ff453a',
  orange: '#ff9f0a',
  yellow: '#ffd60a',
  blue: '#0a84ff',
  green: '#30d158',
  purple: '#bf5af2',
  teal: '#40c8e0',
  indigo: '#5e5ce6',
  pink: '#ff375f',
}

export const R = { sm: 8, md: 12, lg: 16, xl: 22 }
export const PAD = 16

export const accentOf = (key?: string) => ACCENTS[key || 'lime'] || ACCENTS.lime

/** Cor com transparência a partir de #rrggbb. */
export const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
