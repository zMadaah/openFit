// Treino: escolher o que treinar e o treino em andamento (séries, supersets, séries por tempo,
// esforço RIR/RPE). Portado de openGym/frontend/src/views/Workout.jsx.
import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { exOr } from '../core/exercises'
import { DAYN, capitalize, exCount, fmtDate, fmtNum, todayISO } from '../core/format'
import {
  EFFORT, bestWeightFor, buildSets, capEffort, effectiveRoutine, effortOf, lastEntryFor, modeOf, setLabel,
  setsDoneActive, stepEffort, supersetUnits, unitOf,
} from '../core/history'
import { t } from '../core/i18n'
import { tap } from '../core/native'
import { applyPrescription, nextPrescription } from '../core/progression'
import { nav } from '../nav'
import { confirmSheet } from '../sheets/common'
import { exConfigSheet, exerciseDetailSheet, exercisePicker } from '../sheets/exercise'
import { finishWorkout, startFlow, topWeightSheet, workoutCompleteSheet } from '../sheets/workout'
import { S, update, useStore, type Entry } from '../store/useStore'
import { toast, useUI } from '../store/useUI'
import { Icon, glyphIcon } from '../ui/icons'
import { Big, Button, Card, Dim, Empty, Gap, H2, Header, IconBtn, IconTile, Item, List, Muted, NumberField, RowV, SecTitle, Tag, useAccent } from '../ui/kit'
import { C, PAD, alpha } from '../ui/theme'
import { ExerciseMedia } from '../ui/media'

export function Workout() {
  const active = useStore(s => !!s.S.active)
  return active ? <ActiveWorkout /> : <StartChooser />
}

/* ---------------- sem treino ativo ---------------- */

function StartChooser() {
  const S = useStore(s => s.S)
  const todayR = effectiveRoutine(S, todayISO())
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  const others = S.routines.filter(r => r !== todayR)
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="Começar treino" sub={`${t(DAYN[new Date().getDay()])}: ${todayR ? 'hoje é ' + todayR.name : 'dia de descanso, mas ninguém te impede'}`} />
      {todayR ? (
        <Card accent={C.green}>
          <Text style={{ color: C.green, fontWeight: '700', marginBottom: 6 }}>Plano de hoje{todayOvr ? ' · remarcado' : ''}</Text>
          <RowV style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1 }}><Big style={{ fontSize: 24 }}>{todayR.name}</Big><Muted>{exCount(todayR.ex.length)}</Muted></View>
            <IconTile name={glyphIcon(todayR.emoji)} size={40} />
          </RowV>
          <Button variant="primary" icon="play" title={`Começar ${todayR.name}`} onPress={() => startFlow(todayR.id)} />
        </Card>
      ) : null}
      {others.length ? (
        <View style={{ paddingHorizontal: PAD }}>
          <SecTitle>Outras rotinas</SecTitle>
          <List>
            {others.map(r => <Item key={r.id} left={<IconTile name={glyphIcon(r.emoji)} />} title={r.name} subtitle={exCount(r.ex.length)} onPress={() => startFlow(r.id)} right={<Tag label="Começar" accent />} />)}
          </List>
        </View>
      ) : null}
      <View style={{ paddingHorizontal: PAD, marginTop: 14 }}>
        <Button icon="shuffle-variant" title="Treino livre (escolha na hora)" onPress={() => startFlow(null)} />
        {!S.routines.length ? <><Gap h={10} /><Button variant="primary" title="Montar um plano primeiro" onPress={() => nav('/plan')} /></> : null}
      </View>
    </ScrollView>
  )
}

/* ---------------- relógio ---------------- */

function Elapsed({ start }: { start: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv) }, [])
  const s = Math.max(0, Math.floor((now - start) / 1000))
  return <Text>{Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')}</Text>
}

/* ---------------- um exercício ---------------- */

type Col = { f: string; step: number; dec: boolean; hd: string; eff?: string; opt?: boolean }

