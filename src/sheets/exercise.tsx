// Folhas de exercício: detalhe com 1RM, adicionar ao plano, exercício próprio, seletor e
// configuração (séries, repetições, modo e progressão). Portado de openGym/frontend/src/sheets.jsx.
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { BODYPARTS, EXIDX, allExercises, equipmentOf, isCardio, searchExercises, type Ex } from '../core/exercises'
import { capitalize, exCount, fmtDate, fmtNum, uid } from '../core/format'
import { bestWeightFor, cleanupSg, defaultConfig, lastEntryFor, modeOf, setLabel } from '../core/history'
import { t } from '../core/i18n'
import { REP_CAP, best1RM, estimate1RM } from '../core/onerm'
import { POLICIES_FOR, POLICY_DESC, POLICY_NAME, defaultIncrement, policyFor } from '../core/progression'
import { nav } from '../nav'
import { S, update, useStore, type Cfg, type Routine } from '../store/useStore'
import { openSheet, toast } from '../store/useUI'
import { DEFAULT_GLYPH, GLYPH_GROUPS, GLYPH_ICON, Icon, glyphIcon, glyphOf } from '../ui/icons'
import {
  Button, Chip, Chips, Dim, Empty, Field, Gap, H2, IconTile, Item, List, Muted, RowV, SearchField,
  SecTitle, Segmented, Stepper, Tag, Thumb, useAccent,
} from '../ui/kit'
import { C } from '../ui/theme'
import { ExerciseMedia } from '../ui/media'
import { confirmSheet } from './common'

/* ---------------- detalhe ---------------- */

function OneRM({ ex }: { ex: Ex }) {
  const st = useStore(s => s.S)
  const acc = useAccent()
  const best = best1RM(st, ex.id)
  const [w, setW] = useState<number>(best ? best.w : (st.exWeights[ex.id] || ({} as any)).w || 20)
  const [r, setR] = useState<number>(best ? best.r : 5)
  const est = estimate1RM(w, r)
  return (
    <>
      <SecTitle>1RM estimado</SecTitle>
      {best ? (
        <Text style={{ color: C.label2, fontSize: 14, marginBottom: 8 }}>
          Pelo seu histórico: <Text style={{ color: acc, fontWeight: '700' }}>{fmtNum(best.est)} {st.unit}</Text>
          {`  ·  ${fmtNum(best.w)} ${st.unit} × ${best.r} em ${fmtDate(best.d, true)}`}
        </Text>
      ) : null}
      <RowV style={{ gap: 10, marginBottom: 10 }}>
        <Stepper label={`Carga (${st.unit})`} value={w} step={2.5} onChange={setW} />
        <Stepper label="Repetições" value={r} step={1} decimal={false} onChange={setR} />
      </RowV>
      <RowV style={{ justifyContent: 'space-between' }}>
        <Muted>Estimativa</Muted>
        <Text style={{ color: acc, fontSize: 22, fontWeight: '800' }}>{est === null ? '-' : fmtNum(est) + ' ' + st.unit}</Text>
      </RowV>
      <Dim style={{ marginTop: 4 }}>{est === null
        ? `Informe uma carga e de 1 a ${REP_CAP} repetições: acima disso a estimativa vira chute.`
        : 'Fórmula de Epley: um cálculo a partir de uma série, não um máximo testado.'}</Dim>
    </>
  )
}

