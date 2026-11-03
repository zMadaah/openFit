// Componentes base, equivalentes aos de openGym/frontend/src/components/ui.jsx + classes do index.css.
import { useEffect, useState, type ReactNode } from 'react'
import {
  Image, Pressable, ScrollView, StyleSheet, Switch as RNSwitch, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BP_ICON, Icon, type IconName } from './icons'
import { C, PAD, R, accentOf, alpha } from './theme'
import { useStore } from '../store/useStore'
import { fmtNum } from '../core/format'
import type { Ex } from '../core/exercises'
import { framesOf } from '../core/media'

export const useAccent = () => accentOf(useStore(s => s.S.accent))

/* ---------------- tela, cabeçalho, cartões ---------------- */

export function Screen({ children, header, scroll = true, bottomPad = 24 }: { children: ReactNode; header?: ReactNode; scroll?: boolean; bottomPad?: number }) {
  if (!scroll) return <View style={{ flex: 1 }}>{header}{children}</View>
  return (
    <View style={{ flex: 1 }}>
      {header}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottomPad }}>{children}</ScrollView>
    </View>
  )
}

export function Header({ title, sub, left, right }: { title: string; sub?: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <View style={st.hdr}>
      {left}
      <View style={{ flex: 1, marginLeft: left ? 8 : 0 }}>
        <Text style={st.h1} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={st.sub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: 6 }}>{right}</View> : null}
    </View>
  )
}

export function IconBtn({ name, onPress, color, label, size = 22, disabled }: { name: IconName; onPress: () => void; color?: string; label: string; size?: number; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityLabel={label} accessibilityRole="button" hitSlop={6}
      style={({ pressed }) => [st.iconbtn, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}>
      <Icon name={name} size={size} color={color || C.label} />
    </Pressable>
  )
}

export function Card({ children, style, onPress, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accent?: string }) {
  const body = <View style={[st.card, accent ? { borderColor: accent, borderWidth: 1 } : null, style]}>{children}</View>
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>{body}</Pressable> : body
}

export const H2 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[st.h2, style]}>{children}</Text>
export const SecTitle = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[st.sec, style]}>{children}</Text>
export const Muted = ({ children, style, lines }: { children: ReactNode; style?: StyleProp<TextStyle>; lines?: number }) =>
  <Text style={[st.muted, style]} numberOfLines={lines}>{children}</Text>
export const Dim = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[st.dim, style]}>{children}</Text>
export const Big = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[st.big, style]}>{children}</Text>
export const Body = ({ children, style, lines }: { children: ReactNode; style?: StyleProp<TextStyle>; lines?: number }) =>
  <Text style={[st.body, style]} numberOfLines={lines}>{children}</Text>
export const RowV = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) =>
  <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>
export const Gap = ({ h = 8 }: { h?: number }) => <View style={{ height: h }} />

/* ---------------- botões ---------------- */

type Variant = 'primary' | 'tinted' | 'plain' | 'ghost' | 'danger'
export function Button({ title, onPress, variant = 'plain', size, icon, trailingIcon, disabled, style, color }: {
  title: string; onPress: () => void; variant?: Variant; size?: 'sm'; icon?: IconName; trailingIcon?: IconName
  disabled?: boolean; style?: StyleProp<ViewStyle>; color?: string
}) {
  const acc = useAccent()
  const bg = { primary: acc, tinted: alpha(acc, 0.16), plain: C.surface2, ghost: 'transparent', danger: alpha(C.red, 0.16) }[variant]
  const fg = color || { primary: '#000', tinted: acc, plain: C.label, ghost: acc, danger: C.red }[variant]
  const sm = size === 'sm'
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [st.btn, sm && st.btnSm, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}>
      {icon ? <Icon name={icon} size={sm ? 15 : 19} color={fg} style={{ marginRight: 6 }} /> : null}
      <Text style={[st.btnT, sm && st.btnTSm, { color: fg }]} numberOfLines={1}>{title}</Text>
      {trailingIcon ? <Icon name={trailingIcon} size={sm ? 15 : 19} color={fg} style={{ marginLeft: 4 }} /> : null}
    </Pressable>
  )
}

/* ---------------- chips, tags ---------------- */

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName }) {
  const acc = useAccent()
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected: !!on }}
      style={[st.chip, on && { backgroundColor: acc, borderColor: acc }]}>
      {icon ? <Icon name={icon} size={13} color={on ? '#000' : C.label} style={{ marginRight: 4 }} /> : null}
      <Text style={[st.chipT, on && { color: '#000' }]}>{label}</Text>
    </Pressable>
  )
}
export function Chips({ children, wrap }: { children: ReactNode; wrap?: boolean }) {
  if (wrap) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      style={{ flexGrow: 0, marginHorizontal: -PAD }} contentContainerStyle={{ paddingHorizontal: PAD, gap: 8 }}>
      {children}
    </ScrollView>
  )
}
export function Tag({ label, icon, accent, color }: { label: string; icon?: IconName; accent?: boolean; color?: string }) {
  const acc = useAccent()
  const fg = color || (accent ? acc : C.label2)
  return (
    <View style={[st.tag, { backgroundColor: accent ? alpha(acc, 0.16) : color ? alpha(color, 0.16) : C.surface2 }]}>
      {icon ? <Icon name={icon} size={12} color={fg} style={{ marginRight: 3 }} /> : null}
      <Text style={[st.tagT, { color: fg }]}>{label}</Text>
    </View>
  )
}

