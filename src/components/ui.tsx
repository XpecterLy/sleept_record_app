import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors, Fonts, Gradients, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { Level } from '@/lib/science';

// ---------------------------------------------------------------------------
// Icons: one semantic name → SF Symbol (iOS) + Material Symbol (Android/web)
// ---------------------------------------------------------------------------
type AndroidName = NonNullable<Extract<ComponentProps<typeof SymbolView>['name'], { android?: unknown }>['android']>;

const ICONS = {
  moon: { ios: 'moon.fill', android: 'bedtime' },
  sleep: { ios: 'moon.zzz.fill', android: 'nightlight' },
  mic: { ios: 'mic.fill', android: 'mic' },
  wave: { ios: 'waveform', android: 'graphic_eq' },
  chart: { ios: 'chart.bar.fill', android: 'bar_chart' },
  person: { ios: 'person.fill', android: 'person' },
  history: { ios: 'clock.fill', android: 'history' },
  stop: { ios: 'stop.fill', android: 'stop' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause' },
  bulb: { ios: 'lightbulb.fill', android: 'lightbulb' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  check: { ios: 'checkmark', android: 'check' },
  next: { ios: 'arrow.right', android: 'arrow_forward' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  trash: { ios: 'trash.fill', android: 'delete' },
  close: { ios: 'xmark', android: 'close' },
  brain: { ios: 'brain.head.profile', android: 'psychology' },
  lungs: { ios: 'lungs.fill', android: 'air' },
  speaker: { ios: 'speaker.wave.2.fill', android: 'volume_up' },
  sun: { ios: 'sun.max.fill', android: 'wb_sunny' },
  alcohol: { ios: 'wineglass.fill', android: 'local_bar' },
  coffee: { ios: 'cup.and.saucer.fill', android: 'coffee' },
  exercise: { ios: 'figure.run', android: 'fitness_center' },
  meal: { ios: 'fork.knife', android: 'restaurant' },
  stress: { ios: 'bolt.fill', android: 'bolt' },
  congestion: { ios: 'drop.fill', android: 'sick' },
  pills: { ios: 'pills.fill', android: 'medication' },
  phone: { ios: 'iphone', android: 'smartphone' },
  nap: { ios: 'bed.double.fill', android: 'hotel' },
  science: { ios: 'flask.fill', android: 'science' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  info: { ios: 'info.circle.fill', android: 'info' },
  timer: { ios: 'timer', android: 'timer' },
  ear: { ios: 'ear.fill', android: 'noise_aware' },
  book: { ios: 'book.fill', android: 'menu_book' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  heart: { ios: 'heart.fill', android: 'favorite' },
  settings: { ios: 'gearshape.fill', android: 'settings' },
  clipboard: { ios: 'list.bullet.clipboard.fill', android: 'assignment' },
  trendUp: { ios: 'arrow.up.right', android: 'trending_up' },
  trendDown: { ios: 'arrow.down.right', android: 'trending_down' },
  smoke: { ios: 'smoke.fill', android: 'smoking_rooms' },
} satisfies Record<string, { ios: SFSymbol; android: AndroidName }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color = Colors.text }: { name: IconName; size?: number; color?: string }) {
  const i = ICONS[name];
  return (
    <SymbolView
      name={{ ios: i.ios, android: i.android, web: i.android }}
      size={size}
      tintColor={color}
      style={{ width: size, height: size }}
    />
  );
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
type Variant = 'hero' | 'title' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label' | 'number';

export function Txt({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  return <Text style={[text[variant], color ? { color } : null, style]} {...rest} />;
}

const text = StyleSheet.create({
  hero: { fontSize: 44, lineHeight: 50, fontWeight: '700', color: Colors.text, fontFamily: Fonts.rounded, letterSpacing: -1 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', color: Colors.text, fontFamily: Fonts.rounded, letterSpacing: -0.5 },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: Colors.text, fontFamily: Fonts.rounded },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: Colors.text },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400', color: Colors.textSecondary },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: Colors.textSecondary },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '500', color: Colors.textMuted },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  number: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Fonts.rounded,
    fontVariant: ['tabular-nums'],
  },
});

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export function Background({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={Gradients.screen} style={StyleSheet.absoluteFill}>
      {children}
    </LinearGradient>
  );
}

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
  bottomInset = 120,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  bottomInset?: number;
}) {
  const inner = <View style={[styles.content, contentStyle]}>{children}</View>;
  return (
    <View style={styles.flex}>
      <Background>
        <SafeAreaView style={styles.flex} edges={edges}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={{ paddingBottom: bottomInset, alignItems: 'center' }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {inner}
            </ScrollView>
          ) : (
            <View style={[styles.flex, { alignItems: 'center' }]}>{inner}</View>
          )}
        </SafeAreaView>
      </Background>
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  tone = 'default',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'default' | 'accent' | 'warning' | 'critical';
}) {
  const toneStyle =
    tone === 'accent'
      ? { backgroundColor: Colors.accentSoft, borderColor: 'rgba(139,123,240,0.35)' }
      : tone === 'warning'
        ? { backgroundColor: 'rgba(217,162,58,0.10)', borderColor: 'rgba(217,162,58,0.35)' }
        : tone === 'critical'
          ? { backgroundColor: 'rgba(229,83,75,0.10)', borderColor: 'rgba(229,83,75,0.4)' }
          : null;
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, toneStyle, style, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

export function Row({ children, gap = Spacing.two, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: Spacing.three }}>
      <Txt variant="label">{children}</Txt>
      {action}
    </Row>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const handle = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? Colors.critical : Colors.text;
  const content = (
    <Row gap={Spacing.two} style={{ justifyContent: 'center' }}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Txt variant="h3" color={fg}>
        {title}
      </Txt>
    </Row>
  );
  return (
    <Pressable
      onPress={handle}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { borderRadius: Radius.pill, overflow: 'hidden', opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {variant === 'primary' ? (
        <LinearGradient colors={Gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.btn,
            variant === 'secondary' && { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
            variant === 'danger' && { backgroundColor: 'rgba(229,83,75,0.12)' },
          ]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({ name, onPress, label }: { name: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}>
      <Icon name={name} size={18} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.8 }]}>
      {icon ? <Icon name={icon} size={16} color={selected ? Colors.text : Colors.textSecondary} /> : null}
      <Txt variant="small" color={selected ? Colors.text : Colors.textSecondary}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function OptionList<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T; hint?: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ gap: Spacing.two }}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            style={({ pressed }) => [styles.option, sel && styles.optionSelected, pressed && { opacity: 0.85 }]}>
            <View style={{ flex: 1 }}>
              <Txt variant="h3" color={sel ? Colors.text : Colors.textSecondary}>
                {o.label}
              </Txt>
              {o.hint ? <Txt variant="caption">{o.hint}</Txt> : null}
            </View>
            <View style={[styles.radio, sel && styles.radioOn]}>{sel ? <Icon name="check" size={12} color="#fff" /> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Data display
// ---------------------------------------------------------------------------
export const levelColor = (l: Level) => (l === 'good' ? Colors.good : l === 'warning' ? Colors.warning : Colors.critical);
const levelIcon = (l: Level): IconName => (l === 'good' ? 'check' : l === 'warning' ? 'info' : 'warning');

export function StatusBadge({ level, label }: { level: Level; label: string }) {
  const c = levelColor(level);
  return (
    <View style={[styles.badge, { backgroundColor: `${c}22`, borderColor: `${c}66` }]}>
      <Icon name={levelIcon(level)} size={12} color={c} />
      <Txt variant="caption" color={Colors.text}>
        {label}
      </Txt>
    </View>
  );
}

export function Stat({
  label,
  value,
  unit,
  icon,
  hint,
  style,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: IconName;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.stat, style]}>
      <Row gap={6}>
        {icon ? <Icon name={icon} size={14} color={Colors.textMuted} /> : null}
        <Txt variant="caption">{label}</Txt>
      </Row>
      <Row gap={4} style={{ alignItems: 'baseline' }}>
        <Txt variant="number">{value}</Txt>
        {unit ? <Txt variant="small">{unit}</Txt> : null}
      </Row>
      {hint ? <Txt variant="caption">{hint}</Txt> : null}
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <Row gap={6}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 6,
            width: i === current ? 22 : 6,
            borderRadius: 3,
            backgroundColor: i <= current ? Colors.accent : Colors.border,
          }}
        />
      ))}
    </Row>
  );
}

export type Confidence = 'alta' | 'media' | 'baja';
const CONF: Record<Confidence, { level: Level; label: string }> = {
  alta: { level: 'good', label: 'Fiabilidad alta' },
  media: { level: 'warning', label: 'Estimación' },
  baja: { level: 'critical', label: 'Orientativo' },
};

/** Reliability tag shown next to metrics. */
export function ConfidenceTag({ value }: { value: Confidence }) {
  return <StatusBadge level={CONF[value].level} label={CONF[value].label} />;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginVertical: Spacing.two }} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.two,
  },
  btn: { paddingVertical: 16, paddingHorizontal: Spacing.four, alignItems: 'center', justifyContent: 'center' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.two,
  },
  optionSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two + 2 },
});