function ExerciseDetail({ ex, close }: { ex: Ex; close: () => void }) {
  const st = useStore(s => s.S)
  const acc = useAccent()
  const last = lastEntryFor(st, ex.id)
  const best = bestWeightFor(st, ex.id)
  const steps = ex.st || []
  return (
    <>
      <H2 style={{ fontSize: 23, paddingRight: 36 }}>{capitalize(ex.n)}</H2>
      {ex.en && ex.en !== ex.n ? <Dim style={{ marginTop: -4, marginBottom: 6 }}>{ex.en}</Dim> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <Tag label={capitalize(t(ex.bp))} accent />
        {ex.tg ? <Tag icon="target" label={capitalize(t(ex.tg))} /> : null}
        <Tag icon="dumbbell" label={capitalize(t(ex.eq))} />
        {(ex.sm || []).slice(0, 3).map(m => <Tag key={m} label={capitalize(t(m))} />)}
      </View>
      {!ex.missing ? <ExerciseMedia ex={ex} /> : null}
      {ex.desc ? <Text style={{ color: C.label, fontSize: 15, lineHeight: 21, marginBottom: 10 }}>{ex.desc}</Text> : null}
      {best > 0 ? (
        <RowV style={{ marginBottom: 8, flexWrap: 'wrap' }}>
          <Icon name="trophy" size={14} color={C.yellow} style={{ marginRight: 4 }} />
          <Text style={{ color: C.label2, fontSize: 14 }}>
            Melhor: <Text style={{ color: acc, fontWeight: '700' }}>{fmtNum(best)} {st.unit}</Text>
            {last ? `  ·  última vez ${fmtDate(last.d)}: ${last.sets.map((s: any) => setLabel(ex.id, s, last.target)).join(', ')}` : ''}
          </Text>
        </RowV>
      ) : null}
      <Button variant="primary" icon="plus" title="Adicionar ao meu plano" onPress={() => addToRoutineSheet(ex)} style={{ marginTop: 6 }} />
      {ex.custom ? (
        <RowV style={{ gap: 8, marginTop: 8 }}>
          <Button icon="pencil" title="Editar" style={{ flex: 1 }} onPress={() => { close(); customExSheet(ex) }} />
          <Button variant="danger" icon="trash-can-outline" title="Apagar" style={{ flex: 1 }} onPress={() => deleteCustomEx(ex, close)} />
        </RowV>
      ) : null}
      {!isCardio(ex) ? <OneRM ex={ex} /> : null}
      {steps.length ? (
        <>
          <SecTitle>Como fazer</SecTitle>
          {steps.map((s, i) => (
            <RowV key={i} style={{ alignItems: 'flex-start', marginBottom: 9 }}>
              <Text style={{ color: acc, fontWeight: '800', width: 22, fontSize: 15 }}>{i + 1}.</Text>
              <Text style={{ color: C.label, flex: 1, fontSize: 15, lineHeight: 21 }}>{s}</Text>
            </RowV>
          ))}
        </>
      ) : null}
    </>
  )
}
export const exerciseDetailSheet = (ex: Ex) => openSheet(close => <ExerciseDetail ex={ex} close={close} />)

/* ---------------- adicionar a uma rotina ---------------- */

function AddToRoutine({ ex, close }: { ex: Ex; close: () => void }) {
  const st = useStore(s => s.S)
  const pick = (rid: string) => {
    close()
    const isNew = rid === '_new'
    const routine = isNew ? null : st.routines.find(x => x.id === rid) || null
    exConfigSheet(ex, null, cfg => {
      let name = ''
      let newId = ''
      update(s => {
        let r = isNew ? { id: uid(), name: 'Nova rotina', emoji: DEFAULT_GLYPH, ex: [] as Cfg[] } : s.routines.find(x => x.id === rid)
        if (isNew && r) { s.routines.push(r); newId = r.id }
        if (r) { r.ex.push({ id: ex.id, ...cfg }); name = r.name }
      })
      toast(`“${capitalize(ex.n)}” adicionado a ${name || 'rotina'}`)
      if (newId) nav('/plan/r/' + newId)
    }, null, routine)
  }
  return (
    <>
      <H2 style={{ paddingRight: 36 }}>Adicionar “{capitalize(ex.n)}”</H2>
      <Muted style={{ marginBottom: 12 }}>Escolha uma rotina. Séries, repetições e carga vêm em seguida.</Muted>
      <List>
        {st.routines.map(r => (
          <Item key={r.id} left={<IconTile name={glyphIcon(r.emoji)} />} title={r.name} subtitle={exCount(r.ex.length)} onPress={() => pick(r.id)}
            right={<>{r.ex.some(e => e.id === ex.id) ? <Tag label="já está" /> : null}<Icon name="plus" size={20} color={C.label3} /></>} />
        ))}
        <Item left={<IconTile name="star-four-points" bg={C.surface3} />} title="Nova rotina" subtitle="Criar uma e começar com este exercício"
          onPress={() => pick('_new')} right={<Icon name="plus" size={20} color={C.label3} />} />
      </List>
    </>
  )
}
export const addToRoutineSheet = (ex: Ex) => openSheet(close => <AddToRoutine ex={ex} close={close} />)

/* ---------------- exercício próprio (issue #11) ---------------- */

function CustomExForm({ existing, prefill, onDone, close }: { existing?: Ex | null; prefill?: string; onDone?: (ex: Ex) => void; close: () => void }) {
  const [n, setN] = useState(existing ? existing.n : prefill || '')
  const [bp, setBp] = useState(existing ? existing.bp : '')
  const [desc, setDesc] = useState(existing ? existing.desc || '' : '')
  const save = () => {
    const name = n.trim()
    if (!name) { toast('Dê um nome ao exercício'); return }
    if (!bp) { toast('Escolha uma parte do corpo'); return }
    const dup = allExercises(S()).find(e => e.n.toLowerCase() === name.toLowerCase() && e.id !== existing?.id)
    if (dup) { toast(`“${capitalize(dup.n)}” já existe`); return }
    const d = desc.trim().slice(0, 1000)
    let id = existing?.id
    if (existing) update(s => { const c = s.customEx.find((x: any) => x.id === id); if (c) { c.n = name; c.bp = bp; c.desc = d } })
    else {
      id = 'c' + uid()
      update(s => { s.customEx.push({ id, n: name, bp, desc: d, tg: '', eq: 'custom', custom: true }) })
    }
    close()
    toast(existing ? 'Salvo' : `“${name}” criado`)
    if (id && onDone) onDone(EXIDX[id])
  }
  return (
    <>
      <H2>{existing ? 'Editar exercício próprio' : 'Criar seu próprio exercício'}</H2>
      <Muted style={{ marginBottom: 12 }}>Dê um nome e escolha a parte do corpo: ele funciona como qualquer outro exercício.</Muted>
      <Field placeholder="Nome do exercício" value={n} onChangeText={setN} autoFocus={!existing} />
      <View style={{ marginVertical: 12 }}>
        <Chips wrap>{BODYPARTS.map(b => <Chip key={b} label={capitalize(t(b))} on={bp === b} onPress={() => setBp(b)} />)}</Chips>
      </View>
      {bp === 'cardio' ? <Dim style={{ marginBottom: 10 }}>Exercícios de cardio registram tempo e velocidade em vez de carga × repetições.</Dim> : null}
      <Field multiline maxLength={1000} placeholder="Descrição (opcional): ajuste, dicas, o que quiser lembrar" value={desc} onChangeText={setDesc} />
      <Gap h={14} />
      <Button variant="primary" title={existing ? 'Salvar' : 'Criar exercício'} onPress={save} />
      {existing ? <><Gap /><Button variant="danger" icon="trash-can-outline" title="Apagar exercício" onPress={() => { close(); deleteCustomEx(existing) }} /></> : null}
    </>
  )
}
export const customExSheet = (existing?: Ex | null, onDone?: (ex: Ex) => void, prefill?: string) =>
  openSheet(close => <CustomExForm existing={existing} prefill={prefill} onDone={onDone} close={close} />)

export function deleteCustomEx(ex: Ex, afterDelete?: () => void) {
  if (S().active?.entries.some(e => e.id === ex.id)) { toast('Termine o treino atual primeiro'); return }
  confirmSheet({
    title: `Apagar “${ex.n}”?`,
    message: 'Ele sai das suas rotinas. Treinos já registrados mantêm as séries.',
    confirmText: 'Apagar', danger: true,
    onConfirm: () => {
      update(s => {
        s.customEx = s.customEx.filter((x: any) => x.id !== ex.id)
        s.routines.forEach(r => { r.ex = r.ex.filter(e => e.id !== ex.id); cleanupSg(r.ex) })
        s.workouts.forEach(w => w.entries.forEach(e => { if (e.id === ex.id) e.n = ex.n }))
        delete s.exWeights[ex.id]
      })
      toast('Exercício apagado')
      afterDelete?.()
    },
  })
}

/* ---------------- seletor de exercício ---------------- */

/** Exercícios já usados em rotinas ou treinos (filtro "Escolhidos"). */
export function usageMap(st: any) {
  const u: Record<string, number> = {}
  st.routines.forEach((r: Routine) => r.ex.forEach(e => { u[e.id] = (u[e.id] || 0) + 1 }))
  st.workouts.forEach((w: any) => w.entries.forEach((e: any) => { u[e.id] = (u[e.id] || 0) + 1 }))
  return u
}

/** Lista com busca e filtros, usada pelo seletor e pela aba Exercícios. */
export function ExerciseBrowser({ onPick, header, rowRight, createLabel = true }: {
  onPick: (ex: Ex) => void; header?: ReactNode; rowRight?: (ex: Ex) => ReactNode; createLabel?: boolean
}) {
  const st = useStore(s => s.S)
  const usage = useMemo(() => usageMap(st), [st.routines, st.workouts])
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eq, setEq] = useState('')
  const dq = useDeferredValue(q)
  const all = useMemo(() => allExercises(st), [st.customEx])
  const { list, eqOpts, eqOn } = useMemo(() => {
    let base = all.filter(e => (bp === '★' ? usage[e.id] : !bp || e.bp === bp))
    base = searchExercises(base, dq)
    if (bp === '★' && !dq.trim()) base = [...base].sort((a, b) => usage[b.id] - usage[a.id] || a.n.localeCompare(b.n, 'pt-BR'))
    const eqOpts = equipmentOf(base)
    const eqOn = eqOpts.includes(eq) ? eq : ''
    return { list: eqOn ? base.filter(e => e.eq === eqOn) : base, eqOpts, eqOn }
  }, [all, bp, eq, dq, usage])
  const chosen = Object.keys(usage).length

  return (
    <FlatList
      data={list}
      keyExtractor={e => e.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={18}
      windowSize={9}
      contentContainerStyle={{ paddingBottom: 30 }}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 16 }}>
          {header}
          <SearchField placeholder={`Buscar entre ${all.length.toLocaleString('pt-BR')} exercícios`} value={q} onChangeText={setQ} />
          <View style={{ marginTop: 10, marginBottom: eqOpts.length > 1 ? 6 : 10 }}>
            <Chips>
              {chosen ? <Chip icon="star" label={`Escolhidos (${chosen})`} on={bp === '★'} onPress={() => { setBp('★'); setEq('') }} /> : null}
              <Chip label="Todos" on={!bp} onPress={() => { setBp(''); setEq('') }} />
              {BODYPARTS.map(b => <Chip key={b} label={capitalize(t(b))} on={bp === b} onPress={() => { setBp(b); setEq('') }} />)}
            </Chips>
          </View>
          {eqOpts.length > 1 ? (
            <View style={{ marginBottom: 10 }}>
              <Chips>
                <Chip label="Qualquer equipamento" on={!eqOn} onPress={() => setEq('')} />
                {eqOpts.map(x => <Chip key={x} label={capitalize(t(x))} on={eqOn === x} onPress={() => setEq(x)} />)}
              </Chips>
            </View>
          ) : null}
          {bp !== '★' && createLabel ? (
            <List style={{ marginBottom: 8 }}>
              <Item left={<View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}><Icon name="star-four-points" size={22} color={C.label2} /></View>}
                title="Criar seu próprio exercício" subtitle="nome + parte do corpo"
                onPress={() => customExSheet(null, ex => onPick(ex), q.trim())} right={<Icon name="plus" size={20} color={C.label3} />} />
            </List>
          ) : null}
          <Dim style={{ marginBottom: 6 }}>{list.length.toLocaleString('pt-BR')} exercícios</Dim>
        </View>
      }
      renderItem={({ item: e }) => (
        <View style={{ marginHorizontal: 16, backgroundColor: C.surface }}>
          <Item left={<Thumb ex={e} />} title={capitalize(e.n)} subtitle={capitalize(t(e.tg || e.bp)) + ' · ' + t(e.eq)} onPress={() => onPick(e)}
            right={<>{usage[e.id] ? <Icon name="star" size={15} color={C.yellow} /> : null}{rowRight ? rowRight(e) : <Icon name="plus" size={20} color={C.label3} />}</>} />
        </View>
      )}
      ListEmptyComponent={<Empty icon="magnify">{bp === '★' ? 'Nada escolhido ainda: os exercícios que você adicionar aparecem aqui.' : 'Nada encontrado.'}</Empty>}
    />
  )
}