/* ---------------- listas ---------------- */

export function IconTile({ name, bg, size = 32 }: { name: IconName; bg?: string; size?: number }) {
  const acc = useAccent()
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.26, backgroundColor: bg || acc, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size * 0.58} color={bg === C.surface3 ? C.label : '#000'} />
    </View>
  )
}

/** Miniatura do exercício: a foto inicial quando existe, senão um ícone pela parte do corpo. */
export function Thumb({ ex, size = 44 }: { ex: Ex; size?: number }) {
  const frames = framesOf(ex)
  if (frames) {
    return <Image source={{ uri: frames[0] }} resizeMode="cover" style={{ width: size, height: size, borderRadius: 10, backgroundColor: C.surface2 }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={ex.custom ? 'star-four-points' : BP_ICON[ex.bp] || 'dumbbell'} size={size * 0.5} color={C.label2} />
    </View>
  )
}

export function Item({ left, title, subtitle, right, onPress, chevron, titleStyle }: {
  left?: ReactNode; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; chevron?: boolean; titleStyle?: StyleProp<TextStyle>
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [st.item, pressed && { backgroundColor: C.surface2 }]}>
      {left ? <View style={{ marginRight: 12 }}>{left}</View> : null}
      <View style={{ flex: 1 }}>
        <Text style={[st.itemT, titleStyle]} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={st.itemS} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>{right}</View> : null}
      {chevron ? <Icon name="chevron-right" size={20} color={C.label3} style={{ marginLeft: 4 }} /> : null}
    </Pressable>
  )
}
export const List = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) =>
  <View style={[st.list, style]}>{children}</View>

/** Grupo de ajustes estilo iOS (Section + Row do openGym). */
export function Group({ title, footer, children }: { title?: string; footer?: string | null; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 22 }}>
      {title ? <Text style={[st.sec, { marginHorizontal: PAD }]}>{title}</Text> : null}
      <View style={[st.list, { marginHorizontal: PAD }]}>{children}</View>
      {footer ? <Text style={[st.dim, { marginHorizontal: PAD + 4, marginTop: 6 }]}>{footer}</Text> : null}
    </View>
  )
}
export function SRow({ icon, tint, title, subtitle, onPress, children, danger, chevron }: {
  icon: IconName; tint: string; title: string; subtitle?: string | null; onPress?: () => void; children?: ReactNode; danger?: boolean; chevron?: boolean
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [st.item, pressed && onPress && { backgroundColor: C.surface2 }]}>
      <View style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Icon name={icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.itemT, danger && { color: C.red }]}>{title}</Text>
        {subtitle ? <Text style={st.itemS}>{subtitle}</Text> : null}
      </View>
      {children}
      {chevron ? <Icon name="chevron-right" size={20} color={C.label3} /> : null}
    </Pressable>
  )
}

/* ---------------- controles ---------------- */

