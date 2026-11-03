// Início: o que fazer agora e um resumo rápido. Portado de openGym/frontend/src/views/Home.jsx.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { DAYS, capitalize, fmtDate, fmtNum, isoOf, todayISO, weekKey } from '../core/format'
import { effectiveRoutine, effectiveRoutineId, lastBW, streakWeeks } from '../core/history'
import { t } from '../core/i18n'
import { nav } from '../nav'
import { bwDeltaColor, bwSheet, goalSheet } from '../sheets/common'
import { dayOverrideSheet, loadStarterPlan } from '../sheets/plan'
import { calendarSheet, startFlow } from '../sheets/workout'
import { useStore } from '../store/useStore'
import { LineChart } from '../ui/charts'
import { Icon, glyphIcon } from '../ui/icons'
import { Big, Button, Card, Dim, Gap, H2, Header, IconBtn, IconTile, Muted, RowV, Screen, Tag, useAccent } from '../ui/kit'
import { C } from '../ui/theme'

export function Home() {
  const S = useStore(s => s.S)
  const acc = useAccent()
  const [weekOffset, setWeekOffset] = useState(0)
  const today = new Date()
  const iso = todayISO()
  const routine = effectiveRoutine(S, iso)
  const todayOvr = S.dayPlan[iso] !== undefined
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null

  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
  const doneDays = new Set(S.workouts.map(w => w.d))
  const strip = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const di = isoOf(d)
    const eff = effectiveRoutineId(S, di), ovr = S.dayPlan[di] !== undefined, done = doneDays.has(di)
    const dot = done ? acc : ovr && eff ? C.orange : eff ? C.label3 : 'transparent'
    const isToday = di === iso
    strip.push(
      <Pressable key={i} onPress={() => dayOverrideSheet(di)} style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10, backgroundColor: isToday ? C.surface2 : 'transparent' }}>
        <Text style={{ color: C.label3, fontSize: 12, fontWeight: '600' }}>{t(DAYS[d.getDay()])}</Text>
        <Text style={{ color: isToday ? acc : C.label, fontSize: 17, fontWeight: '700', marginTop: 2 }}>{d.getDate()}</Text>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot, marginTop: 4 }} />
      </Pressable>,
    )
  }
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const mon = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' })
  const wkLabel = weekOffset === 0 ? 'Esta semana' : `${monday.getDate()} ${mon(monday)} a ${sunday.getDate()} ${mon(sunday)}`
  const wThisWeek = S.workouts.filter(w => weekKey(w.d) === weekKey(iso)).length
  const plannedPerWeek = Object.keys(S.week).filter(k => S.week[k]).length
  const bwPoints = S.bodyweight.slice(-30).map(b => ({ t: b.t || new Date(b.d + 'T12:00:00').getTime(), y: b.w, d: b.d }))
  const onToday = () => { if (S.active) nav('/workout'); else if (routine) startFlow(routine.id); else dayOverrideSheet(iso) }

  return (
    <Screen header={
      <Header title="openGym" sub={capitalize(today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}
        right={<IconBtn name="cog" label="Ajustes" onPress={() => nav('/settings')} />} />
    }>
      <Card>
        <RowV style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <IconBtn name="chevron-left" label="Semana anterior" size={18} onPress={() => setWeekOffset(w => w - 1)} />
          <Muted style={{ fontWeight: '600', fontSize: 14 }}>{wkLabel}</Muted>
          <IconBtn name="chevron-right" label="Próxima semana" size={18} onPress={() => setWeekOffset(w => w + 1)} />
        </RowV>
        <RowV>{strip}</RowV>
        <Pressable onPress={onToday} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: C.sep, opacity: pressed ? 0.7 : 1 })}>
          <IconTile name={S.active ? 'timer-outline' : routine ? glyphIcon(routine.emoji) : 'weather-night'} bg={S.active ? C.orange : routine ? undefined : C.surface3} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Dim>Hoje</Dim>
            <Text style={{ color: C.label, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
              {S.active ? `${S.active.name}: em andamento` : routine ? routine.name : 'Dia de descanso'}{todayOvr && routine ? ' · remarcado' : ''}
            </Text>
          </View>
          {S.active ? <Tag label="Continuar" color={C.orange} /> : routine ? <Tag label="Começar" accent /> : <Icon name="plus" size={20} color={C.label3} />}
        </Pressable>
      </Card>

      {!S.routines.length && !S.active ? (
        <Card>
          <RowV style={{ gap: 10, marginBottom: 6 }}>
            <IconTile name="star-four-points" />
            <Big style={{ fontSize: 22 }}>Bem-vindo!</Big>
          </RowV>
          <Muted style={{ marginBottom: 12 }}>Monte sua rotina semanal para começar, ou carregue um plano pronto Push / Pull / Legs.</Muted>
          <Button variant="primary" icon="star-four-points" title="Carregar plano inicial (PPL)" onPress={loadStarterPlan} />
          <Gap />
          <Button title="Montar meu plano" onPress={() => nav('/plan')} />
        </Card>
      ) : null}

      <Card>
        <RowV style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <H2 style={{ marginBottom: 0 }}>Peso corporal</H2>
          <RowV style={{ gap: 8 }}>
            <Button size="sm" icon="target" title={S.targetW ? fmtNum(S.targetW) : 'Meta'} color={S.targetW ? C.yellow : undefined} onPress={goalSheet} />
            <Button size="sm" icon="plus" title="Registrar" onPress={() => bwSheet()} />
          </RowV>
        </RowV>
        {bw ? (
          <>
            <RowV style={{ gap: 8, alignItems: 'baseline' }}>
              <Big>{fmtNum(bw.w)} <Text style={{ fontSize: 16, color: C.label2 }}>{S.unit}</Text></Big>
              {delta ? (
                <RowV>
                  <Icon name={delta > 0 ? 'arrow-up' : 'arrow-down'} size={13} color={bwDeltaColor(delta, bw.w)} />
                  <Text style={{ color: bwDeltaColor(delta, bw.w), fontWeight: '600' }}>{fmtNum(Math.abs(delta))}</Text>
                </RowV>
              ) : null}
              <Dim style={{ marginLeft: 'auto' }}>{fmtDate(bw.d, true)}</Dim>
            </RowV>
            {S.targetW ? (
              <RowV style={{ gap: 5, marginTop: 4 }}>
                <Icon name="target" size={13} color={C.yellow} />
                <Text style={{ color: C.yellow, fontSize: 14 }}>
                  Meta {fmtNum(S.targetW)} {S.unit} · {Math.abs(S.targetW - bw.w) < 0.05 ? 'alcançada!' : `${S.targetW > bw.w ? 'ganhar' : 'perder'} ${fmtNum(Math.abs(S.targetW - bw.w))} ${S.unit}`}
                </Text>
              </RowV>
            ) : null}
            <View style={{ marginTop: 8 }}><LineChart points={bwPoints} h={130} unit={S.unit} goal={S.targetW} /></View>
          </>
        ) : <Muted>Nenhum registro ainda: anote seu peso para começar a curva. Ele também é pedido antes de cada treino.</Muted>}
      </Card>

      <Card onPress={() => calendarSheet()}>
        <RowV style={{ justifyContent: 'space-between' }}>
          <View>
            <RowV style={{ gap: 7 }}>
              <Icon name="fire" size={22} color={C.orange} />
              <Text style={{ color: C.label, fontSize: 22, fontWeight: '700' }}>{streakWeeks(S)} {streakWeeks(S) === 1 ? 'semana seguida' : 'semanas seguidas'}</Text>
            </RowV>
            <Muted style={{ marginTop: 2, fontSize: 14 }}>
              {wThisWeek}{plannedPerWeek ? ' / ' + plannedPerWeek : ''} nesta semana · {S.workouts.length} {S.workouts.length === 1 ? 'treino no total' : 'treinos no total'}
            </Muted>
          </View>
          <Icon name="calendar" size={22} color={C.label3} />
        </RowV>
      </Card>
    </Screen>
  )
}
