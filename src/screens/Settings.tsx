// Ajustes. Portado de openGym/frontend/src/views/Settings.jsx, no formato da versão mobile do
// openGym: sem conta e sem servidor, dados no aparelho, backup pela folha de compartilhamento.
import DateTimePicker from '@react-native-community/datetimepicker'
import { Linking, Pressable, Text, View } from 'react-native'
import { ACCENTS, localTZ, todayISO } from '../core/format'
import { effortOf } from '../core/history'
import { pickText, shareText, syncReminder } from '../core/native'
import { buildDemoState } from '../core/demoSeed'
import { nav, useNav } from '../nav'
import { confirmSheet } from '../sheets/common'
import { loadStarterPlan } from '../sheets/plan'
import { importFromApp } from '../sheets/workout'
import { DEF, update, useStore } from '../store/useStore'
import { openSheet, toast } from '../store/useUI'
import { Icon } from '../ui/icons'
import { Dim, Group, H2, Header, IconBtn, Muted, RowV, SRow, Screen, Segmented, Switch } from '../ui/kit'
import { C, PAD } from '../ui/theme'

export function Settings() {
  const S = useStore(s => s.S)
  const replaceState = useStore(s => s.replaceState)
  const back = useNav(s => s.back)

  const doExport = async () => {
    try { await shareText(JSON.stringify(S, null, 2), 'opengym-backup-' + todayISO() + '.json'); toast('Backup exportado') } catch { /* folha fechada */ }
  }
  const doImport = async () => {
    try {
      const f = await pickText(['application/json', 'public.json', '*/*'])
      if (!f) return
      const data = JSON.parse(f.text)
      if (!data.workouts || !data.routines) throw new Error('não é um backup do openGym')
      confirmSheet({
        title: 'Importar backup?', message: 'Isso substitui todos os dados atuais pelos do arquivo.', confirmText: 'Importar', danger: true,
        onConfirm: () => { replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), data)); toast('Backup importado') },
      })
    } catch (e: any) { toast('Falha ao importar: ' + (e?.message || 'arquivo inválido')) }
  }
  const setReminder = (patch: Partial<typeof DEF.reminder>) => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), ...patch, tz: localTZ() } })
  const toggleReminder = async () => {
    const on = !S.reminder?.on
    if (on) {
      const ok = await syncReminder({ ...S, reminder: { ...(S.reminder || DEF.reminder), on: true } }, true)
      if (!ok) { toast('Não foi possível ativar as notificações'); return }
    }
    setReminder({ on })
  }
  const [hh, mm] = (S.reminder?.time || '08:00').split(':').map(Number)
  const timeValue = new Date(); timeValue.setHours(hh, mm, 0, 0)

  return (
    <Screen header={<Header title="Ajustes" left={<IconBtn name="chevron-left" label="Voltar" onPress={back} />} />} bottomPad={40}>
      <Group title="Seus dados">
        <SRow icon="lock" tint={C.green} title="Tudo fica neste celular" subtitle="Sem conta e sem nuvem. Faça backup quando quiser com Exportar, abaixo." />
        <SRow icon="rocket-launch" tint={C.indigo} title="Hospedar o openGym" subtitle="Versão web com login por passkey e sincronização entre aparelhos." chevron
          onPress={() => Linking.openURL('https://github.com/DuarteSantos8/openGym')} />
      </Group>

      <Group title="Geral" footer="Trocar a unidade só muda o rótulo: os números registrados não são convertidos (igual ao openGym).">
        <SRow icon="scale-bathroom" tint={C.teal} title="Unidade de peso">
          <Segmented style={{ width: 110, marginBottom: 0 }} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} value={S.unit} onChange={v => update(s => { s.unit = v })} />
        </SRow>
      </Group>

      <Group title="Durante o treino" footer="A tela fica ligada enquanto um treino está rodando, para você não precisar desbloquear o celular entre as séries.">
        <SRow icon="timer-outline" tint={C.orange} title="Descanso">
          <Segmented style={{ width: 190, marginBottom: 0 }} options={[60, 90, 120, 180].map(v => ({ value: v, label: v + 's' }))} value={S.restSec} onChange={v => update(s => { s.restSec = v })} />
        </SRow>
        <SRow icon="white-balance-sunny" tint={C.yellow} title="Manter a tela ligada">
          <Switch value={S.keepAwake !== false} onChange={v => update(s => { s.keepAwake = v })} />
        </SRow>
        <SRow icon="vibrate" tint={C.pink} title="Vibração e sons">
          <Switch value={!!S.sound} onChange={v => update(s => { s.sound = v })} />
        </SRow>
        <SRow icon="target" tint={C.purple} title="Esforço por série" onPress={effortHelpSheet}>
          <Segmented style={{ width: 150, marginBottom: 0 }} options={[{ value: 'none', label: 'Off' }, { value: 'rir', label: 'RIR' }, { value: 'rpe', label: 'RPE' }]}
            value={effortOf(S)} onChange={v => update(s => { s.effort = v as any; delete s.showRir })} />
        </SRow>
      </Group>

      <Group title="Notificações" footer={S.reminder?.on ? 'Lembra você neste horário nos dias que têm rotina no plano. O fim do descanso também avisa com o app em segundo plano.' : 'Com as notificações ligadas, o fim do descanso também avisa com o app em segundo plano.'}>
        <SRow icon="calendar" tint={C.orange} title="Lembrete em dia de treino">
          <Switch value={!!S.reminder?.on} onChange={toggleReminder} />
        </SRow>
        {S.reminder?.on ? (
          <SRow icon="clock-outline" tint={C.purple} title="Horário do lembrete">
            <DateTimePicker value={timeValue} mode="time" display="compact" themeVariant="dark"
              onChange={(_, d) => { if (d) setReminder({ time: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }) }} />
          </SRow>
        ) : null}
      </Group>

      <Group title="Aparência">
        <SRow icon="human-male-female" tint={C.teal} title="Mapa muscular">
          <Segmented style={{ width: 170, marginBottom: 0 }} options={[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Feminino' }]}
            value={S.body === 'female' ? 'female' : 'male'} onChange={v => update(s => { s.body = v as any })} />
        </SRow>
        <View style={{ padding: 14 }}>
          <Text style={{ color: C.label, fontSize: 16, fontWeight: '600', marginBottom: 10 }}>Cor de destaque</Text>
          <RowV style={{ gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(ACCENTS).map(([k, c]) => (
              <Pressable key={k} onPress={() => update(s => { s.accent = k })} accessibilityLabel={k}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: (S.accent || 'lime') === k ? 3 : 0, borderColor: C.label }} />
            ))}
          </RowV>
        </View>
      </Group>

      <Group title="Dados">
        <SRow icon="star-four-points" tint={C.green} title="Carregar plano inicial (PPL)" chevron onPress={loadStarterPlan} />
        <SRow icon="shuffle-variant" tint={C.teal} title="Importar de outro app" subtitle="FitNotes, Strong, Hevy, ou peso do Apple Health" chevron onPress={importFromApp} />
        <SRow icon="file-import-outline" tint={C.blue} title="Importar backup" subtitle="Também aceita backup exportado do openGym web" chevron onPress={doImport} />
        <SRow icon="export-variant" tint={C.blue} title="Exportar backup (JSON)" chevron onPress={doExport} />
        <SRow icon="flask-outline" tint={C.indigo} title="Carregar dados de exemplo" subtitle="12 semanas de treinos fictícios, para ver os gráficos" chevron
          onPress={() => confirmSheet({
            title: 'Carregar dados de exemplo?', message: 'Substitui tudo neste aparelho por um perfil de exemplo (o mesmo da demo do openGym).', confirmText: 'Carregar', danger: true,
            onConfirm: () => { replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), buildDemoState())); nav('/home'); toast('Dados de exemplo carregados') },
          })} />
        <SRow icon="trash-can-outline" tint={C.red} title="Apagar tudo" danger onPress={() => confirmSheet({
          title: 'Apagar tudo?', message: 'Apaga plano, treinos e peso corporal deste aparelho. Não dá para desfazer.', confirmText: 'Apagar tudo', danger: true,
          onConfirm: () => { replaceState(JSON.parse(JSON.stringify(DEF))); nav('/home'); toast('Todos os dados apagados') },
        })} />
      </Group>

      <View style={{ paddingHorizontal: PAD, alignItems: 'center' }}>
        <Dim style={{ textAlign: 'center' }}>
          Baseado no openGym · software livre (AGPL v3){'\n'}Catálogo de exercícios: openGym e hasaneyldrm/exercises-dataset (MIT){'\n'}Mapa muscular: MuscleMap, de Melih Colpan (MIT)
        </Dim>
      </View>
    </Screen>
  )
}

