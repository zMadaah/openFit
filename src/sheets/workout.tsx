// Ciclo do treino (começar, confirmar carga, terminar), detalhe, calendário e importação de
// outros apps. Portado de openGym/frontend/src/sheets.jsx.
import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { EXIDX, exOr } from '../core/exercises'
import { capitalize, durPart, fmtDate, fmtDur, fmtNum, fmtVol, MONTHS_LONG, todayISO, uid } from '../core/format'
import {
  bestWeightFor, buildSets, effectiveRoutineId, effortOf, setLabel, setsDone, setsDoneActive,
  supersetUnits, unitOf, workoutVolume,
} from '../core/history'
import { t } from '../core/i18n'
import { mergeImport, parseImport } from '../core/import-csv'
import { loadOfWorkouts } from '../core/muscles'
import { is1RMRecord } from '../core/onerm'
import { applyPrescription, nextPrescription } from '../core/progression'
import { pickText, success } from '../core/native'
import { nav } from '../nav'
import { S, update, useStore, type Workout } from '../store/useStore'
import { openSheet, toast, useUI } from '../store/useUI'
import { BodyMap } from '../ui/charts'
import { Icon, glyphIcon } from '../ui/icons'
import { Button, Dim, Gap, H2, IconTile, Item, List, Muted, RowV, SecTitle, Tag, Thumb, Tiles, useAccent } from '../ui/kit'
import { C } from '../ui/theme'
import { WeightInput, bwSheet, confirmSheet } from './common'
import { dayOverrideSheet } from './plan'

/* ---------------- linha de treino (listas) ---------------- */

export function WorkoutRow({ w, onPress }: { w: Workout; onPress: () => void }) {
  const st = useStore(s => s.S)
  const r = st.routines.find(x => x.id === w.routineId)
  return (
    <Item onPress={onPress} chevron left={<IconTile name={glyphIcon(r?.emoji)} size={34} />} title={w.name}
      subtitle={[fmtDate(w.d, true), ...durPart((w.end || w.start) - w.start), `${setsDone(w)} séries`, fmtVol(w.vol || 0, st.unit)].join(' · ')}
      right={w.prs?.length ? <Tag icon="trophy" label={`${w.prs.length} PR`} color={C.yellow} /> : null} />
  )
}

/* ---------------- detalhe ---------------- */

function WorkoutDetail({ w, close }: { w: Workout; close: () => void }) {
  const st = useStore(s => s.S)
  const acc = useAccent()
  return (
    <>
      <H2 style={{ paddingRight: 36 }}>{w.name}</H2>
      <Muted style={{ marginBottom: 12 }}>
        {[fmtDate(w.d, true), ...durPart((w.end || w.start) - w.start), fmtVol(w.vol || 0, st.unit), ...(w.bw ? [fmtNum(w.bw) + ' ' + st.unit] : [])].join(' · ')}
      </Muted>
      {w.entries.map((e, i) => {
        const ex = EXIDX[e.id]
        return (
          <RowV key={i} style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            {ex ? <Thumb ex={ex} size={38} /> : null}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <RowV style={{ flexWrap: 'wrap', gap: 6 }}>
                <Text style={{ color: C.label, fontWeight: '700', fontSize: 15 }}>{capitalize(ex ? ex.n : e.n || e.id)}</Text>
                {w.prs?.includes(e.id) ? <Tag icon="trophy" label="PR" color={C.yellow} /> : null}
              </RowV>
              <Text style={{ color: C.label2, fontSize: 13, marginTop: 2 }}>
                {e.sets.filter(s => s.done).map(s => setLabel(e.id, s, e.target)).join('  ·  ') || 'sem séries'}
              </Text>
            </View>
          </RowV>
        )
      })}
      {w.note ? <Text style={{ color: acc, marginBottom: 12 }}>“{w.note}”</Text> : null}
      <Button variant="danger" title="Apagar treino" onPress={() => confirmSheet({
        title: 'Apagar treino?', message: 'Ele sai do seu histórico de vez.', confirmText: 'Apagar', danger: true,
        onConfirm: () => { update(s => { s.workouts = s.workouts.filter(x => x.id !== w.id) }); close(); toast('Treino apagado') },
      })} />
    </>
  )
}
export const workoutDetailSheet = (w: Workout) => openSheet(close => <WorkoutDetail w={w} close={close} />)

/* ---------------- calendário ---------------- */