function ExerciseBlock({ entryIdx, compact, onToggle, onField, onAddSet, onRemoveSet, onStartTimed }: {
  entryIdx: number; compact?: boolean; onToggle: (i: number) => void; onField: (i: number, f: string, v: number | null) => void
  onAddSet: () => void; onRemoveSet: () => void; onStartTimed: (i: number) => void
}) {
  const st = useStore(s => s.S)
  const working = useUI(s => !!s.work)
  const acc = useAccent()
  const entry = st.active!.entries[entryIdx]
  const ex = exOr(entry.id)
  const mode = modeOf({ ...(entry.target || {}), id: entry.id })
  const cardio = mode === 'cardio', timed = mode === 'time'
  const last = lastEntryFor(st, entry.id)
  const best = cardio ? 0 : Math.max(bestWeightFor(st, entry.id), st.exWeights[entry.id]?.w || 0)
  const plan = entry.plan
  const col1: Col = cardio ? { f: 'min', step: 1, dec: false, hd: 'Minutos' } : timed ? { f: 'sec', step: 5, dec: false, hd: 'Segundos' } : { f: 'w', step: 2.5, dec: true, hd: `Carga (${st.unit})` }
  const col2: Col = cardio ? { f: 'speed', step: 0.5, dec: true, hd: 'km/h' } : timed ? { f: 'w', step: 2.5, dec: true, hd: `Carga (${st.unit})` } : { f: 'r', step: 1, dec: false, hd: 'Reps' }
  const kind = effortOf(st)
  const eff = (EFFORT as any)[kind]
  const col3: Col | null = mode === 'reps' && eff ? { f: eff.f, step: eff.step, dec: true, hd: eff.hd, eff: kind, opt: true } : null
  const bump = (s: any, i: number, col: Col, dir: number) => {
    if (col.eff) return onField(i, col.f, stepEffort(col.eff, s[col.f], dir))
    onField(i, col.f, Math.max(0, Math.round(((s[col.f] || 0) + dir * col.step) * 100) / 100))
  }
  const cell = (s: any, i: number, col: Col) => (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: s.done ? 'transparent' : C.surface2, borderRadius: 9 }}>
      <Pressable onPress={() => bump(s, i, col, -1)} hitSlop={3} style={{ width: 28, height: 38, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`Diminuir ${col.hd}`}>
        <Icon name="minus" size={15} color={C.label2} />
      </Pressable>
      <NumberField value={s[col.f]} decimal={col.dec} nullable={col.opt}
        onChange={v => onField(i, col.f, col.eff ? capEffort(col.eff, v) : v)}
        style={{ flex: 1, backgroundColor: 'transparent', paddingHorizontal: 0, fontSize: 16 }} />
      <Pressable onPress={() => bump(s, i, col, 1)} hitSlop={3} style={{ width: 28, height: 38, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`Aumentar ${col.hd}`}>
        <Icon name="plus" size={15} color={C.label2} />
      </Pressable>
    </View>
  )
  return (
    <View>
      {!ex.missing ? <ExerciseMedia key={ex.id} ex={ex} compact={compact} minimizable /> : null}
      <RowV style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: C.label, fontSize: compact ? 18 : 22, fontWeight: '800', flex: 1 }} numberOfLines={2}>{capitalize(ex.n)}</Text>
        <IconBtn name="information-outline" label="Detalhes" onPress={() => exerciseDetailSheet(ex)} />
      </RowV>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {cardio ? <Tag icon="run" label="Cardio" accent /> : null}
        {ex.tg || ex.bp ? <Tag label={capitalize(t(ex.tg || ex.bp))} /> : null}
        {ex.eq ? <Tag label={capitalize(t(ex.eq))} /> : null}
        {best > 0 ? <Tag label={`Melhor: ${fmtNum(best)} ${st.unit}`} /> : null}
      </View>
      {last ? <Dim style={{ marginBottom: 4 }}>Última vez ({fmtDate(last.d)}): {last.sets.map((s: any) => setLabel(entry.id, s, last.target)).join(', ')}</Dim> : null}
      {plan?.why && plan.kind !== 'off' ? (
        <RowV style={{ gap: 6, alignItems: 'flex-start', backgroundColor: alpha(plan.kind === 'deload' ? C.orange : acc, 0.13), borderRadius: 9, padding: 8, marginTop: 4 }}>
          <Icon name={plan.kind === 'up' ? 'arrow-up' : plan.kind === 'deload' ? 'arrow-down' : 'lightbulb-outline'} size={16} color={plan.kind === 'deload' ? C.orange : acc} />
          <Text style={{ color: plan.kind === 'deload' ? C.orange : acc, fontSize: 14, flex: 1 }}>{t(...(plan.why as [string, ...any[]]))}</Text>
        </RowV>
      ) : null}
      <View style={{ backgroundColor: C.bgEl, borderRadius: 14, padding: 8, marginTop: 10 }}>
        <RowV style={{ gap: 6, paddingHorizontal: 2, marginBottom: 2 }}>
          <Text style={{ width: 20 }} />
          <Dim style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>{col1.hd}</Dim>
          <Dim style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>{col2.hd}</Dim>
          {col3 ? <Dim style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>{col3.hd}</Dim> : null}
          {timed ? <View style={{ width: 34 }} /> : null}
          <View style={{ width: 40 }} />
        </RowV>
        {entry.sets.map((s, i) => (
          <RowV key={i} style={{ gap: 6, paddingVertical: 4, paddingHorizontal: 2, borderRadius: 10, backgroundColor: s.done ? alpha(acc, 0.12) : 'transparent' }}>
            <Text style={{ width: 20, color: C.label2, fontWeight: '700', textAlign: 'center' }}>{i + 1}</Text>
            {cell(s, i, col1)}
            {cell(s, i, col2)}
            {col3 ? cell(s, i, col3) : null}
            {timed ? (
              <Pressable onPress={() => onStartTimed(i)} disabled={s.done || working} accessibilityLabel="Começar série"
                style={{ width: 34, height: 36, borderRadius: 8, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', opacity: s.done || working ? 0.3 : 1 }}>
                <Icon name="play" size={18} color="#000" />
              </Pressable>
            ) : null}
            <Pressable onPress={() => onToggle(i)} hitSlop={6} accessibilityRole="checkbox" accessibilityState={{ checked: s.done }} accessibilityLabel={`Série ${i + 1} feita`}
              style={{ width: 40, height: 36, borderRadius: 9, backgroundColor: s.done ? acc : C.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={20} color={s.done ? '#000' : C.label3} />
            </Pressable>
          </RowV>
        ))}
        <RowV style={{ gap: 8, marginTop: 8 }}>
          <Button size="sm" icon="minus" title="Remover série" disabled={entry.sets.length <= 1} onPress={onRemoveSet} style={{ flex: 1 }} />
          <Button size="sm" icon="plus" title="Adicionar série" onPress={onAddSet} style={{ flex: 1 }} />
        </RowV>
      </View>
    </View>
  )
}

/* ---------------- treino em andamento ---------------- */

function ActiveWorkout() {
  const st = useStore(s => s.S)
  const acc = useAccent()
  const A = st.active!
  const units = supersetUnits(A.entries)
  const cur = Math.min(A.cur, Math.max(0, A.entries.length - 1))
  const unit: number[] = A.entries.length ? unitOf(units, cur) : []
  const unitIdx = units.findIndex((u: number[]) => u === unit)
  const isSuperset = unit.length > 1
  const total = A.entries.reduce((n, e) => n + e.sets.length, 0)
  const done = setsDoneActive(A)

  const mutEntry = (idx: number, fn: (e: Entry) => void) => update(s => { fn(s.active!.entries[idx]) })
  // Campo opcional apagado sai da série em vez de virar null.
  const setField = (idx: number, i: number, f: string, v: number | null) => mutEntry(idx, e => { if (v == null) delete (e.sets[i] as any)[f]; else (e.sets[i] as any)[f] = v })
  const modeAt = (idx: number) => modeOf({ ...(A.entries[idx].target || {}), id: A.entries[idx].id })
  const addSet = (idx: number) => mutEntry(idx, e => {
    const l: any = e.sets[e.sets.length - 1]
    const m = modeOf({ ...(e.target || {}), id: e.id })
    if (m === 'cardio') e.sets.push({ min: l ? l.min : e.target?.min || 20, speed: l ? l.speed : e.target?.speed || 8, done: false })
    else if (m === 'time') e.sets.push({ sec: l ? l.sec : e.target?.sec || 45, w: l ? l.w || 0 : e.target?.weight || 0, done: false })
    else e.sets.push({ w: l ? l.w : 0, r: l ? l.r : e.target?.reps, done: false })
  })
  const removeSet = (idx: number) => mutEntry(idx, e => { if (e.sets.length > 1) e.sets.pop() })

  const toggle = (idx: number, i: number) => {
    const m = modeAt(idx)
    const isLastUnit = unitIdx >= units.length - 1
    let askTop = false, exJustDone = false, workoutDone = false
    const { startRest, stopRest } = useUI.getState()
    mutEntry(idx, e => {
      e.sets[i].done = !e.sets[i].done
      if (e.sets[i].done) {
        tap()
        const isLastExInUnit = idx === unit[unit.length - 1]
        const unitDone = unit.every(ui => (ui === idx ? e : A.entries[ui]).sets.every(x => x.done))
        if (isLastExInUnit && !unitDone) startRest(st.restSec)
        else if (unitDone) stopRest()
        if (unitDone && isLastUnit) workoutDone = true
        // Só treino de repetições tem "carga de trabalho" a confirmar.
        if (e.sets.every(x => x.done)) { exJustDone = true; if (m === 'reps' && !e.asked) { e.asked = true; askTop = true } }
      }
    })
    if (askTop) topWeightSheet(idx)
    else if (workoutDone) workoutCompleteSheet()
    else if (exJustDone && m === 'cardio') toast('Cardio registrado')
    else if (exJustDone && m === 'time') toast('Série por tempo registrada')
  }

  // Série por tempo: o cronômetro registra o tempo realmente segurado e marca a série.
  const startTimed = (idx: number, i: number) => {
    const e = A.entries[idx]
    useUI.getState().startWork(e.sets[i].sec || 45, capitalize(exOr(e.id).n), elapsed => {
      mutEntry(idx, en => { en.sets[i].sec = elapsed })
      if (!S().active?.entries[idx]?.sets[i]?.done) toggle(idx, i)
    })
  }

  const block = (idx: number, compact?: boolean) => (
    <ExerciseBlock key={idx} entryIdx={idx} compact={compact}
      onToggle={i => toggle(idx, i)} onField={(i, f, v) => setField(idx, i, f, v)}
      onAddSet={() => addSet(idx)} onRemoveSet={() => removeSet(idx)} onStartTimed={i => startTimed(idx, i)} />
  )
  const exDone = A.entries.filter(e => e.sets.length && e.sets.every(s => s.done)).length
  const allDone = A.entries.length > 0 && exDone === A.entries.length

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <RowV style={{ paddingHorizontal: PAD, paddingTop: 6, paddingBottom: 8, justifyContent: 'space-between' }}>
        <IconBtn name="close" label="Descartar" onPress={() => confirmSheet({
          title: 'Descartar treino?', message: 'As séries registradas nesta sessão serão perdidas.', confirmText: 'Descartar', danger: true,
          onConfirm: () => { update(s => { s.active = null }); useUI.getState().stopRest(); useUI.getState().stopWork(); nav('/home') },
        })} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: C.label, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{A.name}</Text>
          <Text style={{ color: C.label2, fontSize: 13 }}><Elapsed start={A.start} /> · {done}/{total} séries</Text>
        </View>
        <IconBtn name="check" color={acc} label="Finalizar" onPress={finishWorkout} />
      </RowV>
      <View style={{ height: 4, backgroundColor: C.surface2, marginHorizontal: PAD, borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
        <View style={{ height: 4, width: `${total ? (done / total) * 100 : 0}%`, backgroundColor: acc }} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 40 }}>
        {A.entries.length ? (
          <>
            <Muted style={{ fontSize: 14, marginBottom: 6 }}>{isSuperset ? `Superset ${unitIdx + 1} / ${units.length}` : `Exercício ${unitIdx + 1} / ${units.length}`}</Muted>
            {isSuperset ? (
              <View style={{ borderWidth: 1, borderColor: alpha(acc, 0.5), borderRadius: 16, padding: 10 }}>
                <RowV style={{ gap: 5, marginBottom: 8 }}><Icon name="link-variant" size={14} color={acc} /><Text style={{ color: acc, fontSize: 13, fontWeight: '600' }}>Superset: um seguido do outro, descanse depois dos dois</Text></RowV>
                {unit.map((idx, k) => (
                  <View key={idx}>
                    {k > 0 ? <Text style={{ color: acc, textAlign: 'center', fontSize: 20, fontWeight: '800', marginVertical: 6 }}>+</Text> : null}
                    {block(idx, true)}
                  </View>
                ))}
              </View>
            ) : block(cur)}
          </>
        ) : <Empty icon="shuffle-variant">Treino livre: adicione o primeiro exercício.</Empty>}

        <RowV style={{ gap: 8, marginTop: 12 }}>
          <Button icon="chevron-left" title="Anterior" style={{ flex: 1 }} disabled={unitIdx <= 0} onPress={() => update(s => { s.active!.cur = units[unitIdx - 1][0] })} />
          <Button trailingIcon="chevron-right" title="Próximo" style={{ flex: 1 }} disabled={unitIdx < 0 || unitIdx >= units.length - 1} onPress={() => update(s => { s.active!.cur = units[unitIdx + 1][0] })} />
        </RowV>
        <Gap h={10} />
        <Button icon="plus" title="Adicionar exercício" onPress={() => exercisePicker(ex => exConfigSheet(ex, null, cfg => update(s => {
          const full = { ...cfg, id: ex.id }
          const plan = nextPrescription(s, full, s.routines.find(r => r.id === s.active!.routineId))
          s.active!.entries.push({ id: ex.id, target: { ...cfg }, plan, sets: applyPrescription(buildSets(s, full), plan) })
          s.active!.cur = s.active!.entries.length - 1
        }), null, S().routines.find(r => r.id === A.routineId)))} />
        <Gap h={10} />
        <Button variant={allDone ? 'primary' : 'ghost'} color={allDone ? undefined : C.label2} onPress={finishWorkout}
          title={allDone ? 'Finalizar treino' : `Finalizar antes · ${exDone}/${A.entries.length} exercícios`} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
