// Plano semanal e rotinas, mais o editor de rotina. Portado de openGym/frontend/src/views/Plan.jsx
// e RoutineEdit.jsx.
import { useEffect } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { exOr } from '../core/exercises'
import { DAYN, capitalize, exCount, uid } from '../core/format'
import { cleanupSg, exLine, supersetUnits } from '../core/history'
import { t } from '../core/i18n'
import { loadOfRoutine, rankOf } from '../core/muscles'
import { POLICIES_FOR, POLICY_DESC, POLICY_NAME } from '../core/progression'
import { useNav } from '../nav'
import { confirmSheet } from '../sheets/common'
import { exConfigSheet, exercisePicker, glyphPicker } from '../sheets/exercise'
import { dayAssignSheet, loadStarterPlan, planToolsSheet } from '../sheets/plan'
import { update, useStore, type Cfg } from '../store/useStore'
import { BodyMap, muscleName } from '../ui/charts'
import { DEFAULT_GLYPH, Icon, glyphIcon } from '../ui/icons'
import { Button, Card, Chip, Chips, Dim, Empty, Gap, H2, Header, IconBtn, IconTile, Item, List, RowV, Screen, SecTitle, Tag, Thumb, useAccent } from '../ui/kit'
import { C, PAD } from '../ui/theme'