/** O seletor do openGym. Abre como folha de lista (sem ScrollView em volta, para a FlatList rolar). */
export const exercisePicker = (onPick: (ex: Ex) => void) =>
  openSheet(close => (
    <ExerciseBrowser
      header={<H2 style={{ marginTop: 4, paddingRight: 36 }}>Adicionar exercício</H2>}
      onPick={ex => { close(); onPick(ex) }}
    />
  ), { list: true })

/* ---------------- configuração do exercício ---------------- */

function ProgressionFields({ ex, mode, c, setC, routine, unit }: any) {
  const options: string[] = (POLICIES_FOR as any)[mode] || ['off']
  if (options.length < 2) return null
  const inherited = policyFor({ id: ex.id }, routine, mode)
  const active = policyFor({ ...c, id: ex.id }, routine, mode)
  const inc = c.inc > 0 ? c.inc : mode === 'time' ? 5 : defaultIncrement(ex.id, unit)
  return (
    <>
      <SecTitle>Progressão</SecTitle>
      <Chips wrap>
        <Chip label={`Seguir a rotina (${t((POLICY_NAME as any)[inherited])})`} on={!c.prog} onPress={() => setC((x: any) => ({ ...x, prog: undefined }))} />
        {options.map(p => <Chip key={p} label={t((POLICY_NAME as any)[p])} on={c.prog === p} onPress={() => setC((x: any) => ({ ...x, prog: p }))} />)}
      </Chips>
      <Dim style={{ marginTop: 8, marginBottom: active === 'off' ? 16 : 10 }}>{t((POLICY_DESC as any)[active])}</Dim>
      {active !== 'off' ? (
        <RowV style={{ gap: 10, marginBottom: 16 }}>
          <Stepper label={mode === 'time' ? 'Passo (segundos)' : `Passo (${unit})`} value={inc} step={mode === 'time' ? 5 : 1.25} decimal={mode !== 'time'}
            onChange={v => setC((x: any) => ({ ...x, inc: v }))} />
          {active === 'double' ? (
            <Stepper label="Reps a partir de" value={c.repsMin || Math.max(1, (c.reps || 10) - 2)} step={1} decimal={false}
              onChange={v => setC((x: any) => ({ ...x, repsMin: v }))} />
          ) : null}
        </RowV>
      ) : null}
    </>
  )
}

