// Plano: plano inicial, compartilhar/imprimir/importar plano, ajustar um dia e a agenda da semana.
// Portado de openGym/frontend/src/sheets.jsx. A impressão usa expo-print (PDF pela folha do iOS).
import * as Print from 'expo-print'
import { useState } from 'react'
import { View } from 'react-native'
import { DAYN, exCount, fmtDate, todayISO } from '../core/format'
import { effectiveRoutineId } from '../core/history'
import { t } from '../core/i18n'
import { pickText, shareText } from '../core/native'
import { buildPlanBundle, mergePlan, parsePlan, planPrintHTML } from '../core/plan-share'
import { starterRoutines } from '../core/starter'
import { nav } from '../nav'
import { update, useStore } from '../store/useStore'
import { openSheet, toast } from '../store/useUI'
import { Icon, glyphIcon } from '../ui/icons'
import { Button, Dim, Gap, H2, IconTile, Item, List, Muted, RowV, SecTitle, Switch, Body } from '../ui/kit'
import { C } from '../ui/theme'

export function loadStarterPlan() {
  const [push, pull, legs] = starterRoutines()
  update(st => {
    st.routines.push(push, pull, legs)
    st.week[1] = push.id; st.week[3] = pull.id; st.week[5] = legs.id
  })
  toast('Plano inicial carregado: seg Push · qua Pull · sex Legs')
}

/* ---------------- compartilhar / imprimir / importar ---------------- */

function PlanTools({ close }: { close: () => void }) {
  const st = useStore(s => s.S)
  const has = st.routines.some(r => r.ex?.length)
  const exportFile = async () => {
    const json = JSON.stringify(buildPlanBundle(st, ''), null, 2)
    try { await shareText(json, 'opengym-plano-' + todayISO() + '.json') } catch { /* folha fechada */ }
    close()
  }
  const print = async () => {
    try { await Print.printAsync({ html: planPrintHTML(st, '') }) } catch { /* cancelado */ }
  }
  const importFile = async () => {
    try {
      const f = await pickText(['application/json', 'public.json', '*/*'])
      if (!f) return
      const bundle = parsePlan(f.text)
      close()
      planImportSheet(bundle)
    } catch (e: any) { toast('Falha ao importar: ' + (e?.message || 'arquivo inválido')) }
  }
  return (
    <>
      <H2>Compartilhar seu plano</H2>
      <Muted style={{ marginBottom: 16 }}>Mande suas rotinas para um amigo ou coloque a semana no papel.</Muted>
      <Button variant="primary" icon="export-variant" title="Exportar arquivo do plano" onPress={exportFile} disabled={!has} />
      <Dim style={{ marginTop: 6, marginBottom: 12 }}>Um arquivo pequeno que um amigo importa no openGym dele (web ou este app). Só rotinas: nada dos seus treinos ou pesagens.</Dim>
      <Button variant="tinted" icon="printer" title="Imprimir / Salvar em PDF" onPress={print} disabled={!has} />
      <Dim style={{ marginTop: 6 }}>Uma página limpa por plano, sem exercício quebrado entre páginas.</Dim>
      {!has ? <Dim style={{ marginTop: 12 }}>Adicione um exercício a uma rotina primeiro: um plano vazio não tem o que compartilhar.</Dim> : null}
      <SecTitle>Recebeu um plano?</SecTitle>
      <Button variant="ghost" icon="file-import-outline" title="Importar arquivo de plano" onPress={importFile} />
    </>
  )
}
export const planToolsSheet = () => openSheet(close => <PlanTools close={close} />)