export function Plan() {
  const S = useStore(s => s.S)
  const go = useNav(s => s.go)
  const addRoutine = () => {
    const r = { id: uid(), name: 'Nova rotina', emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    go('plan', { name: 'routine', id: r.id })
  }
  return (
    <Screen header={<Header title="Plano" sub="Sua rotina semanal" right={<IconBtn name="share-variant" label="Compartilhar plano" onPress={planToolsSheet} />} />}>
      <View style={{ paddingHorizontal: PAD }}>
        <SecTitle style={{ marginTop: 0 }}>Agenda da semana</SecTitle>
        <List>
          {[1, 2, 3, 4, 5, 6, 0].map(d => {
            const r = S.routines.find(x => x.id === S.week[d])
            return (
              <Item key={d} title={t(DAYN[d])} onPress={() => dayAssignSheet(d)} chevron
                right={r ? <Tag icon={glyphIcon(r.emoji)} label={r.name} accent /> : <Tag label="Descanso" />} />
            )
          })}
        </List>
        <RowV style={{ justifyContent: 'space-between', marginTop: 22, marginBottom: 8 }}>
          <SecTitle style={{ marginTop: 0, marginBottom: 0 }}>Rotinas</SecTitle>
          <Button size="sm" variant="tinted" icon="plus" title="Nova" onPress={addRoutine} />
        </RowV>
        {S.routines.length ? (
          <List>
            {S.routines.map(r => (
              <Item key={r.id} left={<IconTile name={glyphIcon(r.emoji)} />} title={r.name} subtitle={exCount(r.ex.length)} chevron
                onPress={() => go('plan', { name: 'routine', id: r.id })} />
            ))}
          </List>
        ) : (
          <>
            <Empty icon="clipboard-text-outline">Nenhuma rotina ainda.{'\n'}Crie uma ou carregue o plano inicial.</Empty>
            <Button icon="star-four-points" title="Carregar plano inicial (Push / Pull / Legs)" onPress={loadStarterPlan} />
          </>
        )}
      </View>
    </Screen>
  )
}

export function RoutineEdit({ id }: { id: string }) {
  const S = useStore(s => s.S)
  const back = useNav(s => s.back)
  const acc = useAccent()
  const r = S.routines.find(x => x.id === id)
  useEffect(() => { if (!r) back() }, [!!r])
  if (!r) return null

  const edit = (fn: (ex: Cfg[]) => void) => update(s => { fn(s.routines.find(x => x.id === id)!.ex) })
  const move = (i: number, dir: number) => edit(ex => { const j = i + dir; if (j < 0 || j >= ex.length) return; [ex[i], ex[j]] = [ex[j], ex[i]]; cleanupSg(ex) })
  const toggleLink = (i: number) => edit(ex => {
    if (i < 1) return
    const cur = ex[i], prev = ex[i - 1]
    if (cur.sg && prev.sg && cur.sg === prev.sg) delete cur.sg
    else { const gid = prev.sg || 'sg' + uid(); prev.sg = gid; cur.sg = gid }
    cleanupSg(ex)
  })
  const units = supersetUnits(r.ex)
  const unitFirst = new Set(units.filter((u: number[]) => u.length > 1).map((u: number[]) => u[0]))
  const inSS = new Set(units.filter((u: number[]) => u.length > 1).flat())
  const load = loadOfRoutine(r)
  const { worked } = rankOf(load)

  return (
    <Screen header={
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingTop: 6, paddingBottom: 12, gap: 10 }}>
        <IconBtn name="chevron-left" label="Voltar ao plano" onPress={back} />
        <TextInput defaultValue={r.name} placeholder="Nome da rotina" placeholderTextColor={C.label3}
          onEndEditing={e => { const v = e.nativeEvent.text.trim(); update(s => { s.routines.find(x => x.id === id)!.name = v || 'Rotina' }) }}
          style={{ flex: 1, color: C.label, fontSize: 22, fontWeight: '800', backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }} />
        <IconBtn name={glyphIcon(r.emoji)} label="Escolher ícone" onPress={() => glyphPicker(r.emoji, g => update(s => { s.routines.find(x => x.id === id)!.emoji = g }))} />
      </View>
    }>
      <View style={{ paddingHorizontal: PAD }}>
        <SecTitle style={{ marginTop: 0 }}>Progressão da rotina</SecTitle>
        <Chips wrap>
          {POLICIES_FOR.reps.map((p: string) => <Chip key={p} label={t((POLICY_NAME as any)[p])} on={(r.prog || 'linear') === p} onPress={() => update(s => { s.routines.find(x => x.id === id)!.prog = p })} />)}
        </Chips>
        <Dim style={{ marginTop: 8, marginBottom: 16 }}>
          {t((POLICY_DESC as any)[r.prog || 'linear'])} Vale para todo exercício desta rotina que não tenha regra própria.
        </Dim>

        {r.ex.length ? (
          <List>
            {r.ex.map((e, i) => {
              const ex = exOr(e.id)
              const linkedPrev = i > 0 && !!e.sg && r.ex[i - 1].sg === e.sg
              return (
                <View key={i}>
                  {unitFirst.has(i) ? <RowV style={{ gap: 5, paddingHorizontal: 14, paddingTop: 8 }}><Icon name="link-variant" size={14} color={acc} /><Text style={{ color: acc, fontSize: 12, fontWeight: '700' }}>SUPERSET</Text></RowV> : null}
                  <View style={{ borderLeftWidth: inSS.has(i) ? 3 : 0, borderLeftColor: acc }}>
                    <Item left={<Thumb ex={ex} />} title={capitalize(ex.n)} subtitle={exLine(e, S.unit)}
                      onPress={() => exConfigSheet(ex, e, cfg => edit(x => { x[i] = { id: x[i].id, sg: x[i].sg, ...cfg } }), () => edit(x => { x.splice(i, 1); cleanupSg(x) }), r)}
                      right={
                        <View style={{ alignItems: 'center', gap: 2 }}>
                          {i > 0 ? (
                            <Pressable onPress={() => toggleLink(i)} hitSlop={6} accessibilityLabel="Superset com o exercício de cima"
                              style={{ width: 32, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: linkedPrev ? acc : C.surface2 }}>
                              <Icon name="link-variant" size={15} color={linkedPrev ? '#000' : C.label2} />
                            </Pressable>
                          ) : null}
                          <RowV style={{ gap: 2 }}>
                            <Pressable onPress={() => move(i, -1)} hitSlop={4} accessibilityLabel="Mover para cima" style={{ width: 28, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: C.surface2 }}><Icon name="chevron-up" size={16} color={C.label2} /></Pressable>
                            <Pressable onPress={() => move(i, 1)} hitSlop={4} accessibilityLabel="Mover para baixo" style={{ width: 28, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: C.surface2 }}><Icon name="chevron-down" size={16} color={C.label2} /></Pressable>
                          </RowV>
                        </View>
                      } />
                  </View>
                </View>
              )
            })}
          </List>
        ) : <Empty icon="dumbbell">Nenhum exercício ainda: adicione o primeiro.</Empty>}
      </View>

      {r.ex.length ? (
        <Card style={{ marginTop: 12 }}>
          <H2>O que este treino trabalha</H2>
          <BodyMap load={load} body={S.body} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{worked.slice(0, 6).map((m: string) => <Tag key={m} label={muscleName(m)} />)}</View>
        </Card>
      ) : null}

      <View style={{ paddingHorizontal: PAD }}>
        <RowV style={{ gap: 5, marginVertical: 10 }}>
          <Icon name="link-variant" size={13} color={C.label3} />
          <Dim style={{ flex: 1 }}>Toque no botão de link de um exercício para fazer superset com o de cima: vocês fazem um seguido do outro.</Dim>
        </RowV>
        <Button variant="primary" icon="plus" title="Adicionar exercício"
          onPress={() => exercisePicker(ex => exConfigSheet(ex, null, cfg => edit(x => { x.push({ id: ex.id, ...cfg }) }), null, r))} />
        <Gap h={10} />
        <Button variant="danger" title="Apagar rotina" onPress={() => confirmSheet({
          title: 'Apagar rotina?', message: `“${r.name}” e seus exercícios serão removidos.`, confirmText: 'Apagar', danger: true,
          onConfirm: () => {
            update(s => {
              s.routines = s.routines.filter(x => x.id !== id)
              Object.keys(s.week).forEach(k => { if (s.week[k] === id) delete s.week[k] })
              Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === id) delete s.dayPlan[k] })
            })
            back()
          },
        })} />
      </View>
    </Screen>
  )
}