function ExConfig({ ex, existing, onSave, onDelete, close, routine }: {
  ex: Ex; existing: Cfg | null; onSave: (cfg: any) => void; onDelete?: (() => void) | null; close: () => void; routine?: Routine | null
}) {
  const unit = useStore(s => s.S.unit)
  const cardio = isCardio(ex.id)
  const [c, setC] = useState<any>(existing || defaultConfig(ex.id))
  const mode = cardio ? 'cardio' : modeOf({ ...c, id: ex.id })
  const setMode = (m: string) => setC((x: any) => ({ ...defaultConfig(ex.id, m), ...x, mode: m }))
  const save = () => {
    close()
    const sets = Math.max(1, Math.round(c.sets) || (cardio ? 1 : 3))
    const prog: any = {}
    if (c.prog) prog.prog = c.prog
    if (c.inc > 0) prog.inc = c.inc
    if (cardio) onSave({ sets, min: Math.max(1, Math.round(c.min) || 20), speed: Math.max(0, c.speed || 8) })
    else if (mode === 'time') onSave({ sets, mode: 'time', sec: Math.max(1, Math.round(c.sec) || 45), weight: Math.max(0, c.weight || 0), ...prog })
    else {
      const reps = Math.max(1, Math.round(c.reps) || 10)
      const out: any = { sets, mode: 'reps', reps, weight: Math.max(0, c.weight || 0), ...prog }
      if (policyFor({ ...c, id: ex.id }, routine, 'reps') === 'double') out.repsMin = Math.min(reps, Math.max(1, Math.round(c.repsMin) || Math.max(1, reps - 2)))
      onSave(out)
    }
  }
  const S2 = (k: string) => (v: number) => setC((x: any) => ({ ...x, [k]: v }))
  return (
    <>
      <H2 style={{ fontSize: 22, paddingRight: 36 }}>{capitalize(ex.n)}</H2>
      {!ex.missing ? <ExerciseMedia ex={ex} compact /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {cardio ? <Tag icon="run" label="Cardio" accent /> : null}
        <Tag label={capitalize(t(ex.tg || ex.bp))} /><Tag label={capitalize(t(ex.eq))} />
      </View>
      {ex.desc ? <Text style={{ color: C.label, fontSize: 15, marginBottom: 10 }}>{ex.desc}</Text> : null}
      {!cardio ? <Segmented options={[{ value: 'reps', label: 'Repetições' }, { value: 'time', label: 'Tempo' }]} value={mode} onChange={setMode} style={{ marginBottom: 14 }} /> : null}
      <RowV style={{ gap: 8, marginBottom: mode === 'time' ? 8 : 16 }}>
        {cardio ? (
          <>
            <Stepper label="Intervalos" value={c.sets} step={1} decimal={false} onChange={S2('sets')} />
            <Stepper label="Minutos" value={c.min} step={1} decimal={false} onChange={S2('min')} />
            <Stepper label="km/h" value={c.speed} step={0.5} onChange={S2('speed')} />
          </>
        ) : mode === 'time' ? (
          <>
            <Stepper label="Séries" value={c.sets} step={1} decimal={false} onChange={S2('sets')} />
            <Stepper label="Segundos" value={c.sec} step={5} decimal={false} onChange={S2('sec')} />
            <Stepper label={`Carga (${unit})`} value={c.weight} step={2.5} onChange={S2('weight')} />
          </>
        ) : (
          <>
            <Stepper label="Séries" value={c.sets} step={1} decimal={false} onChange={S2('sets')} />
            <Stepper label="Reps" value={c.reps} step={1} decimal={false} onChange={S2('reps')} />
            <Stepper label={`Carga (${unit})`} value={c.weight} step={2.5} onChange={S2('weight')} />
          </>
        )}
      </RowV>
      {mode === 'time' ? <Dim style={{ marginBottom: 16 }}>Um cronômetro corre enquanto você segura a série. Deixe a carga em 0 para isometria com peso corporal.</Dim> : null}
      <ProgressionFields ex={ex} mode={mode} c={c} setC={setC} routine={routine} unit={unit} />
      <Button variant="primary" title={existing ? 'Salvar' : 'Adicionar'} onPress={save} />
      {ex.custom ? <><Gap /><Button icon="pencil" title="Editar ou apagar este exercício" onPress={() => { close(); customExSheet(ex) }} /></> : null}
      {onDelete ? <><Gap /><Button variant="danger" title="Remover da rotina" onPress={() => { close(); onDelete() }} /></> : null}
    </>
  )
}
export const exConfigSheet = (ex: Ex, existing: Cfg | null, onSave: (cfg: any) => void, onDelete?: (() => void) | null, routine?: Routine | null) =>
  openSheet(close => <ExConfig ex={ex} existing={existing} onSave={onSave} onDelete={onDelete} routine={routine} close={close} />)

/* ---------------- ícone da rotina ---------------- */

export const glyphPicker = (current: string | undefined, onPick: (g: string) => void) => {
  const cur = glyphOf(current)
  return openSheet(close => (
    <>
      <H2>Escolha um ícone</H2>
      {GLYPH_GROUPS.map(g => (
        <View key={g.key} style={{ marginBottom: 14 }}>
          <SecTitle style={{ marginTop: 6 }}>{g.key}</SecTitle>
          <RowV style={{ gap: 10 }}>
            {g.items.map(n => (
              <Pressable key={n} onPress={() => { close(); onPick(n) }} accessibilityLabel={n}
                style={{ flex: 1, aspectRatio: 1, borderRadius: 14, backgroundColor: n === cur ? C.surface3 : C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: n === cur ? 1.5 : 0, borderColor: C.label2 }}>
                <Icon name={GLYPH_ICON[n]} size={26} color={C.label} />
              </Pressable>
            ))}
          </RowV>
        </View>
      ))}
    </>
  ))
}
