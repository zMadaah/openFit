// Estatísticas e histórico. Portado de openGym/frontend/src/views/Stats.jsx e History.jsx.
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { EXIDX } from '../core/exercises'
import {
  HARD_RIR, avgRir, displayScale, effortHistogram, effortSummary, effortWeeks, hasEffort, isHardSet, scaleName, toScale,
} from '../core/effort'
import { capitalize, fmtDate, fmtNum, todayISO, weekKey } from '../core/format'
import { effortOf, lastBW, modeOf, setLabel, streakWeeks } from '../core/history'
import { loadOfWorkouts, rankOf } from '../core/muscles'
import { best1RM, e1rmSeries } from '../core/onerm'
import { useNav } from '../nav'
import { bwDeltaColor, bwSheet, goalSheet } from '../sheets/common'
import { calendarSheet, workoutDetailSheet, WorkoutRow } from '../sheets/workout'
import { openSheet } from '../store/useUI'
import { useStore } from '../store/useStore'
import { BodyMap, Heatmap, Legend, LineChart, muscleName } from '../ui/charts'
import { Icon } from '../ui/icons'
import { Button, Card, Chip, Chips, Dim, Empty, H2, Header, IconBtn, Item, List, Muted, RowV, Screen, SecTitle, Segmented, Tag, Tiles, useAccent } from '../ui/kit'
import { C, PAD } from '../ui/theme'

/* ---------------- equilíbrio muscular ---------------- */

