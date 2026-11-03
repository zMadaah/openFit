// Folhas compartilhadas: confirmação, peso corporal e meta. Portado de openGym/frontend/src/sheets.jsx.
import Slider from '@react-native-community/slider'
import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { fmtDate, fmtNum, todayISO } from '../core/format'
import { lastBW } from '../core/history'
import { nav } from '../nav'
import { S, update, useStore } from '../store/useStore'
import { openSheet, toast } from '../store/useUI'
import { Icon } from '../ui/icons'
import { Button, Chip, Gap, H2, Muted, RowV, useAccent } from '../ui/kit'
import { C } from '../ui/theme'

/** Substitui o ConfirmDialog do openGym pelo alerta nativo do iOS. */
export function confirmSheet({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger, onConfirm }: {
  title?: string; message?: string; confirmText?: string; cancelText?: string; danger?: boolean; onConfirm?: () => void
}) {
  Alert.alert(title || '', message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: danger ? 'destructive' : 'default', onPress: onConfirm },
  ])
}

/* ---------------- seletor de peso (corporal e meta) ---------------- */
const W_LO = 1
const wHi = (unit: string) => (unit === 'lb' ? 660 : 300)

export function WeightInput({ value, setValue, unit }: { value: number; setValue: (v: number) => void; unit: string }) {
  const hi = wHi(unit)
  const acc = useAccent()
  const clamp = (x: number) => Math.max(W_LO, Math.min(hi, Math.round((x || 0) * 10) / 10))
  const on = (v: number) => setValue(clamp(v))
  return (
    <View style={{ marginVertical: 14 }}>
      <RowV style={{ justifyContent: 'center', gap: 22 }}>
        <PM icon="minus" onPress={() => on(value - 0.1)} />
        <Text style={{ color: C.label, fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {fmtNum(value)}<Text style={{ fontSize: 18, color: C.label2 }}> {unit}</Text>
        </Text>
        <PM icon="plus" onPress={() => on(value + 0.1)} />
      </RowV>
      <RowV style={{ justifyContent: 'center', gap: 8, marginVertical: 10 }}>
        {[-1, -0.5, 0.5, 1].map(d => <Chip key={d} label={(d > 0 ? '+' : '−') + fmtNum(Math.abs(d))} onPress={() => on(value + d)} />)}
      </RowV>
      <Slider value={Math.max(W_LO, Math.min(hi, value))} minimumValue={W_LO} maximumValue={hi} step={0.5}
        onValueChange={on} minimumTrackTintColor={acc} maximumTrackTintColor={C.surface3} />
    </View>
  )
}
function PM({ icon, onPress }: { icon: 'minus' | 'plus'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={22} color={C.label} />
    </Pressable>
  )
}

/* ---------------- peso corporal ---------------- */
function BwSheet({ required, onDone, close }: { required?: boolean; onDone?: (w: number | null) => void; close: () => void }) {
  const st = useStore(s => s.S)
  const bw = lastBW(st)
  const [v, setV] = useState<number>(bw ? bw.w : st.unit === 'lb' ? 160 : 70)
  const save = () => {
    const n = Math.round((v || 0) * 10) / 10
    if (!n || n <= 0) { toast('Informe um peso válido'); return }
    update(s => {
      const iso = todayISO()
      const ex = s.bodyweight.find(b => b.d === iso)
      if (ex) { ex.w = n; ex.t = Date.now() } else s.bodyweight.push({ d: iso, w: n, t: Date.now() })
      s.bodyweight.sort((a, b) => (a.d < b.d ? -1 : 1))
    })
    close()
    if (onDone) onDone(n); else toast('Peso salvo')
  }
  const recent = [...st.bodyweight].reverse().slice(0, 3)
  return (
    <>
      <H2>{required ? 'Check-in rápido' : 'Registrar peso corporal'}</H2>
      <Muted>{required ? 'Ajuste seu peso: ele é pedido antes de cada treino para a curva ficar honesta.' : 'Hoje, ' + fmtDate(todayISO(), true)}</Muted>
      <WeightInput value={v} setValue={setV} unit={st.unit} />
      <Button variant="primary" title={required ? 'Salvar e começar o treino' : 'Salvar'} onPress={save} />
      {required ? (
        <>
          <Gap />
          <Button variant="ghost" title="Começar sem pesar" onPress={() => { close(); onDone?.(null) }} color={C.label2} />
          <Button variant="ghost" icon="restore" title="Escolher outro treino" onPress={() => { close(); nav('/workout') }} color={C.label2} />
        </>
      ) : recent.length ? (
        <>
          <Text style={{ color: C.label2, fontSize: 13, fontWeight: '600', marginTop: 20, marginBottom: 6 }}>PESAGENS RECENTES</Text>
          {recent.map(b => (
            <RowV key={b.d} style={{ justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: C.sep }}>
              <Muted>{fmtDate(b.d, true)}</Muted>
              <RowV style={{ gap: 12 }}>
                <Text style={{ color: C.label, fontWeight: '700' }}>{fmtNum(b.w)} {st.unit}</Text>
                <Pressable onPress={() => update(s => { s.bodyweight = s.bodyweight.filter(x => x.d !== b.d) })} hitSlop={8} accessibilityLabel="Apagar">
                  <Icon name="trash-can-outline" size={19} color={C.red} />
                </Pressable>
              </RowV>
            </RowV>
          ))}
        </>
      ) : null}
    </>
  )
}
export const bwSheet = (opts: { required?: boolean; onDone?: (w: number | null) => void } = {}) =>
  openSheet(close => <BwSheet {...opts} close={close} />, { locked: !!opts.required })

/* ---------------- meta de peso ---------------- */
export function bwDeltaColor(delta: number, currentW: number) {
  if (!delta) return C.label2
  const target = S().targetW
  if (!target) return C.label
  return (delta > 0) === (target > currentW) ? C.green : C.red
}

function GoalSheet({ close }: { close: () => void }) {
  const st = S()
  const bw = lastBW(st)
  const [v, setV] = useState<number>(st.targetW || (bw ? bw.w : 70))
  return (
    <>
      <H2>Meta de peso</H2>
      <Muted>A meta aparece como uma linha nos gráficos de peso, e as variações ficam verdes quando vão na direção dela.</Muted>
      <WeightInput value={v} setValue={setV} unit={st.unit} />
      <Button variant="primary" title="Salvar meta" onPress={() => {
        const n = Math.round((v || 0) * 10) / 10
        if (!n || n <= 0) { toast('Informe um peso válido'); return }
        update(s => { s.targetW = n }); close()
        const b = lastBW(S())
        toast(`Meta: ${fmtNum(n)} ${st.unit}` + (b ? ` (faltam ${fmtNum(Math.abs(n - b.w))})` : ''))
      }} />
      {st.targetW ? <><Gap /><Button variant="danger" title="Remover meta" onPress={() => { update(s => { s.targetW = null }); close(); toast('Meta removida') }} /></> : null}
    </>
  )
}
export const goalSheet = () => openSheet(close => <GoalSheet close={close} />)
