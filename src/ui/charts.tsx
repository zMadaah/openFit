// Gráficos portados de openGym/frontend/src/components (LineChart, BodyMap, Heatmap) para react-native-svg.
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, Polyline, Stop, Text as SvgText } from 'react-native-svg'
import BODY from '../core/body-paths'
import { MUSCLES, INERT, MUSCLE_NAME, levelsOf } from '../core/muscles'
import { fmtDate, fmtNum, fmtVol, isoOf, MONTHS, todayISO } from '../core/format'
import { t } from '../core/i18n'
import { C, alpha } from './theme'
import { useAccent } from './kit'

export type Pt = { t: number; y: number; d?: string; m?: number | null; note?: string }

const W = 340

/** Linha com área, eixos e toque para ver o valor. `invert` para escalas que descem (RIR). */
export function LineChart({ points, h = 150, unit = '', color, axes = true, goal = null, invert = false }: {
  points: Pt[]; h?: number; unit?: string; color?: string; axes?: boolean; goal?: number | null; invert?: boolean
}) {
  const acc = useAccent()
  const col = color || acc
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  if (!points || !points.length) return <Text style={{ color: C.label3, fontSize: 13, paddingVertical: 20, textAlign: 'center' }}>Sem dados ainda</Text>

  const H = h
  const P = { l: axes ? 34 : 8, r: 12, t: 10, b: axes ? 22 : 8 }
  const single = points.length === 1
  const pts = single ? [points[0], points[0]] : points
  const ys = pts.map(p => p.y)
  let ymin = Math.min(...ys), ymax = Math.max(...ys)
  if (goal != null && isFinite(goal)) { ymin = Math.min(ymin, goal); ymax = Math.max(ymax, goal) }
  if (ymin === ymax) { ymin -= 1; ymax += 1 }
  const pad = (ymax - ymin) * 0.12; ymin -= pad; ymax += pad
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1
  const X = (tv: number) => (t1 === t0 ? (P.l + W - P.r) / 2 : P.l + (tv - t0) / (t1 - t0) * (W - P.l - P.r))
  const Y = (y: number) => { const f = (y - ymin) / (ymax - ymin); return P.t + (invert ? f : 1 - f) * (H - P.t - P.b) }

  const grid: any[] = []
  if (axes) {
    const raw = (ymax - ymin) / 3
    const pow = Math.pow(10, Math.floor(Math.log10(raw)))
    let step = 10 * pow
    for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * pow) { step = m * pow; break }
    for (let v = Math.ceil(ymin / step) * step; v <= ymax + 1e-9; v += step) {
      const y = Y(v)
      grid.push(<G key={'y' + v}>
        <Line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke={C.sep} strokeWidth={1} strokeDasharray="2 4" />
        <SvgText x={P.l - 5} y={y + 3.5} textAnchor="end" fontSize={9.5} fill={C.label2}>{fmtNum(v)}</SvgText>
      </G>)
    }
    const d0 = new Date(t0), d1 = new Date(t1)
    const ticks: { t: number; txt: string; anchor?: 'start' | 'middle' | 'end' }[] = []
    let m = new Date(d0.getFullYear(), d0.getMonth() + 1, 1)
    while (m <= d1) { ticks.push({ t: +m, txt: t(MONTHS[m.getMonth()]) }); m = new Date(m.getFullYear(), m.getMonth() + 1, 1) }
    if (!ticks.length && !single) {
      for (let i = 0; i <= 2; i++) {
        const tv = t0 + (t1 - t0) * i / 2, dd = new Date(tv)
        ticks.push({ t: tv, txt: dd.getDate() + ' ' + t(MONTHS[dd.getMonth()]), anchor: i === 0 ? 'start' : i === 2 ? 'end' : 'middle' })
      }
    }
    const every = Math.max(1, Math.ceil(ticks.length / 7))
    ticks.forEach((tk, i) => {
      if (i % every) return
      const x = X(tk.t)
      grid.push(<G key={'x' + i}>
        <Line x1={x} y1={P.t} x2={x} y2={H - P.b} stroke={C.sep} strokeWidth={1} strokeDasharray="2 4" />
        <SvgText x={x} y={H - 7} textAnchor={tk.anchor || 'middle'} fontSize={9.5} fill={C.label2}>{tk.txt}</SvgText>
      </G>)
    })
  }

  const poly = pts.map(p => X(p.t).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ')
  const last = pts[pts.length - 1]
  const gid = 'g' + Math.round(t0 % 1e7) + '_' + H
  const marked = points.some(p => p.m != null)
  const hp = hover != null ? points[hover] : null

  const pick = (lx: number) => {
    if (!width) return
    const vx = lx / width * W
    let best = 0
    points.forEach((p, i) => { if (Math.abs(X(p.t) - vx) < Math.abs(X(points[best].t) - vx)) best = i })
    setHover(best)
  }

  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
      onResponderGrant={e => pick(e.nativeEvent.locationX)} onResponderMove={e => pick(e.nativeEvent.locationX)}
      onResponderRelease={() => setTimeout(() => setHover(null), 1800)}>
      <Svg width="100%" height={width ? width * H / W : H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={col} stopOpacity={0.28} />
            <Stop offset="1" stopColor={col} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {grid}
        {goal != null && isFinite(goal) ? <G>
          <Line x1={P.l} y1={Y(goal)} x2={W - P.r} y2={Y(goal)} stroke={C.yellow} strokeWidth={1.6} strokeDasharray="7 4" />
          <SvgText x={W - P.r - 2} y={Y(goal) - 5} textAnchor="end" fontSize={9.5} fontWeight="700" fill={C.yellow}>{fmtNum(goal)}</SvgText>
        </G> : null}
        <Polygon points={`${P.l},${H - P.b} ${poly} ${X(last.t).toFixed(1)},${H - P.b}`} fill={`url(#${gid})`} />
        <Polyline points={poly} fill="none" stroke={col} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {marked ? pts.map((p, i) => (p.m == null ? null : <Circle key={'m' + i} cx={X(p.t)} cy={Y(p.y)} r={2.4 + p.m * 3} fill={col} opacity={0.3 + p.m * 0.7} />)) : null}
        <Circle cx={X(last.t)} cy={Y(last.y)} r={4} fill={col} />
        {hp ? <G>
          <Line x1={X(hp.t)} y1={P.t} x2={X(hp.t)} y2={H - P.b} stroke={C.label3} strokeWidth={1} strokeDasharray="3 3" />
          <Circle cx={X(hp.t)} cy={Y(hp.y)} r={5} fill={col} stroke={C.bg} strokeWidth={2} />
        </G> : null}
      </Svg>
      {hp ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 2, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ backgroundColor: C.surface3, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
            <Text style={{ color: C.label, fontSize: 12, fontWeight: '600' }}>
              {fmtDate(hp.d || isoOf(new Date(hp.t)), true)} · {fmtNum(hp.y)}{unit ? ' ' + unit : ''}{hp.note ? ' · ' + hp.note : ''}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

/* ---------------- mapa muscular ---------------- */

const shade = (acc: string, lv: number) => (lv <= 0 ? C.surface2 : alpha(acc, [0, 0.3, 0.5, 0.75, 1][lv]))

function BodyView({ view, levels, onMuscle, selected, acc }: any) {
  return (
    <Svg viewBox={view.vb} style={{ flex: 1, aspectRatio: aspectOf(view.vb) }}>
      {INERT.map((slug: string) => (view.p[slug] || []).map((d: string, i: number) =>
        <Path key={slug + i} d={d} fill={C.surface3} opacity={0.55} />))}
      {MUSCLES.map((slug: string) => (view.p[slug] || []).map((d: string, i: number) =>
        <Path key={slug + i} d={d} fill={shade(acc, levels[slug] || 0)}
          stroke={selected === slug ? C.label : C.bg} strokeWidth={selected === slug ? 2 : 0.6}
          onPress={onMuscle ? () => onMuscle(slug) : undefined} />))}
    </Svg>
  )
}
const aspectOf = (vb: string) => { const [, , w, h] = vb.split(/\s+/).map(Number); return w && h ? w / h : 0.5 }

export function BodyMap({ load = {}, body = 'male', onMuscle, selected }: { load?: Record<string, number>; body?: string; onMuscle?: (m: string) => void; selected?: string | null }) {
  const acc = useAccent()
  const levels = levelsOf(load)
  const g = (BODY as any)[body] || (BODY as any).male
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
      <BodyView view={g.front} levels={levels} onMuscle={onMuscle} selected={selected} acc={acc} />
      <BodyView view={g.back} levels={levels} onMuscle={onMuscle} selected={selected} acc={acc} />
    </View>
  )
}

export function Legend({ less = 'Menos', more = 'Mais' }: { less?: string; more?: string }) {
  const acc = useAccent()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 4 }}>
      <Text style={{ color: C.label3, fontSize: 11, marginRight: 4 }}>{less}</Text>
      {[0, 1, 2, 3, 4].map(l => <View key={l} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: shade(acc, l) }} />)}
      <Text style={{ color: C.label3, fontSize: 11, marginLeft: 4 }}>{more}</Text>
    </View>
  )
}