function MuscleBalance({ S }: { S: any }) {
  const acc = useAccent()
  const [win, setWin] = useState(7)
  const [hard, setHard] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const now = Date.now()
  const inWin = S.workouts.filter((w: any) =>
    win === 0 ? true : win === 7 ? weekKey(w.d) === weekKey(todayISO()) : (w.start || new Date(w.d).getTime()) > now - win * 86400000)
  const rated = inWin.some((w: any) => w.entries.some((e: any) => e.sets.some((s: any) => s.done && isHardSet(s))))
  const on = hard && rated
  const load = loadOfWorkouts(inWin, on ? isHardSet : null)
  const { worked, missed } = rankOf(load)
  const max = worked.length ? load[worked[0]] : 0
  const sets = (m: string) => Math.round((load[m] || 0) * 10) / 10
  return (
    <Card>
      <RowV style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <H2 style={{ marginBottom: 0, flex: 1 }}>Equilíbrio muscular <Text style={{ color: C.label3, fontSize: 14 }}>· {on ? 'séries difíceis' : 'séries feitas'}</Text></H2>
        {rated ? <Button size="sm" icon="fire" title={on ? 'Difíceis' : 'Todas'} color={on ? C.yellow : undefined} onPress={() => { setHard(h => !h); setSel(null) }} /> : null}
      </RowV>
      <Segmented value={win} onChange={v => { setWin(v); setSel(null) }} options={[{ value: 7, label: 'Semana' }, { value: 30, label: '30d' }, { value: 90, label: '90d' }, { value: 0, label: 'Tudo' }]} />
      {inWin.length ? (
        <>
          <BodyMap load={load} body={S.body} selected={sel} onMuscle={m => setSel(s => (s === m ? null : m))} />
          <Legend />
          {sel ? (
            <RowV style={{ justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.sep, marginTop: 8, paddingTop: 10 }}>
              <Text style={{ color: C.label, fontWeight: '700' }}>{muscleName(sel)}</Text>
              <Muted>{sets(sel) ? `${fmtNum(sets(sel))} séries` : on ? 'sem séries difíceis' : 'não treinado'}</Muted>
            </RowV>
          ) : worked.slice(0, 4).map((m: string) => (
            <RowV key={m} style={{ gap: 8, marginTop: 8 }}>
              <Text style={{ color: C.label, width: 110 }} numberOfLines={1}>{muscleName(m)}</Text>
              <View style={{ flex: 1, height: 8, backgroundColor: C.surface2, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${Math.round((load[m] / max) * 100)}%`, backgroundColor: on ? C.yellow : acc }} />
              </View>
              <Muted style={{ fontSize: 13, width: 70, textAlign: 'right' }}>{fmtNum(sets(m))} séries</Muted>
            </RowV>
          ))}
          {missed.length ? (
            <>
              <SecTitle>{on ? 'Sem séries difíceis no período' : 'Não treinados no período'}</SecTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{missed.map((m: string) => <Tag key={m} label={muscleName(m)} color={C.orange} />)}</View>
            </>
          ) : worked.length ? <Muted style={{ marginTop: 10, fontSize: 14 }}>{on ? 'Todo grupo muscular teve pelo menos uma série difícil.' : 'Todo grupo muscular trabalhou no período.'}</Muted> : null}
        </>
      ) : <Muted>Nenhum treino neste período ainda.</Muted>}
    </Card>
  )
}

/* ---------------- esforço ---------------- */

function EffortCard({ S }: { S: any }) {
  const [win, setWin] = useState(90)
  const kind = displayScale(S)
  const hd = scaleName(kind)
  const sum = effortSummary(S, win)
  const weeks = effortWeeks(S, win)
  const hist = effortHistogram(S, win)
  const maxBin = Math.max(1, ...hist.map((b: any) => b.n))
  const pts = weeks.map((w: any) => ({ t: w.t, y: toScale(kind, w.rir), note: `${w.sets} séries` }))
  const binLabel = (b: any) => (kind === 'rpe' ? (b.tail ? '≤ 6' : String(10 - b.rir)) : b.tail ? b.rir + '+' : String(b.rir))
  return (
    <Card>
      <H2>Esforço <Text style={{ color: C.label3, fontSize: 14 }}>· quão perto da falha</Text></H2>
      <Segmented value={win} onChange={setWin} options={[{ value: 30, label: '30d' }, { value: 90, label: '90d' }, { value: 365, label: '1A' }, { value: 0, label: 'Tudo' }]} />
      {sum.rated === 0 ? <Muted>Nenhuma série avaliada neste período.</Muted> : (
        <>
          <RowV style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View><Text style={{ color: C.label, fontSize: 24, fontWeight: '800' }}>{sum.avg == null ? '-' : fmtNum(toScale(kind, sum.avg)) + ' ' + hd}</Text><Dim>esforço médio</Dim></View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: C.yellow, fontSize: 24, fontWeight: '800' }}>{sum.hardPct == null ? '-' : Math.round(sum.hardPct * 100) + '%'}</Text>
              <Dim>em {hd} {fmtNum(toScale(kind, HARD_RIR))} ou mais difícil</Dim>
            </View>
          </RowV>
          <Dim style={{ marginTop: 8 }}>{sum.rated} de {sum.done} séries concluídas avaliadas</Dim>
          {effortOf(S) === 'none' ? <Text style={{ color: C.yellow, fontSize: 13, marginTop: 4 }}>Esforço por série está desligado: ligue em Ajustes para continuar avaliando.</Text> : null}
          {pts.length > 1 ? <><SecTitle>Semana a semana</SecTitle><LineChart points={pts} h={140} unit={hd} color={C.yellow} invert={kind === 'rir'} /></> : null}
          <SecTitle>Onde as séries caem</SecTitle>
          {hist.map((b: any) => (
            <RowV key={b.rir} style={{ gap: 8, marginBottom: 6 }}>
              <Text style={{ color: C.label, width: 60 }}>{hd} {binLabel(b)}</Text>
              <View style={{ flex: 1, height: 8, backgroundColor: C.surface2, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${Math.round((b.n / maxBin) * 100)}%`, backgroundColor: b.rir <= HARD_RIR ? C.yellow : C.label3 }} />
              </View>
              <Muted style={{ fontSize: 13, width: 70, textAlign: 'right' }}>{b.n ? `${b.n} · ${Math.round(b.pct * 100)}%` : '-'}</Muted>
            </RowV>
          ))}
          <Dim style={{ marginTop: 6 }}>A maioria das séries de trabalho fica perto da falha sem morar nela: metade no limite e metade folgada dá uma média que parece saudável.</Dim>
        </>
      )}
    </Card>
  )
}

/* ---------------- tela ---------------- */

