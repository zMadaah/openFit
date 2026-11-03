// Estado do app, no mesmo formato `S` do openGym (frontend/src/store/useStore.js).
// Por ser o mesmo formato, um backup JSON exportado no openGym web importa aqui e vice-versa.
//
// Como a versão mobile do openGym (VITE_MOBILE=1), este app não fala com servidor: o estado é
// salvo no aparelho (AsyncStorage) e o backup sai pela folha de compartilhamento.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { registerCustom } from '../core/exercises'
import { localTZ, uid } from '../core/format'
import { syncReminder } from '../core/native'

export const KEY = 'gym_state_v1'

export type SetRec = { w?: number; r?: number; sec?: number; min?: number; speed?: number; rir?: number; rpe?: number; done: boolean }
export type Cfg = {
  id: string; sets?: number; reps?: number; weight?: number; sec?: number; min?: number; speed?: number
  mode?: 'reps' | 'time' | 'cardio'; prog?: string; inc?: number; repsMin?: number; sg?: string
}
export type Routine = { id: string; name: string; emoji?: string; prog?: string; ex: Cfg[] }
export type Entry = { id: string; sg?: string; target?: any; plan?: any; sets: SetRec[]; topW?: number | null; asked?: boolean; n?: string }
export type Workout = {
  id: string; d: string; start: number; end?: number; routineId?: string | null; name: string
  bw?: number | null; entries: Entry[]; prs?: string[]; vol?: number; rating?: string; note?: string
}
export type Active = Omit<Workout, 'end' | 'prs' | 'vol'> & { cur: number }
export type State = {
  unit: 'kg' | 'lb'; restSec: number; sound: boolean; keepAwake: boolean; lang: string
  theme: string; accent: string; body: 'male' | 'female'; targetW: number | null
  bodyweight: { d: string; w: number; t?: number }[]; routines: Routine[]
  week: Record<string, string>; dayPlan: Record<string, string>
  exWeights: Record<string, { w: number; d: string }>; workouts: Workout[]; active: Active | null
  customEx: any[]; gifSize: string; reminder: { on: boolean; time: string; tz: string | null }
  effort: 'none' | 'rir' | 'rpe' | null; coach: any; showRir?: boolean; _ts?: number
}

export const DEF: State = {
  unit: 'kg', restSec: 90, sound: true, keepAwake: true, lang: 'pt',
  theme: 'dark', accent: 'lime', body: 'male', targetW: null,
  bodyweight: [], routines: [], week: {}, dayPlan: {},
  exWeights: {}, workouts: [], active: null, customEx: [], gifSize: 'full',
  reminder: { on: false, time: '08:00', tz: null }, effort: null, coach: null,
}
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o))
export const hasData = (st: State) => !!(st.workouts.length || st.routines.length || st.bodyweight.length)

type Store = {
  S: State
  ready: boolean
  update: (mut: (s: State) => void) => void
  replaceState: (S: State) => void
  boot: () => Promise<void>
}

let saveTm: ReturnType<typeof setTimeout> | null = null
let reminderTm: ReturnType<typeof setTimeout> | null = null

export const useStore = create<Store>((set, get) => {
  const persist = (S: State) => {
    S._ts = Date.now()
    registerCustom(S.customEx)
    set({ S })
    if (saveTm) clearTimeout(saveTm)
    saveTm = setTimeout(() => { saveTm = null; AsyncStorage.setItem(KEY, JSON.stringify(get().S)).catch(() => {}) }, 300)
    // O plano ou o horário podem ter mudado: reagenda o lembrete (sem pedir permissão).
    if (reminderTm) clearTimeout(reminderTm)
    reminderTm = setTimeout(() => { syncReminder(get().S) }, 1500)
  }

  return {
    S: clone(DEF),
    ready: false,

    /** Muta um rascunho de S e salva. Mesmo contrato do openGym: `update(s => { ... })`. */
    update(mut) {
      const S = clone(get().S)
      mut(S)
      persist(S)
    },
    replaceState(S) { persist(Object.assign(clone(DEF), clone(S))) },

    async boot() {
      try {
        const raw = await AsyncStorage.getItem(KEY)
        if (raw) {
          const S = Object.assign(clone(DEF), JSON.parse(raw))
          registerCustom(S.customEx)
          set({ S })
        } else {
          const migrated = await migrateMvp()
          if (migrated) persist(migrated)
        }
      } catch { /* armazenamento ilegível: começa do zero */ }
      const S = get().S
      if (S.reminder?.on && S.reminder.tz !== localTZ()) get().update(s => { s.reminder = { ...s.reminder, tz: localTZ() } })
      set({ ready: true })
    },
  }
})

/** Atalho para fora de componentes, como `S()` no sheets.jsx do openGym. */
export const S = () => useStore.getState().S
export const update = (mut: (s: State) => void) => useStore.getState().update(mut)

/** Traz os treinos da primeira versão (MVP) deste app para o formato do openGym. */
async function migrateMvp(): Promise<State | null> {
  try {
    const raw = await AsyncStorage.getItem('opengym-rn')
    if (!raw) return null
    const old = JSON.parse(raw)?.state
    if (!old?.workouts?.length) return null
    const iso = (t: number) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
    const S = clone(DEF)
    S.unit = old.settings?.unit === 'lb' ? 'lb' : 'kg'
    S.restSec = old.settings?.restSec || 90
    const toUnit = (kg: number) => (S.unit === 'lb' ? Math.round((kg / 0.45359237) * 10) / 10 : kg)
    S.workouts = [...old.workouts].reverse().map((w: any) => {
      const entries = w.entries.map((e: any) => ({ id: e.exId, target: null, topW: null, sets: e.sets.map((s: any) => ({ w: toUnit(s.w), r: s.r, done: !!s.done })) }))
      const vol = entries.reduce((a: number, e: any) => a + e.sets.reduce((b: number, s: any) => b + (s.done ? s.w * s.r : 0), 0), 0)
      return { id: w.id || uid(), d: iso(w.startedAt), start: w.startedAt, end: w.finishedAt || w.startedAt, routineId: null, name: 'Treino livre', bw: null, entries, prs: [], vol }
    })
    return S
  } catch {
    return null
  }
}