export const muscleName = (m: string) => t((MUSCLE_NAME as any)[m])

/* ---------------- mapa de atividade (12 meses) ---------------- */

export function Heatmap({ S, onDay }: { S: any; onDay: (iso: string) => void }) {
  const acc = useAccent()
  const { cols, months } = useMemo(() => {
    const agg: Record<string, { n: number; vol: number; min: number }> = {}
    S.workouts.forEach((w: any) => {
      const a = agg[w.d] = agg[w.d] || { n: 0, vol: 0, min: 0 }
      a.n++; a.vol += w.vol || 0
      a.min += Math.max(0, Math.round(((w.end || w.start) - w.start) / 60000))
    })
    const mins = Object.values(agg).map(a => a.min).filter(v => v > 0).sort((a, b) => a - b)
    const q = (p: number) => (mins.length ? mins[Math.min(mins.length - 1, Math.floor(p * mins.length))] : 0)
    const t1 = q(0.25), t2 = q(0.5), t3 = q(0.75)
    const level = (a?: { min: number }) => !a ? 0 : !a.min ? 1 : a.min >= t3 ? 4 : a.min >= t2 ? 3 : a.min >= t1 ? 2 : 1
    const today = new Date(); today.setHours(12, 0, 0, 0)
    const end = new Date(today); end.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const start = new Date(end); start.setDate(end.getDate() - 52 * 7)
    const cols: { key: string; lv: number; today: boolean; future: boolean; has: boolean; title: string }[][] = []
    const months: string[] = []
    let lastMonth = -1
    for (let wk = 0; wk <= 52; wk++) {
      const cs = new Date(start); cs.setDate(start.getDate() + wk * 7)
      const mo = cs.getMonth()
      months.push(mo !== lastMonth && cs.getDate() <= 7 && wk < 51 ? t(MONTHS[mo]) : '')
      if (cs.getDate() <= 7) lastMonth = mo
      const col = []
      for (let d = 0; d < 7; d++) {
        const day = new Date(cs); day.setDate(cs.getDate() + d)
        const key = isoOf(day)
        const a = agg[key]
        col.push({ key, lv: level(a), today: key === todayISO(), future: day > today, has: !!a, title: a ? `${a.n} treino(s) · ${a.min} min · ${fmtVol(a.vol, S.unit)}` : '' })
      }
      cols.push(col)
    }
    return { cols, months }
  }, [S.workouts, S.unit])

  const CELL = 12, GAPX = 3
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: 10000, y: 0 }}>
        <View>
          <View style={{ flexDirection: 'row', marginLeft: 22, marginBottom: 3 }}>
            {months.map((m, i) => <Text key={i} style={{ width: CELL + GAPX, color: C.label3, fontSize: 10 }} numberOfLines={1}>{m}</Text>)}
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 22 }}>
              {['S', '', 'Q', '', 'S', '', ''].map((l, i) => <Text key={i} style={{ height: CELL + GAPX, color: C.label3, fontSize: 10 }}>{l}</Text>)}
            </View>
            {cols.map((col, i) => (
              <View key={i} style={{ marginRight: GAPX }}>
                {col.map(c => (
                  <Pressable key={c.key} disabled={!c.has} onPress={() => onDay(c.key)} accessibilityLabel={c.title || undefined}
                    style={{ width: CELL, height: CELL, marginBottom: GAPX, borderRadius: 3, backgroundColor: shade(acc, c.lv), opacity: c.future ? 0.25 : 1, borderWidth: c.today ? 1 : 0, borderColor: C.label }} />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <Legend less="Menos tempo" more="Mais tempo" />
    </View>
  )
}
