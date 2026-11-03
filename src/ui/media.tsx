// Demonstração do exercício, o equivalente RN do Media.jsx do openGym.
// Vídeo licenciado (se configurado) ou fotos inicial/final alternadas, e sempre um atalho
// para o vídeo no YouTube. No treino pode ser minimizada, como o "gifSize" do original.
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native'
import type { Ex } from '../core/exercises'
import { PHOTO_CREDIT, framesOf, videoOf, youtubeSearchUrl } from '../core/media'
import { update, useStore } from '../store/useStore'
import { Icon } from './icons'
import { C, R } from './theme'

function VideoDemo({ uri, height }: { uri: string; height: number }) {
  const player = useVideoPlayer(uri, p => { p.loop = true; p.muted = true; p.play() })
  return (
    <VideoView player={player} nativeControls={false} contentFit="contain"
      style={{ width: '100%', height, backgroundColor: '#fff', borderRadius: R.md }} />
  )
}

/** Alterna posição inicial e final a cada 1,1 s; toque pausa/retoma. */
function FramesDemo({ frames, height }: { frames: [string, string]; height: number }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [loaded, setLoaded] = useState([false, false])
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (paused || !loaded[0] || !loaded[1]) return
    const t = setInterval(() => setI(x => 1 - x), 1100)
    return () => clearInterval(t)
  }, [paused, loaded[0], loaded[1]])
  if (failed) return null
  return (
    <Pressable onPress={() => setPaused(p => !p)} accessibilityLabel={paused ? 'Retomar demonstração' : 'Pausar demonstração'}
      style={{ height, borderRadius: R.md, overflow: 'hidden', backgroundColor: C.surface2 }}>
      {frames.map((uri, k) => (
        <Image key={uri} source={{ uri }} resizeMode="cover"
          onLoad={() => setLoaded(l => (k === 0 ? [true, l[1]] : [l[0], true]))} onError={() => setFailed(true)}
          style={{ position: 'absolute', width: '100%', height: '100%', opacity: i === k ? 1 : 0 }} />
      ))}
      {!loaded[0] ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.label2} /></View> : null}
      <View style={{ position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', gap: 6 }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' }}>
          {i === 0 ? 'Início' : 'Fim'}{paused ? ' · pausado' : ''}
        </Text>
      </View>
    </Pressable>
  )
}

export function YouTubeLink({ ex, compact }: { ex: Ex; compact?: boolean }) {
  return (
    <Pressable onPress={() => Linking.openURL(youtubeSearchUrl(ex))} accessibilityRole="link"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: compact ? 6 : 9, opacity: pressed ? 0.6 : 1 })}>
      <Icon name="youtube" size={compact ? 18 : 20} color="#ff3b30" />
      <Text style={{ color: C.label, fontSize: compact ? 14 : 15, fontWeight: '600' }}>Ver vídeo de execução no YouTube</Text>
      <Icon name="open-in-new" size={14} color={C.label3} />
    </Pressable>
  )
}

export function ExerciseMedia({ ex, compact, minimizable }: { ex: Ex; compact?: boolean; minimizable?: boolean }) {
  const gifSize = useStore(s => s.S.gifSize)
  const video = videoOf(ex)
  const frames = framesOf(ex)
  const mini = minimizable && gifSize === 'mini'
  const height = compact ? 170 : 220
  const toggle = () => update(s => { s.gifSize = mini ? 'full' : 'mini' })

  if (!video && !frames) return <YouTubeLink ex={ex} compact={compact} />
  return (
    <View style={{ marginBottom: 6 }}>
      {mini ? null : video ? <VideoDemo uri={video} height={height} /> : <FramesDemo frames={frames!} height={height} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <YouTubeLink ex={ex} compact />
        {minimizable ? (
          <Pressable onPress={toggle} hitSlop={8} accessibilityLabel={mini ? 'Mostrar demonstração' : 'Esconder demonstração'}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name={mini ? 'chevron-down' : 'chevron-up'} size={16} color={C.label2} />
            <Text style={{ color: C.label2, fontSize: 13 }}>{mini ? 'Mostrar' : 'Esconder'}</Text>
          </Pressable>
        ) : null}
      </View>
      {!mini && !video ? <Text style={{ color: C.label3, fontSize: 11, marginTop: -2 }}>{PHOTO_CREDIT}</Text> : null}
    </View>
  )
}
