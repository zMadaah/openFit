// Equivalente React Native de openGym/frontend/src/lib/mobile.js e sound.js:
// lembrete de dia de treino, compartilhar/ler arquivos e retorno tátil.
import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import * as Sharing from 'expo-sharing'
import { Vibration } from 'react-native'

type ReminderState = {
  reminder?: { on?: boolean; time?: string }
  week?: Record<string, string>
  routines?: { id: string; name: string }[]
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
})

const REMINDER_KIND = 'opengym-workout-day'

/**
 * (Re)agenda o lembrete: uma notificação semanal para cada dia que tem rotina no plano.
 * `interactive` permite pedir a permissão do sistema (só a partir do interruptor em Ajustes).
 */
export async function syncReminder(S: ReminderState, interactive = false): Promise<boolean> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(
      scheduled
        .filter(n => n.content.data?.kind === REMINDER_KIND)
        .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    )
    const r = S.reminder
    if (!r?.on) return true
    let perm = await Notifications.getPermissionsAsync()
    if (!perm.granted && interactive) perm = await Notifications.requestPermissionsAsync()
    if (!perm.granted) return false
    const [hour, minute] = (r.time || '08:00').split(':').map(Number)
    const days = Object.entries(S.week || {}).filter(([, rid]) => rid && (S.routines || []).some(x => x.id === rid))
    for (const [day, rid] of days) {
      const name = S.routines!.find(x => x.id === rid)!.name
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Dia de treino', body: `${name} está no plano de hoje. Bora!`, data: { kind: REMINDER_KIND } },
        // expo-notifications: 1 = domingo … 7 = sábado; S.week usa getDay() 0…6.
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: Number(day) + 1, hour, minute },
      })
    }
    return true
  } catch {
    return false
  }
}

/** Grava um texto num arquivo temporário e abre a folha de compartilhamento do iOS. */
export async function shareText(text: string, filename: string, mimeType = 'application/json') {
  const file = new File(Paths.cache, filename)
  if (file.exists) file.delete()
  file.create()
  await file.write(text)
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename, UTI: mimeType === 'application/json' ? 'public.json' : undefined })
}

/** Abre o seletor de arquivos e devolve o conteúdo em texto, ou null se cancelado. */
export async function pickText(types: string[] = ['*/*']): Promise<{ name: string; text: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false })
  if (res.canceled || !res.assets?.length) return null
  const a = res.assets[0]
  return { name: a.name, text: await new File(a.uri).text() }
}

// Segue o ajuste "Vibração e sons" (S.sound), atualizado pelo App.
let feedbackOn = true
export const setFeedback = (on: boolean) => { feedbackOn = on }

export const tap = () => { if (feedbackOn) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) }
export const success = () => { if (feedbackOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) }
export const alarm = () => {
  if (!feedbackOn) return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
  Vibration.vibrate([0, 300, 150, 300])
}