const EFFORT_ROWS = [
  ['0', '10', 'Nada sobrando: foi até a falha'],
  ['1', '9', 'Mais uma repetição no tanque'],
  ['2', '8', 'Mais duas repetições'],
  ['3', '7', 'Mais três repetições'],
  ['4+', '≤6', 'Fácil: território de aquecimento'],
]

function effortHelpSheet() {
  openSheet(() => (
    <>
      <H2>Esforço por série</H2>
      <Muted style={{ marginBottom: 12 }}>Quão difícil foi a série, anotado ao lado da carga e das repetições. Duas escalas para o mesmo julgamento, contadas de pontas opostas.</Muted>
      <View style={{ backgroundColor: C.surface, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        <RowV style={{ padding: 10, borderBottomWidth: 0.5, borderBottomColor: C.sep }}>
          <Text style={{ width: 44, color: C.label2, fontWeight: '700' }}>RIR</Text><Text style={{ width: 44, color: C.label2, fontWeight: '700' }}>RPE</Text>
          <Text style={{ flex: 1, color: C.label2, fontWeight: '700' }}>Como foi</Text>
        </RowV>
        {EFFORT_ROWS.map(([rir, rpe, feel], i) => (
          <RowV key={rir} style={{ padding: 10, backgroundColor: i === 2 ? C.surface2 : 'transparent' }}>
            <Text style={{ width: 44, color: C.label, fontWeight: '700' }}>{rir}</Text><Text style={{ width: 44, color: C.label, fontWeight: '700' }}>{rpe}</Text>
            <Text style={{ flex: 1, color: C.label }}>{feel}</Text>
          </RowV>
        ))}
      </View>
      <Dim>RIR conta as repetições que sobraram; RPE lê o mesmo esforço numa escala de 10, então RPE ≈ 10 − RIR. Escolha a que você já usa na cabeça.</Dim>
      <Dim style={{ marginTop: 8 }}>A linha destacada é onde cai a maioria das séries de trabalho. Séries já registradas mantêm a escala delas, e progressão e 1RM estimado não usam esse valor.</Dim>
      <View style={{ height: 6 }} />
      <RowV style={{ gap: 6, marginTop: 6 }}><Icon name="information-outline" size={14} color={C.label3} /><Dim>Mude a escala no seletor ao lado de “Esforço por série”.</Dim></RowV>
    </>
  ))
}
