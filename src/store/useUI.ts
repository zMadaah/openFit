// Estado de interface que não é salvo: folhas (sheets), aviso rápido (toast), cronômetro de
// descanso e cronômetro de série por tempo. Portado de openGym/frontend/src/store/useUI.js.
//
// O openGym web pede ao servidor um push "descanso acabou" (POST /api/push/rest-timer) para o
// caso de a aba ser suspensa. Aqui o equivalente é uma notificação local agendada no aparelho.
import * as Notifications from 'expo-notifications'
import type { ReactNode } from 'react'
import { create } from 'zustand'
import { uid } from '../core/format'
import { alarm, tap } from '../core/native'

export type SheetRender = (close: () => void) => ReactNode
type SheetOpts = { title?: string; locked?: boolean; list?: boolean }
type Sheet = { id: string; render: SheetRender } & SheetOpts
type Timer = { total: number; endsAt: number; label?: string }

type UI = {
  sheets: Sheet[]
  toastMsg: string
  timer: Timer | null
  work: Timer | null
  openSheet: (render: SheetRender, opts?: SheetOpts) => { id: string; close: () => void }
  closeSheet: (id: string) => void
  closeAll: () => void
  toast: (m: string) => void
  startRest: (sec: number) => void
  addRest: (sec: number) => void
  stopRest: () => void
  restDone: () => void
  startWork: (sec: number, label: string, onDone: (elapsed: number) => void) => void
  finishWorkEarly: () => void
  stopWork: () => void
  workDone: () => void
}

let toastTm: ReturnType<typeof setTimeout> | null = null
let restNotif: string | null = null
let workCb: ((elapsed: number) => void) | null = null

const cancelRestNotif = () => {
  if (restNotif) Notifications.cancelScheduledNotificationAsync(restNotif).catch(() => {})
  restNotif = null
}
const scheduleRestNotif = async (sec: number) => {
  cancelRestNotif()
  if (sec < 5) return
  try {
    const perm = await Notifications.getPermissionsAsync()
    if (!perm.granted) return
    restNotif = await Notifications.scheduleNotificationAsync({
      content: { title: 'Descanso acabou', body: 'Próxima série!', data: { kind: 'opengym-rest' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(sec) },
    })
  } catch { /* sem notificação: o cronômetro na tela continua valendo */ }
}

export const useUI = create<UI>((set, get) => ({
  sheets: [],
  toastMsg: '',
  timer: null,
  work: null,

  openSheet(render, opts = {}) {
    const id = uid()
    set(s => ({ sheets: [...s.sheets, { id, render, ...opts }] }))
    return { id, close: () => get().closeSheet(id) }
  },
  closeSheet(id) { set(s => ({ sheets: s.sheets.filter(x => x.id !== id) })) },
  closeAll() { set({ sheets: [] }) },

  toast(msg) {
    set({ toastMsg: msg })
    if (toastTm) clearTimeout(toastTm)
    toastTm = setTimeout(() => set({ toastMsg: '' }), 2400)
  },

  startRest(sec) {
    if (!(sec > 0)) return
    set({ timer: { total: sec, endsAt: Date.now() + sec * 1000 } })
    scheduleRestNotif(sec)
  },
  addRest(sec) {
    const tm = get().timer
    if (!tm) return
    const left = (tm.endsAt - Date.now()) / 1000 + sec
    // tirar mais do que resta é o mesmo que "estou pronto": pula
    if (left <= 0) { get().stopRest(); return }
    set({ timer: { total: Math.max(1, tm.total + sec), endsAt: tm.endsAt + sec * 1000 } })
    scheduleRestNotif(left)
  },
  stopRest() { cancelRestNotif(); set({ timer: null }) },
  restDone() {
    alarm()
    cancelRestNotif()
    set({ timer: null })
    get().toast('Descanso acabou: próxima série!')
  },

  /* Cronômetro de série por tempo (issue #16 do openGym): registra o tempo realmente segurado. */
  startWork(sec, label, onDone) {
    get().stopRest()
    const total = Math.max(1, Math.round(sec) || 1)
    workCb = onDone
    set({ work: { total, endsAt: Date.now() + total * 1000, label } })
  },
  finishWorkEarly() {
    const wk = get().work
    if (!wk) return
    const elapsed = Math.max(1, Math.round(wk.total - Math.max(0, (wk.endsAt - Date.now()) / 1000)))
    const cb = workCb
    tap()
    get().stopWork()
    cb?.(elapsed)
  },
  stopWork() { workCb = null; set({ work: null }) },
  workDone() {
    const wk = get().work
    if (!wk) return
    const cb = workCb
    alarm()
    get().stopWork()
    cb?.(wk.total)
  },
}))

export const toast = (m: string) => useUI.getState().toast(m)
export const openSheet = (render: SheetRender, opts?: SheetOpts) => useUI.getState().openSheet(render, opts)
