// Navegação mínima: cinco abas (como a TabBar do openGym) e uma pilha por aba.
// `nav('/plan/r/123')` aceita as mesmas rotas do HashRouter do app web.
import { create } from 'zustand'

export type Tab = 'home' | 'plan' | 'workout' | 'stats' | 'library'
export type Route = { name: 'routine'; id: string } | { name: 'settings' } | { name: 'history' }

type Nav = {
  tab: Tab
  stacks: Record<Tab, Route[]>
  go: (tab: Tab, route?: Route) => void
  back: () => void
}

export const useNav = create<Nav>((set, get) => ({
  tab: 'home',
  stacks: { home: [], plan: [], workout: [], stats: [], library: [] },
  go(tab, route) {
    const stacks = { ...get().stacks, [tab]: route ? [route] : [] }
    set({ tab, stacks })
  },
  back() {
    const { tab, stacks } = get()
    set({ stacks: { ...stacks, [tab]: stacks[tab].slice(0, -1) } })
  },
}))

export function nav(path: string) {
  const go = useNav.getState().go
  const p = path.replace(/^#?\/?/, '')
  const [a, b, c] = p.split('/')
  if (a === 'plan' && b === 'r' && c) return go('plan', { name: 'routine', id: c })
  if (a === 'settings') return go('home', { name: 'settings' })
  if (a === 'history') return go('stats', { name: 'history' })
  if (a === 'plan' || a === 'workout' || a === 'stats' || a === 'library') return go(a)
  return go('home')
}
