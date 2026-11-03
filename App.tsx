// Casca do app: abas (Início, Plano, Começar, Estatísticas, Exercícios), pilha por aba,
// cronômetro, folhas e avisos. Equivale a App.jsx + TabBar.jsx do openGym.
import { useKeepAwake } from 'expo-keep-awake'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { todayISO } from './src/core/format'
import { effectiveRoutine } from './src/core/history'
import { setFeedback } from './src/core/native'
import { useNav, type Tab } from './src/nav'
import { Home } from './src/screens/Home'
import { Library } from './src/screens/Library'
import { Plan, RoutineEdit } from './src/screens/Plan'
import { Settings } from './src/screens/Settings'
import { History, Stats } from './src/screens/Stats'
import { Workout } from './src/screens/Workout'
import { startFlow } from './src/sheets/workout'
import { useStore } from './src/store/useStore'
import { Icon, type IconName } from './src/ui/icons'
import { useAccent } from './src/ui/kit'
import { SheetHost, TimerBar, Toast } from './src/ui/overlays'
import { C } from './src/ui/theme'

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Shell />
    </SafeAreaProvider>
  )
}

/** Tela ligada enquanto houver treino ativo (amarrado ao treino, não à aba), como no openGym. */
function KeepAwake() { useKeepAwake('opengym-workout'); return null }

function Shell() {
  const insets = useSafeAreaInsets()
  const ready = useStore(s => s.ready)
  const boot = useStore(s => s.boot)
  const active = useStore(s => !!s.S.active)
  const keepAwake = useStore(s => s.S.keepAwake !== false)
  const sound = useStore(s => !!s.S.sound)
  const tab = useNav(s => s.tab)
  const route = useNav(s => s.stacks[s.tab][s.stacks[s.tab].length - 1])

  useEffect(() => { boot() }, [boot])
  useEffect(() => { setFeedback(sound) }, [sound])

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.green} />
      </View>
    )
  }

  let screen
  if (route?.name === 'routine') screen = <RoutineEdit key={route.id} id={route.id} />
  else if (route?.name === 'settings') screen = <Settings />
  else if (route?.name === 'history') screen = <History />
  else if (tab === 'home') screen = <Home />
  else if (tab === 'plan') screen = <Plan />
  else if (tab === 'workout') screen = <Workout />
  else if (tab === 'stats') screen = <Stats />
  else screen = <Library />

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {active && keepAwake ? <KeepAwake /> : null}
      <View style={{ flex: 1 }}>{screen}</View>
      <TimerBar />
      <TabBar />
      <Toast />
      <SheetHost />
    </View>
  )
}

function TabBar() {
  const insets = useSafeAreaInsets()
  const acc = useAccent()
  const S = useStore(s => s.S)
  const tab = useNav(s => s.tab)
  const go = useNav(s => s.go)

  // O botão central começa o treino do dia direto, como no openGym; senão abre a escolha.
  const start = () => {
    if (!S.active) {
      const r = effectiveRoutine(S, todayISO())
      if (r && r.ex.length) { startFlow(r.id); return }
    }
    go('workout')
  }
  const Item = ({ k, icon, label }: { k: Tab; icon: IconName; label: string }) => {
    const on = tab === k
    return (
      <Pressable onPress={() => go(k)} style={{ flex: 1, alignItems: 'center' }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}>
        <Icon name={icon} size={25} color={on ? acc : C.label3} />
        <Text style={{ color: on ? acc : C.label3, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{label}</Text>
      </Pressable>
    )
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: C.bgEl, borderTopWidth: 0.5, borderTopColor: C.sep, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) }}>
      <Item k="home" icon="home" label="Início" />
      <Item k="plan" icon="calendar" label="Plano" />
      <Pressable onPress={start} style={{ flex: 1, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={S.active ? 'Continuar treino' : 'Começar treino'}>
        <View style={{ width: 50, height: 50, borderRadius: 25, marginTop: -18, alignItems: 'center', justifyContent: 'center', backgroundColor: S.active ? C.orange : acc, borderWidth: 4, borderColor: C.bgEl }}>
          <Icon name={S.active ? 'play' : 'dumbbell'} size={24} color="#000" />
        </View>
        <Text style={{ color: tab === 'workout' ? acc : C.label3, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{S.active ? 'Continuar' : 'Começar'}</Text>
      </Pressable>
      <Item k="stats" icon="chart-bar" label="Estatísticas" />
      <Item k="library" icon="format-list-bulleted" label="Exercícios" />
    </View>
  )
}
