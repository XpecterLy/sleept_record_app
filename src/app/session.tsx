import * as Brightness from 'expo-brightness';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LiveBars } from '@/components/charts';
import { Icon, Row, Txt } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { confirm } from '@/lib/confirm';
import { fmtClock, fmtElapsed } from '@/lib/format';
import { useSession } from '@/lib/session';

const HOLD_MS = 1200;
const AUTO_DIM_MS = 30_000;

/** Lowers screen brightness while dimmed and restores it afterwards. */
function useNightBrightness(dim: boolean) {
  const original = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Brightness.getBrightnessAsync()
      .then((b) => (original.current = b))
      .catch(() => {});
    return () => {
      if (Platform.OS === 'android') Brightness.restoreSystemBrightnessAsync().catch(() => {});
      else if (original.current != null) Brightness.setBrightnessAsync(original.current).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (dim) Brightness.setBrightnessAsync(0.01).catch(() => {});
    else if (Platform.OS === 'android') Brightness.restoreSystemBrightnessAsync().catch(() => {});
    else if (original.current != null) Brightness.setBrightnessAsync(original.current).catch(() => {});
  }, [dim]);
}

export default function SessionScreen() {
  useKeepAwake();
  const { active, live, levels, startedAt, recovering, stop, setLiveUpdates } = useSession();
  const [dim, setDim] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [lastTouch, setLastTouch] = useState(() => Date.now());
  const [progress] = useState(() => new Animated.Value(0));
  // While dimmed the clock only shows minutes: refresh less often to save battery.
  const now = useNow(dim ? 30_000 : 1000);
  useNightBrightness(dim);

  // Stop redrawing charts/counters while the screen is dark (analysis continues).
  useEffect(() => {
    setLiveUpdates(!dim);
    return () => setLiveUpdates(true);
  }, [dim, setLiveUpdates]);

  // Auto-dim after a period without touches.
  useEffect(() => {
    if (dim) return;
    const id = setTimeout(() => setDim(true), AUTO_DIM_MS);
    return () => clearTimeout(id);
  }, [dim, lastTouch]);

  if (!active && !stopping) return <Redirect href="/" />;

  const elapsed = live?.elapsedMs ?? (startedAt ? now - startedAt : 0);
  const touch = () => setLastTouch(Date.now());

  const onPressIn = () => {
    touch();
    Animated.timing(progress, { toValue: 1, duration: HOLD_MS, useNativeDriver: false }).start();
  };
  const onPressOut = () => {
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const finish = async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    let save = true;
    if (elapsed < 10 * 60_000) {
      save = await confirm('Sesión muy corta', 'Has registrado menos de 10 minutos. ¿Quieres guardarla de todos modos?', 'Guardar');
    }
    setStopping(true);
    const id = await stop(save);
    if (id) router.replace(`/morning/${id}`);
    else router.replace('/');
  };

  const snoring = !!live?.snoringNow;
  // Move the dimmed clock slowly to avoid OLED burn-in.
  const minute = Math.floor(now / 60_000);
  const dimOffset = { top: 80 + ((minute * 37) % 300), left: 20 + ((minute * 53) % 140) };

  return (
    <View style={styles.root} onTouchStart={touch}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Row style={{ justifyContent: 'space-between', width: '100%' }}>
          <View
            style={[
              styles.pill,
              snoring && { backgroundColor: 'rgba(201,122,34,0.18)', borderColor: Colors.snore },
              recovering && { backgroundColor: 'rgba(217,162,58,0.15)', borderColor: Colors.warning },
            ]}>
            <View style={[styles.dot, { backgroundColor: recovering ? Colors.warning : snoring ? Colors.snore : Colors.good }]} />
            <Txt variant="small" color={Colors.text}>
              {recovering ? 'Reanudando micrófono…' : snoring ? 'Ronquido detectado' : 'Escuchando'}
            </Txt>
          </View>
          <Pressable onPress={() => setDim(true)} style={styles.pill} accessibilityLabel="Atenuar pantalla">
            <Icon name="moon" size={14} color={Colors.textSecondary} />
            <Txt variant="small">Modo noche</Txt>
          </Pressable>
        </Row>

        <View style={{ alignItems: 'center', gap: Spacing.two }}>
          <Txt style={styles.clock}>{fmtClock(now)}</Txt>
          <Txt variant="small">Grabando desde las {startedAt ? fmtClock(startedAt) : '--:--'}</Txt>
          <Txt variant="h3" color={Colors.textSecondary} style={{ fontVariant: ['tabular-nums'] }}>
            {fmtElapsed(elapsed)}
          </Txt>
        </View>

        <View style={{ width: '100%', gap: Spacing.three }}>
          <LiveBars levels={levels} baseline={live?.baseline ?? 30} snoring={snoring} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Mini label="Nivel" value={`${live?.db ?? '--'} dB`} />
            <Mini label="Fondo" value={`${live?.baseline ?? '--'} dB`} />
            <Mini label="Ronquidos" value={String(live?.snoreCount ?? 0)} />
            <Mini label="Episodios" value={String(live?.episodes ?? 0)} />
          </Row>
        </View>

        <View style={{ alignItems: 'center', gap: Spacing.two, width: '100%' }}>
          <Pressable
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onLongPress={finish}
            delayLongPress={HOLD_MS}
            disabled={stopping}
            style={styles.stopBtn}
            accessibilityLabel="Mantén pulsado para detener">
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: 'rgba(139,123,240,0.35)',
                  width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
            <Row gap={Spacing.two}>
              <Icon name="sun" size={20} color={Colors.text} />
              <Txt variant="h3">{stopping ? 'Generando informe…' : 'Mantén pulsado para despertar'}</Txt>
            </Row>
          </Pressable>
          <Txt variant="caption" style={{ textAlign: 'center' }}>
            La pantalla se oscurecerá sola en 30 s. Deja Noctua abierta para analizar toda la noche.
          </Txt>
        </View>
      </SafeAreaView>

      {dim ? (
        <Pressable style={styles.dim} onPress={() => setDim(false)} accessibilityLabel="Mostrar pantalla">
          <View style={{ position: 'absolute', ...dimOffset, gap: 2 }}>
            <Txt variant="h2" color="#2A2F45" style={{ fontWeight: '300' }}>
              {fmtClock(now)}
            </Txt>
            <Txt variant="caption" color="#1F2336">
              {recovering ? 'reanudando…' : 'escuchando · toca para ver'}
            </Txt>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Txt variant="h3" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
      <Txt variant="caption">{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgDeep },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four },
  clock: { fontSize: 76, lineHeight: 84, fontWeight: '200', color: Colors.text, fontVariant: ['tabular-nums'], letterSpacing: -2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stopBtn: {
    width: '100%',
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
});