export function Segmented<T extends string | number>({ options, value, onChange, style }: {
  options: { value: T; label: string }[]; value: T | null | undefined; onChange: (v: T) => void; style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[st.seg, style]}>
      {options.map(o => {
        const on = o.value === value
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[st.segI, on && st.segOn]} accessibilityState={{ selected: on }}>
            <Text style={[st.segT, on && { color: C.label, fontWeight: '700' }]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Switch({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const acc = useAccent()
  return <RNSwitch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: acc, false: C.surface3 }} />
}

/** Campo numérico que aceita vírgula e só confirma ao sair, como o NumberField do openGym. */
export function NumberField({ value, onChange, decimal = true, nullable, style, placeholder }: {
  value: number | null | undefined; onChange: (v: number | null) => void; decimal?: boolean; nullable?: boolean
  style?: StyleProp<TextStyle>; placeholder?: string
}) {
  const shown = value == null || (value as any) === '' ? '' : fmtNum(value).replace(/\./g, '')
  const [txt, setTxt] = useState(shown)
  useEffect(() => setTxt(shown), [shown])
  const commit = () => {
    const s = txt.trim().replace(',', '.')
    if (!s) { onChange(nullable ? null : 0); return }
    const n = parseFloat(s)
    if (!isFinite(n) || n < 0) { setTxt(shown); return }
    onChange(decimal ? Math.round(n * 100) / 100 : Math.round(n))
  }
  return (
    <TextInput value={txt} onChangeText={setTxt} onEndEditing={commit} onBlur={commit} selectTextOnFocus
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'} placeholder={placeholder ?? (nullable ? '-' : '0')}
      placeholderTextColor={C.label3} style={[st.num, style]} />
  )
}

export function Stepper({ label, value, step, decimal = true, onChange, min = 0 }: {
  label: string; value: number; step: number; decimal?: boolean; onChange: (v: number) => void; min?: number
}) {
  const bump = (d: number) => onChange(Math.max(min, Math.round(((Number(value) || 0) + d * step) * 100) / 100))
  return (
    <View style={{ flex: 1 }}>
      <Text style={[st.dim, { textAlign: 'center', marginBottom: 4 }]} numberOfLines={1}>{label}</Text>
      <View style={st.stp}>
        <Pressable onPress={() => bump(-1)} style={st.stpB} accessibilityLabel={`Diminuir ${label}`} hitSlop={4}><Icon name="minus" size={18} color={C.label} /></Pressable>
        <NumberField value={value} decimal={decimal} onChange={v => onChange(Math.max(min, v ?? 0))} style={{ flex: 1, backgroundColor: 'transparent' }} />
        <Pressable onPress={() => bump(1)} style={st.stpB} accessibilityLabel={`Aumentar ${label}`} hitSlop={4}><Icon name="plus" size={18} color={C.label} /></Pressable>
      </View>
    </View>
  )
}

export function SearchField(props: TextInputProps) {
  return (
    <View style={st.search}>
      <Icon name="magnify" size={19} color={C.label3} />
      <TextInput placeholderTextColor={C.label3} autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search"
        {...props} style={{ flex: 1, color: C.label, fontSize: 17, paddingVertical: 10, marginLeft: 6 }} />
    </View>
  )
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={C.label3} {...props} style={[st.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, props.style]} />
}

export function Empty({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
      {icon ? <Icon name={icon} size={34} color={C.label3} style={{ marginBottom: 10 }} /> : null}
      <Text style={[st.muted, { textAlign: 'center', lineHeight: 21 }]}>{children}</Text>
    </View>
  )
}

export function Tiles({ items }: { items: { label: string; value: string | number; icon?: IconName; color?: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
      {items.map((t, i) => (
        <View key={i} style={st.tile}>
          <RowV>{t.icon ? <Icon name={t.icon} size={13} color={C.label2} style={{ marginRight: 4 }} /> : null}<Text style={st.dim}>{t.label}</Text></RowV>
          <Text style={[st.tileV, t.color ? { color: t.color } : null]} numberOfLines={1} adjustsFontSizeToFit>{t.value}</Text>
        </View>
      ))}
    </View>
  )
}

export const useBottomInset = () => useSafeAreaInsets().bottom

export const st = StyleSheet.create({
  hdr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingTop: 6, paddingBottom: 12 },
  h1: { color: C.label, fontSize: 30, fontWeight: '800', letterSpacing: 0.2 },
  sub: { color: C.label2, fontSize: 15, marginTop: 2 },
  h2: { color: C.label, fontSize: 19, fontWeight: '700', marginBottom: 8 },
  sec: { color: C.label2, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 18, marginBottom: 8 },
  muted: { color: C.label2, fontSize: 15 },
  dim: { color: C.label3, fontSize: 13, lineHeight: 18 },
  big: { color: C.label, fontSize: 30, fontWeight: '800' },
  body: { color: C.label, fontSize: 16 },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 14, marginHorizontal: PAD, marginBottom: 12, borderWidth: 1, borderColor: 'transparent' },
  iconbtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  btn: { borderRadius: R.md, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnSm: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: R.sm },
  btnT: { fontSize: 17, fontWeight: '700' },
  btnTSm: { fontSize: 14, fontWeight: '600' },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.sep, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.surface },
  chipT: { color: C.label, fontSize: 14, fontWeight: '500' },
  tag: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagT: { fontSize: 12, fontWeight: '600' },
  list: { backgroundColor: C.surface, borderRadius: R.lg, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep, minHeight: 50 },
  itemT: { color: C.label, fontSize: 16, fontWeight: '600' },
  itemS: { color: C.label2, fontSize: 13, marginTop: 2 },
  seg: { flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 9, padding: 2, marginBottom: 10 },
  segI: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 7 },
  segOn: { backgroundColor: C.surface3 },
  segT: { color: C.label2, fontSize: 14, fontWeight: '500' },
  num: { color: C.label, fontSize: 17, fontWeight: '700', textAlign: 'center', paddingVertical: 8, backgroundColor: C.surface2, borderRadius: 8, fontVariant: ['tabular-nums'] },
  stp: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 10 },
  stpB: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: 12 },
  input: { backgroundColor: C.surface2, color: C.label, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17 },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: C.surface, borderRadius: R.lg, padding: 12 },
  tileV: { color: C.label, fontSize: 26, fontWeight: '800', marginTop: 4 },
})
