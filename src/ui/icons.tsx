import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import type { ComponentProps } from 'react'
import type { StyleProp, TextStyle } from 'react-native'

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export function Icon({ name, size = 20, color, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
}

// Glifos das rotinas, os mesmos grupos do openGym (lib/glyphs.js), desenhados com MaterialCommunityIcons.
export const GLYPH_ICON: Record<string, IconName> = {
  figureStrength: 'weight-lifter', arm: 'arm-flex', abs: 'stomach', legs: 'human-male', pullup: 'human-handsup',
  dumbbell: 'dumbbell', barbell: 'weight', kettlebell: 'kettlebell', plate: 'circle-double', machine: 'robot-industrial',
  figureRun: 'run', bike: 'bike', swim: 'swim', boxing: 'boxing-glove', timer: 'timer-outline',
  stretch: 'yoga', moon: 'weather-night', heart: 'heart', flame: 'fire', bolt: 'lightning-bolt',
  target: 'target', trophy: 'trophy', medal: 'trophy', star: 'star', crown: 'trophy', shield: 'shield-outline',
}

export const DEFAULT_GLYPH = 'figureStrength'

export const GLYPH_GROUPS = [
  { key: 'Força', items: ['figureStrength', 'arm', 'abs', 'legs', 'pullup'] },
  { key: 'Equipamento', items: ['dumbbell', 'barbell', 'kettlebell', 'plate', 'machine'] },
  { key: 'Cardio', items: ['figureRun', 'bike', 'swim', 'boxing', 'timer'] },
  { key: 'Recuperação', items: ['stretch', 'moon', 'heart', 'flame', 'bolt'] },
]

// Emojis de rotinas antigas do openGym, para backups antigos continuarem com um ícone razoável.
const LEGACY: Record<string, string> = {
  '💪': 'arm', '🦾': 'arm', '🏋️': 'dumbbell', '🏋': 'dumbbell', '🦵': 'legs', '🍑': 'legs',
  '🔥': 'flame', '⚡': 'bolt', '🏃': 'figureRun', '🚴': 'bike', '🏊': 'swim', '🤸': 'stretch',
  '🧘': 'stretch', '🥊': 'boxing', '🧗': 'pullup', '🎯': 'target', '🏆': 'trophy',
}

export function glyphOf(v?: string | null): string {
  if (!v) return DEFAULT_GLYPH
  if (GLYPH_ICON[v]) return v
  if (LEGACY[v]) return LEGACY[v]
  const base = [...v].filter(c => c !== '️' && c !== '‍')[0]
  return LEGACY[base] || DEFAULT_GLYPH
}

export const glyphIcon = (v?: string | null): IconName => GLYPH_ICON[glyphOf(v)] || 'weight-lifter'

// Ícone de miniatura por parte do corpo (o openGym mostra a imagem do exercício aqui).
export const BP_ICON: Record<string, IconName> = {
  back: 'human-handsup', cardio: 'run', chest: 'weight-lifter', 'full body': 'human', 'lower arms': 'arm-flex',
  'lower legs': 'human-male', neck: 'human', shoulders: 'weight-lifter', 'upper arms': 'arm-flex',
  'upper legs': 'human-male', waist: 'stomach',
}
