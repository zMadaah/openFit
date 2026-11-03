// Folhas (sheets), aviso rápido e barra do cronômetro. Equivalem a Modals.jsx, Toast.jsx e
// RestTimer.jsx do openGym.
//
// Uma única Modal mostra a folha do topo da pilha: abrir outra folha troca o conteúdo sem
// fechar a janela, que é como os fluxos do openGym encadeiam (escolher exercício → configurar).
import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUI } from '../store/useUI'
import { Icon } from './icons'
import { C, PAD, R, alpha } from './theme'
import { useAccent } from './kit'

export function SheetHost() {
  const sheets = useUI(s => s.sheets)
  const closeSheet = useUI(s => s.closeSheet)
  const insets = useSafeAreaInsets()
  const top = sheets[sheets.length - 1]
  const close = () => { if (top && !top.locked) closeSheet(top.id) }
  return (
    <Modal visible={!!top} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bgEl }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {top ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 8 }}>
              <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: C.surface3 }} />
            </View>
            {!top.locked ? (
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Fechar"
                style={{ position: 'absolute', right: 14, top: 14, zIndex: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={18} color={C.label2} />
              </Pressable>
            ) : null}
            {top.list ? (
              <View key={top.id} style={{ flex: 1, paddingTop: 14, paddingBottom: insets.bottom }}>{top.render(() => closeSheet(top.id))}</View>
            ) : (
              <ScrollView key={top.id} keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: PAD, paddingTop: 18, paddingBottom: insets.bottom + 28 }}>
                {top.render(() => closeSheet(top.id))}
              </ScrollView>
            )}
          </>
        ) : null}
      </KeyboardAvoidingView>
      <Toast />
    </Modal>
  )
}

export function Toast() {
  const msg = useUI(s => s.toastMsg)
  const insets = useSafeAreaInsets()
  if (!msg) return null
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: PAD, right: PAD, bottom: insets.bottom + 90, alignItems: 'center' }}>
      <View style={{ backgroundColor: C.surface3, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, maxWidth: 420 }}>
        <Text style={{ color: C.label, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{msg}</Text>
      </View>
    </View>
  )
}

const clock = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

/** Barra fixa acima das abas: descanso entre séries, ou o tempo de uma série por tempo. */
export function TimerBar() {
  const timer = useUI(s => s.timer)
  const work = useUI(s => s.work)
  const { addRest, stopRest, restDone, finishWorkEarly, stopWork, workDone } = useUI.getState()
  const acc = useAccent()
  const [now, setNow] = useState(Date.now())
  const on = work || timer
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [on])
  const left = on ? (on.endsAt - now) / 1000 : 0
  useEffect(() => {
    if (!on || left > 0) return
    if (work) workDone(); else restDone()
  }, [on, left > 0])
  if (!on || left <= 0) return null
  const pct = Math.min(1, Math.max(0, left / on.total))
  const color = work ? C.orange : acc

  return (
    <View style={{ marginHorizontal: 10, marginBottom: 6, backgroundColor: C.surface2, borderRadius: R.lg, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, backgroundColor: alpha(color, 0.18) }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.label2, fontSize: 12 }} numberOfLines={1}>{work ? work.label || 'Série' : 'Descanso'}</Text>
          <Text style={{ color: C.label, fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{clock(left)}</Text>
        </View>
        {work ? (
          <>
            <SmallBtn label="Cancelar" onPress={stopWork} />
            <SmallBtn label="Feito" onPress={finishWorkEarly} color={color} />
          </>
        ) : (
          <>
            <SmallBtn label="-15s" onPress={() => addRest(-15)} />
            <SmallBtn label="+15s" onPress={() => addRest(15)} />
            <SmallBtn label="Pular" onPress={stopRest} color={color} />
          </>
        )}
      </View>
    </View>
  )
}

function SmallBtn({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, marginLeft: 6, backgroundColor: color || 'rgba(255,255,255,0.08)', opacity: pressed ? 0.7 : 1 })}>
      <Text style={{ color: color ? '#000' : C.label, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  )
}