function PlanImport({ bundle, close }: { bundle: any; close: () => void }) {
  const [schedule, setSchedule] = useState(false)
  return (
    <>
      <H2>{bundle.name ? `Importar “${bundle.name}”` : 'Importar este plano'}</H2>
      <Muted style={{ marginBottom: 12 }}>
        {bundle.routineCount === 1 ? '1 rotina' : `${bundle.routineCount} rotinas`} · {exCount(bundle.exerciseCount)}
        {bundle.scheduledDays > 0 ? ` · agendado em ${bundle.scheduledDays} ${bundle.scheduledDays === 1 ? 'dia' : 'dias'}` : ''}
      </Muted>
      <Dim style={{ marginBottom: 12 }}>Entram como rotinas novas: nada do que você já tem é alterado.</Dim>
      {bundle.dropped > 0 ? <Dim style={{ color: C.yellow, marginBottom: 12 }}>{bundle.dropped} exercício(s) do arquivo não estão na biblioteca e ficaram de fora.</Dim> : null}
      {bundle.scheduledDays > 0 ? (
        <RowV style={{ justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: C.sep, marginBottom: 16, gap: 12 }}>
          <View style={{ flex: 1 }}><Body style={{ fontWeight: '600' }}>Usar esta agenda semanal</Body><Dim>Substitui o que você tem de segunda a domingo.</Dim></View>
          <Switch value={schedule} onChange={setSchedule} />
        </RowV>
      ) : null}
      <Button variant="primary" title="Adicionar ao meu plano" onPress={() => {
        update(s => { mergePlan(s, bundle, { schedule }) })
        close()
        toast(`${bundle.routineCount} rotina(s) adicionada(s) ao seu plano`)
        nav('/plan')
      }} />
    </>
  )
}
export const planImportSheet = (bundle: any) => openSheet(close => <PlanImport bundle={bundle} close={close} />)

/* ---------------- um dia específico / agenda da semana ---------------- */

function DayOverride({ iso, close }: { iso: string; close: () => void }) {
  const st = useStore(s => s.S)
  const wd = new Date(iso + 'T12:00:00').getDay()
  const weekly = st.routines.find(r => r.id === st.week[wd])
  const hasOvr = st.dayPlan[iso] !== undefined
  const effId = effectiveRoutineId(st, iso)
  const set = (v: string) => {
    update(s => { if (!v) delete s.dayPlan[iso]; else s.dayPlan[iso] = v })
    close()
    toast(v === '' ? 'De volta ao plano semanal' : v === 'rest' ? `${fmtDate(iso)}: descanso` : `${st.routines.find(r => r.id === v)?.name} em ${fmtDate(iso)}`)
  }
  const check = <Icon name="check" size={20} color={C.green} />
  return (
    <>
      <H2>{fmtDate(iso, true)}</H2>
      <Muted style={{ marginBottom: 12 }}>
        Plano semanal: {weekly ? weekly.name : 'Descanso'}{hasOvr ? ' · alterado neste dia' : ''}{'\n'}
        Doente, perdeu um dia ou quer outro treino? Escolha o que treinar.
      </Muted>
      <List>
        {st.routines.map(r => <Item key={r.id} left={<IconTile name={glyphIcon(r.emoji)} />} title={r.name} subtitle={exCount(r.ex.length)} onPress={() => set(r.id)} right={effId === r.id ? check : null} />)}
        <Item left={<IconTile name="weather-night" bg={C.surface3} />} title="Descanso / pular este dia" onPress={() => set('rest')} right={effId === null ? check : null} />
        {hasOvr ? <Item left={<IconTile name="restore" bg={C.surface3} />} title="Voltar ao plano semanal" onPress={() => set('')} /> : null}
      </List>
    </>
  )
}
export const dayOverrideSheet = (iso: string) => openSheet(close => <DayOverride iso={iso} close={close} />)

function DayAssign({ day, close }: { day: number; close: () => void }) {
  const st = useStore(s => s.S)
  const set = (v: string) => { update(s => { if (v) s.week[day] = v; else delete s.week[day] }); close() }
  const check = <Icon name="check" size={20} color={C.green} />
  return (
    <>
      <H2>{t(DAYN[day])}</H2>
      <List>
        <Item left={<IconTile name="weather-night" bg={C.surface3} />} title="Dia de descanso" onPress={() => set('')} right={!st.week[day] ? check : null} />
        {st.routines.map(r => <Item key={r.id} left={<IconTile name={glyphIcon(r.emoji)} />} title={r.name} subtitle={exCount(r.ex.length)} onPress={() => set(r.id)} right={st.week[day] === r.id ? check : null} />)}
      </List>
      <Gap />
    </>
  )
}
export const dayAssignSheet = (day: number) => openSheet(close => <DayAssign day={day} close={close} />)