function Calendar({ start, close }: { start?: string; close: () => void }) {
  const st = useStore(s => s.S)
  const acc = useAccent()
  const [cur, setCur] = useState(() => { const d = start ? new Date(start + 'T12:00:00') : new Date(); d.setDate(1); return d })
  const y = cur.getFullYear(), mo = cur.getMonth()
  const byDay: Record<string, Workout[]> = {}
  st.workouts.forEach(w => { (byDay[w.d] = byDay[w.d] || []).push(w) })
  const offset = (new Date(y, mo, 1).getDay() + 6) % 7
  const daysIn = new Date(y, mo + 1, 0).getDate()
  const prefix = y + '-' + String(mo + 1).padStart(2, '0')
  const monthWs = st.workouts.filter(w => w.d.startsWith(prefix))
  const monthVol = monthWs.reduce((a, w) => a + (w.vol || 0), 0)
  const monthMs = monthWs.reduce((a, w) => a + Math.max(0, (w.end || w.start) - w.start), 0)
  const cells: ReactNode[] = []
  for (let i = 0; i < offset; i++) cells.push(<View key={'e' + i} style={{ width: '14.28%', height: 46 }} />)
  for (let d = 1; d <= daysIn; d++) {
    const iso = prefix + '-' + String(d).padStart(2, '0')
    const ws = byDay[iso], effId = effectiveRoutineId(st, iso), ovr = st.dayPlan[iso] !== undefined
    const dot = ws ? acc : ovr && effId ? C.orange : effId ? C.label3 : 'transparent'
    const today = iso === todayISO()
    cells.push(
      <Pressable key={d} style={{ width: '14.28%', height: 46, alignItems: 'center', justifyContent: 'center' }}
        onPress={() => {
          close()
          if (!ws) dayOverrideSheet(iso)
          else if (ws.length === 1) workoutDetailSheet(ws[0])
          else openSheet(c2 => <><H2>{fmtDate(iso, true)}</H2><List>{ws.map(w => <WorkoutRow key={w.id} w={w} onPress={() => { c2(); workoutDetailSheet(w) }} />)}</List></>)
        }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: ws ? 'rgba(255,255,255,0.08)' : 'transparent', borderWidth: today ? 1.5 : 0, borderColor: acc }}>
          <Text style={{ color: C.label, fontWeight: ws ? '800' : '500' }}>{d}</Text>
        </View>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dot, marginTop: 2 }} />
      </Pressable>,
    )
  }
  return (
    <>
      <RowV style={{ justifyContent: 'space-between', marginBottom: 4, paddingRight: 36 }}>
        <Pressable onPress={() => setCur(new Date(y, mo - 1, 1))} hitSlop={10} accessibilityLabel="Mês anterior"><Icon name="chevron-left" size={28} color={C.label} /></Pressable>
        <H2 style={{ marginBottom: 0 }}>{t(MONTHS_LONG[mo])} {y}</H2>
        <Pressable onPress={() => setCur(new Date(y, mo + 1, 1))} hitSlop={10} accessibilityLabel="Próximo mês"><Icon name="chevron-right" size={28} color={C.label} /></Pressable>
      </RowV>
      <Muted style={{ textAlign: 'center', marginBottom: 10 }}>
        {monthWs.length ? `${monthWs.length} ${monthWs.length === 1 ? 'treino' : 'treinos'} · ${fmtDur(monthMs)} · ${fmtVol(monthVol, st.unit)}` : 'Nenhum treino neste mês'}
      </Muted>
      <View style={{ flexDirection: 'row' }}>
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => <Text key={i} style={{ width: '14.28%', textAlign: 'center', color: C.label3, fontSize: 12 }}>{l}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{cells}</View>
      <RowV style={{ justifyContent: 'center', gap: 14, marginTop: 8 }}>
        {[[acc, 'Treinado'], [C.label3, 'Planejado'], [C.orange, 'Remarcado']].map(([c, l]) => (
          <RowV key={l} style={{ gap: 5 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /><Dim>{l}</Dim></RowV>
        ))}
      </RowV>
      <Dim style={{ textAlign: 'center', marginTop: 10 }}>Toque num dia treinado para ver detalhes · em qualquer outro para planejar</Dim>
    </>
  )
}
export const calendarSheet = (start?: string) => openSheet(close => <Calendar start={start} close={close} />)

/* ---------------- começar ---------------- */

export function startFlow(routineId: string | null) {
  bwSheet({ required: true, onDone: bw => beginWorkout(routineId, bw) })
}

export function beginWorkout(routineId: string | null, bw: number | null) {
  const st = S()
  const r = routineId ? st.routines.find(x => x.id === routineId) : null
  // A prescrição entra quando o treino é montado: você chega na barra já com a carga certa na tela.
  const entries = (r ? r.ex : []).map(cfg => {
    const plan = nextPrescription(st, cfg, r)
    return { id: cfg.id, sg: cfg.sg, target: { ...cfg }, plan, sets: applyPrescription(buildSets(st, cfg), plan) }
  })
  update(s => {
    s.active = { id: uid(), d: todayISO(), start: Date.now(), routineId, name: r ? r.name : t('Freestyle'), bw: bw || null, cur: 0, entries }
  })
  useUI.getState().stopRest()
  nav('/workout')
}

/* ---------------- carga de trabalho (depois do último set do exercício) ---------------- */

function TopWeight({ entryIdx, close }: { entryIdx: number; close: () => void }) {
  const st = useStore(s => s.S)
  const A = st.active
  const entry = A ? A.entries[entryIdx] : null
  const ex = entry ? EXIDX[entry.id] : null
  const maxSet = entry ? Math.max(0, ...entry.sets.filter(s => s.done).map(s => s.w || 0)) : 0
  const prevBest = entry ? Math.max(st.exWeights[entry.id]?.w || 0, bestWeightFor(st, entry.id)) : 0
  const [v, setV] = useState<number>(entry ? Math.max(maxSet, prevBest) || entry.target?.weight || 0 : 0)
  useEffect(() => { if (!entry) close() }, [!entry])
  const units = supersetUnits(A ? A.entries : [])
  const unit = entry ? unitOf(units, entryIdx) : []
  const unitDone = !!entry && unit.every((i: number) => A!.entries[i].sets.every(s => s.done))
  const unitIdx = units.findIndex((u: number[]) => u === unit)
  const isLastUnit = unitIdx === units.length - 1
  if (!entry || !ex) return null

  const commit = (advance: boolean) => {
    const n = Math.round((v || 0) * 10) / 10
    if (!isFinite(n) || n < 0) { toast('Informe um peso válido'); return }
    update(s => {
      s.active!.entries[entryIdx].topW = n
      const cur = s.exWeights[entry.id]
      s.exWeights[entry.id] = { w: Math.max(n, cur ? cur.w : 0), d: todayISO() }
    })
    close()
    if (advance && unitDone) {
      if (isLastUnit) workoutCompleteSheet()
      else update(s => { s.active!.cur = units[unitIdx + 1][0] })
    } else toast(`Anotado: da próxima vez começa em ${fmtNum(S().exWeights[entry.id].w)} ${st.unit}`)
  }
  return (
    <>
      <RowV style={{ gap: 8, paddingRight: 36 }}>
        <Icon name="check-circle" size={24} color={C.green} />
        <H2 style={{ marginBottom: 0, flex: 1 }}>{capitalize(ex.n)}: feito</H2>
      </RowV>
      <Muted style={{ marginTop: 6 }}>
        Confirme a carga com que você trabalhou: a maior vira o padrão da próxima vez.{!unitDone && unit.length > 1 ? ' Depois termine o par do superset.' : ''}
      </Muted>
      <WeightInput value={v} setValue={setV} unit={st.unit} />
      {prevBest > 0 ? (
        <Dim style={{ textAlign: 'center', marginBottom: 12 }}>
          Melhor anterior: {fmtNum(prevBest)} {st.unit}{maxSet > prevBest ? <Text style={{ color: C.yellow }}>  ·  novo recorde!</Text> : null}
        </Dim>
      ) : null}
      {unitDone ? (
        <>
          <Button variant="primary" trailingIcon={isLastUnit ? undefined : 'chevron-right'} title={isLastUnit ? 'Salvar' : 'Salvar e próximo exercício'} onPress={() => commit(true)} />
          <Gap />
          <Button variant="ghost" title="Só fechar" color={C.label2} onPress={() => commit(false)} />
        </>
      ) : <Button variant="primary" title="Salvar carga" onPress={() => commit(false)} />}
    </>
  )
}
export const topWeightSheet = (entryIdx: number) => openSheet(close => <TopWeight entryIdx={entryIdx} close={close} />)

/* ---------------- fim ---------------- */

export const workoutCompleteSheet = () => openSheet(close => (
  <View style={{ alignItems: 'center', paddingTop: 10 }}>
    <Icon name="check-circle" size={52} color={C.green} />
    <H2 style={{ marginTop: 8 }}>Esse foi o treino inteiro!</H2>
    <Muted style={{ textAlign: 'center', marginBottom: 16 }}>Todos os exercícios feitos, bom trabalho. Finalize, ou continue e adicione outro exercício.</Muted>
    <Button variant="primary" icon="flag-checkered" title="Finalizar treino" style={{ alignSelf: 'stretch' }} onPress={() => { close(); finishWorkout() }} />
    <Gap />
    <Button title="Continuar treino" style={{ alignSelf: 'stretch' }} onPress={() => { close(); toast('Continue: toque em “+ Adicionar exercício”') }} />
  </View>
))

function FinishSummary({ w, prs, e1prs, close }: { w: Workout; prs: string[]; e1prs: any[]; close: () => void }) {
  const st = useStore(s => s.S)
  const acc = useAccent()
  return (
    <View style={{ paddingTop: 6 }}>
      <View style={{ alignItems: 'center' }}>
        <Icon name="trophy" size={50} color={acc} />
        <H2 style={{ marginTop: 8 }}>Treino concluído!</H2>
      </View>
      <Tiles items={[
        { label: 'Duração', value: fmtDur((w.end || w.start) - w.start) },
        { label: 'Volume', value: fmtVol(w.vol || 0, st.unit) },
        { label: 'Séries', value: setsDone(w) },
        { label: 'PRs', value: prs.length || '-' },
      ]} />
      {prs.map(id => <RowV key={id} style={{ gap: 5, marginBottom: 3 }}><Icon name="trophy" size={14} color={acc} /><Text style={{ color: acc }}>Novo PR: {capitalize(exOr(id).n)}</Text></RowV>)}
      {e1prs.map(p => <RowV key={p.id} style={{ gap: 5, marginBottom: 3 }}><Icon name="chart-line" size={14} color={acc} /><Text style={{ color: acc }}>Melhor 1RM estimado: {capitalize(exOr(p.id).n)} · {fmtNum(p.est)} {st.unit}</Text></RowV>)}
      <SecTitle>O que você treinou</SecTitle>
      <BodyMap load={loadOfWorkouts([w])} body={st.body} />
      <Gap h={14} />
      <Button variant="primary" title="Boa!" onPress={() => { close(); nav('/home') }} />
    </View>
  )
}

export function finishWorkout() {
  const A = S().active
  if (!A) return
  const done = setsDoneActive(A)
  const total = A.entries.reduce((n, e) => n + e.sets.length, 0)
  if (!done) { confirmSheet({ title: 'Nada registrado ainda', message: 'Você não marcou nenhuma série. Finalizar mesmo assim?', confirmText: 'Finalizar', onConfirm: doFinishWorkout }); return }
  if (done < total) {
    confirmSheet({ title: 'Finalizar antes?', message: `${total - done} ${total - done === 1 ? 'série ainda não marcada' : 'séries ainda não marcadas'}. Finalizar o treino agora?`, confirmText: 'Finalizar treino', onConfirm: doFinishWorkout })
    return
  }
  doFinishWorkout()
}

function doFinishWorkout() {
  const st = S()
  const A = st.active
  if (!A) return
  const prs: string[] = []
  const e1prs: any[] = []
  A.entries.forEach(e => {
    const mx = Math.max(0, ...e.sets.filter(s => s.done).map(s => s.w || 0))
    if (mx > 0 && mx > bestWeightFor(st, e.id)) prs.push(e.id)
    // 1RM estimado maior sem carga maior é outro tipo de progresso (mesma carga, mais reps).
    const rec = is1RMRecord(st, e.id, e)
    if (rec && !prs.includes(e.id)) e1prs.push({ id: e.id, ...rec })
  })
  const w: Workout = {
    id: A.id, d: A.d, start: A.start, end: Date.now(), routineId: A.routineId, name: A.name, bw: A.bw,
    entries: A.entries.map(e => ({ id: e.id, sets: e.sets, topW: e.topW || null, target: e.target || null })).filter(e => e.sets.some(s => s.done)),
    prs,
  }
  w.vol = workoutVolume(w)
  update(s => {
    w.entries.forEach(e => {
      const mx = Math.max(0, ...e.sets.filter(x => x.done).map(x => x.w || 0), e.topW || 0)
      if (mx > 0) { const cur = s.exWeights[e.id]; if (!cur || mx > cur.w) s.exWeights[e.id] = { w: mx, d: w.d } }
    })
    s.workouts.push(w)
    s.active = null
  })
  useUI.getState().stopRest()
  useUI.getState().stopWork()
  success()
  openSheet(close => <FinishSummary w={w} prs={prs} e1prs={e1prs} close={close} />, { locked: true })
}

/* ---------------- importar de outro app (FitNotes, Strong, Hevy, Apple Health) ---------------- */

function ImportSummary({ parsed, close }: { parsed: any; close: () => void }) {
  const st = useStore(s => s.S)
  const isBW = parsed.kind === 'bodyweight'
  const have = isBW
    ? parsed.bodyweight.filter((b: any) => st.bodyweight.some(x => x.d === b.d)).length
    : parsed.workouts.filter((w: any) => st.workouts.some(x => x.d === w.d)).length
  const fresh = (isBW ? parsed.bodyweight.length : parsed.workouts.length) - have
  const doImport = () => {
    let res: any
    update(s => { res = mergeImport(s, parsed) })
    close()
    toast(isBW ? `${res.added} pesagens importadas` : `${res.added} treinos importados`)
  }
  return (
    <>
      <H2>{parsed.source ? `Importar do ${parsed.source}` : 'Importar histórico'}</H2>
      <Muted style={{ marginBottom: 12 }}>{parsed.from === parsed.to ? fmtDate(parsed.from, true) : fmtDate(parsed.from, true) + ' a ' + fmtDate(parsed.to, true)}</Muted>
      <Tiles items={isBW ? [
        { label: 'Pesagens', value: parsed.bodyweight.length }, { label: 'Novas', value: fresh },
      ] : [
        { label: 'Treinos', value: parsed.workouts.length }, { label: 'Séries', value: parsed.sets },
        { label: 'Exercícios reconhecidos', value: parsed.matched }, { label: 'Criados como seus', value: parsed.created },
      ]} />
      {parsed.mixedUnits ? <Dim style={{ color: C.yellow, marginBottom: 10 }}>O arquivo mistura kg e lb: cada série é convertida para {st.unit}.</Dim>
        : parsed.converted ? <Dim style={{ color: C.yellow, marginBottom: 10 }}>O arquivo está em {parsed.fileUnit} e seu perfil em {st.unit}: as cargas serão convertidas.</Dim> : null}
      {!isBW && !parsed.fileUnit && !parsed.mixedUnits ? <Dim style={{ marginBottom: 10 }}>O arquivo não diz a unidade: os números entram como estão.</Dim> : null}
      {have > 0 ? <Dim style={{ marginBottom: 10 }}>{have} dia(s) já têm dados aqui e ficam como estão.</Dim> : null}
      {!isBW && parsed.rirSets + parsed.rpeSets > 0 ? (
        <Dim style={{ marginBottom: 10 }}>
          {parsed.rirSets || parsed.rpeSets} séries vêm com {parsed.rirSets ? 'RIR' : 'RPE'}.{effortOf(st) === 'none' ? ' Ligue Esforço por série em Ajustes para ver.' : ''}
        </Dim>
      ) : null}
      {!isBW && parsed.unmatchedNames.length ? (
        <>
          <SecTitle>Fora da biblioteca: criados como seus exercícios</SecTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {parsed.unmatchedNames.slice(0, 12).map((n: string) => <Tag key={n} label={n} />)}
            {parsed.unmatchedNames.length > 12 ? <Tag label={`+${parsed.unmatchedNames.length - 12}`} /> : null}
          </View>
        </>
      ) : null}
      <Button variant="primary" title={fresh ? 'Importar' : 'Nada novo para importar'} disabled={!fresh} onPress={doImport} />
    </>
  )
}

export async function importFromApp() {
  try {
    const f = await pickText(['text/csv', 'text/comma-separated-values', 'text/xml', 'application/xml', 'public.comma-separated-values-text', 'public.xml', '*/*'])
    if (!f) return
    const parsed = parseImport(f.text, { unit: S().unit })
    if (parsed.error === 'empty') { toast('Esse arquivo está vazio'); return }
    if (parsed.error) { toast('Não reconheci as colunas desse arquivo'); return }
    if (parsed.kind === 'bodyweight' ? !parsed.bodyweight.length : !parsed.workouts.length) { toast('Nada para importar nesse arquivo'); return }
    openSheet(close => <ImportSummary parsed={parsed} close={close} />)
  } catch {
    toast('Não consegui ler esse arquivo')
  }
}