export function Stats() {
  const S = useStore(s => s.S)
  const go = useNav(s => s.go)
  const [range, setRange] = useState(90)
  const [exId, setExId] = useState<string | null>(null)
  const [exMetric, setExMetric] = useState('top')
  const now = Date.now()
  const anyEffort = hasEffort(S)
  const kind = displayScale(S)
  const hd = scaleName(kind)
  const tsOf = (b: any) => b.t || new Date(b.d + 'T12:00:00').getTime()
  const bwPts = S.bodyweight.filter(b => range === 0 || tsOf(b) > now - range * 86400000).map(b => ({ t: tsOf(b), y: b.w, d: b.d }))
  const bw30 = S.bodyweight.filter(b => tsOf(b) > now - 30 * 86400000)
  const bwDelta30 = bw30.length > 1 ? bw30[bw30.length - 1].w - bw30[0].w : null
  const monthW = S.workouts.filter(w => w.d.slice(0, 7) === todayISO().slice(0, 7)).length

  const exHist = useMemo(() => [...new Set(S.workouts.flatMap(w => w.entries.map(e => e.id)))].filter(id => EXIDX[id])
    .sort((a, b) => EXIDX[a].n.localeCompare(EXIDX[b].n, 'pt-BR')), [S.workouts, S.customEx])
  const curEx = exId && exHist.includes(exId) ? exId : exHist[0] || null
  const curMode = curEx ? (() => {
    for (let i = S.workouts.length - 1; i >= 0; i--) {
      const en = S.workouts[i].entries.find(e => e.id === curEx)
      if (en) return modeOf({ ...(en.target || {}), id: curEx })
    }
    return modeOf({ id: curEx })
  })() : 'reps'
  const curCardio = curMode === 'cardio', curTimed = curMode === 'time'
  const metric = (s: any) => (curCardio ? s.speed || 0 : curTimed ? s.sec || 0 : s.w || 0)
  const exUnit = curCardio ? 'km/h' : curTimed ? 's' : S.unit
  const exPts: any[] = []
  let exBest = 0
  if (curEx) {
    S.workouts.forEach(w => {
      const en = w.entries.find(e => e.id === curEx)
      if (!en) return
      const mx = Math.max(0, ...en.sets.filter(s => s.done).map(metric), curCardio || curTimed ? 0 : en.topW || 0)
      if (mx > 0) { exPts.push({ t: w.start, y: mx, d: w.d, sets: en.sets.filter(s => s.done), target: en.target }); if (mx > exBest) exBest = mx }
    })
  }
  const exList = exPts.slice(-5).reverse()
  const e1Pts = curEx ? e1rmSeries(S, curEx) : []
  const e1Best = curEx ? best1RM(S, curEx) : null
  const showE1 = e1Pts.length > 0
  const exRir = exPts.map(p => avgRir(p.sets))
  const showEff = exRir.filter(v => v != null).length >= 3
  const effPts = exPts.map((p, i) => (exRir[i] == null ? null : { t: p.t, y: toScale(kind, exRir[i]), d: p.d })).filter(Boolean) as any[]
  const onE1 = showE1 && exMetric === 'e1rm'
  const onEff = showEff && exMetric === 'effort'
  const topPts = exPts.map((p, i) => ({
    t: p.t, y: p.y, d: p.d,
    m: exRir[i] == null ? null : 1 - Math.min(4, Math.max(0, exRir[i])) / 4,
    note: exRir[i] == null ? undefined : hd + ' ' + fmtNum(toScale(kind, exRir[i])),
  }))
  const exOpts = [{ value: 'top', label: 'Melhor série' }]
  if (showE1) exOpts.push({ value: 'e1rm', label: '1RM estimado' })
  if (showEff) exOpts.push({ value: 'effort', label: 'Esforço' })

  const pickExercise = () => openSheet(close => (
    <>
      <H2>Progresso por exercício</H2>
      <List>{exHist.map(id => <Item key={id} title={capitalize(EXIDX[id].n)} onPress={() => { setExId(id); close() }} right={id === curEx ? <Icon name="check" size={20} color={C.green} /> : null} />)}</List>
    </>
  ))

  return (
    <Screen header={<Header title="Estatísticas" sub="Progresso e histórico" right={<IconBtn name="history" label="Histórico" onPress={() => go('stats', { name: 'history' })} />} />}>
      <View style={{ paddingHorizontal: PAD }}>
        <Tiles items={[
          { label: 'Treinos', value: S.workouts.length, icon: 'dumbbell' },
          { label: 'Este mês', value: monthW, icon: 'calendar' },
          { label: 'Semanas seguidas', value: streakWeeks(S), icon: 'fire' },
          { label: 'Peso 30d', value: bwDelta30 === null ? '-' : (bwDelta30 > 0 ? '+' : '') + fmtNum(bwDelta30) + ' ' + S.unit, icon: 'scale-bathroom', color: bwDelta30 === null ? undefined : bwDeltaColor(bwDelta30, lastBW(S)?.w || 0) },
        ]} />
      </View>

      <Card>
        <H2>Atividade: últimos 12 meses <Text style={{ color: C.label3, fontSize: 14 }}>· tempo treinado</Text></H2>
        <Heatmap S={S} onDay={iso => { const ws = S.workouts.filter(w => w.d === iso); if (ws.length === 1) workoutDetailSheet(ws[0]); else if (ws.length) calendarSheet(iso) }} />
      </Card>

      {S.workouts.length ? <MuscleBalance S={S} /> : null}
      {anyEffort ? <EffortCard S={S} /> : null}

      <Card>
        <RowV style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <H2 style={{ marginBottom: 0 }}>Peso corporal</H2>
          <RowV style={{ gap: 8 }}>
            <Button size="sm" icon="target" title={S.targetW ? fmtNum(S.targetW) : 'Meta'} color={S.targetW ? C.yellow : undefined} onPress={goalSheet} />
            <Button size="sm" icon="plus" title="Registrar" onPress={() => bwSheet()} />
          </RowV>
        </RowV>
        <Segmented value={range} onChange={setRange} options={[{ value: 30, label: '1M' }, { value: 90, label: '3M' }, { value: 365, label: '1A' }, { value: 0, label: 'Tudo' }]} />
        <LineChart points={bwPts} h={160} unit={S.unit} goal={S.targetW} />
      </Card>

      <Card>
        <H2>Progresso por exercício</H2>
        {exHist.length ? (
          <>
            <Pressable onPress={pickExercise} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 10, padding: 10, marginBottom: 10 }}>
              <Text style={{ color: C.label, fontWeight: '600', flex: 1 }} numberOfLines={1}>{curEx ? capitalize(EXIDX[curEx].n) : ''}</Text>
              <Icon name="chevron-down" size={20} color={C.label2} />
            </Pressable>
            {exOpts.length > 1 ? <Segmented value={onEff ? 'effort' : onE1 ? 'e1rm' : 'top'} onChange={setExMetric} options={exOpts} /> : null}
            {onEff ? <LineChart points={effPts} h={150} unit={hd} color={C.yellow} invert={kind === 'rir'} />
              : <LineChart points={onE1 ? e1Pts.map((p: any) => ({ t: p.t, y: p.y, d: p.d })) : topPts} h={150} unit={onE1 ? S.unit : exUnit} color={C.blue} />}
            <View style={{ marginTop: 8 }}>
              {exList.map((p, i) => (
                <RowV key={i} style={{ justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.sep, gap: 10 }}>
                  <Muted style={{ fontSize: 13 }}>{fmtDate(p.d, true)}</Muted>
                  <Text style={{ color: C.label, fontSize: 13, flex: 1, textAlign: 'right' }}>{p.sets.map((s: any) => setLabel(curEx, s, p.target)).join('  ')}</Text>
                </RowV>
              ))}
            </View>
            <Dim style={{ marginTop: 8 }}>
              {onEff ? 'Esforço médio por treino' : onE1 ? '1RM estimado por treino' : curCardio ? 'Velocidade máxima por treino' : curTimed ? 'Maior tempo por treino' : 'Maior carga por treino'}
              {onEff ? '' : `  ·  Melhor: ${fmtNum(onE1 && e1Best ? e1Best.est : exBest)} ${onE1 ? S.unit : exUnit}`}
            </Dim>
            {onE1 && e1Best ? <Dim style={{ marginTop: 4 }}>Melhor estimativa a partir de {fmtNum(e1Best.w)} {S.unit} × {e1Best.r} em {fmtDate(e1Best.d, true)}: estimativa, não máximo testado.</Dim> : null}
            {!onEff && !onE1 && showEff ? <Dim style={{ marginTop: 4 }}>Ponto mais cheio = menos reserva no tanque: a mesma carga com {hd} menor é progresso que a linha sozinha não mostra.</Dim> : null}
          </>
        ) : <Muted>Termine seu primeiro treino para ver as curvas de progresso aqui.</Muted>}
      </Card>

      {S.workouts.length ? (
        <View style={{ paddingHorizontal: PAD }}>
          <RowV style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <SecTitle style={{ marginTop: 6, marginBottom: 0 }}>Treinos recentes</SecTitle>
            <Button size="sm" variant="ghost" trailingIcon="chevron-right" title={`Todos ${S.workouts.length}`} onPress={() => go('stats', { name: 'history' })} />
          </RowV>
          <List>{[...S.workouts].reverse().slice(0, 6).map(w => <WorkoutRow key={w.id} w={w} onPress={() => workoutDetailSheet(w)} />)}</List>
        </View>
      ) : null}
    </Screen>
  )
}

export function History() {
  const S = useStore(s => s.S)
  const back = useNav(s => s.back)
  return (
    <Screen header={<Header title="Histórico" sub={`${S.workouts.length} treinos`} left={<IconBtn name="chevron-left" label="Voltar" onPress={back} />} />}>
      <View style={{ paddingHorizontal: PAD }}>
        {S.workouts.length ? <List>{[...S.workouts].reverse().map(w => <WorkoutRow key={w.id} w={w} onPress={() => workoutDetailSheet(w)} />)}</List>
          : <Empty icon="history">Nenhum treino ainda.</Empty>}
      </View>
    </Screen>
  )
}
