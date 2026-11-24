import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { minuteState, type MinuteState } from '@/lib/analysis/detector';
import { fmtClock } from '@/lib/format';
import type { Night } from '@/lib/types';

import { Row, Txt } from './ui';

function useWidth(initial = 300) {
  const [w, setW] = useState(initial);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.max(100, e.nativeEvent.layout.width));
  return [w, onLayout] as const;
}

export function Legend({ items }: { items: { label: string; color: string; shape?: 'dot' | 'line' }[] }) {
  return (
    <Row gap={Spacing.three} style={{ flexWrap: 'wrap' }}>
      {items.map((i) => (
        <Row key={i.label} gap={6}>
          <View
            style={
              i.shape === 'line'
                ? { width: 14, height: 2, borderRadius: 1, backgroundColor: i.color }
                : { width: 8, height: 8, borderRadius: 4, backgroundColor: i.color }
            }
          />
          <Txt variant="caption" color={Colors.textSecondary}>
            {i.label}
          </Txt>
        </Row>
      ))}
    </Row>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return <View style={styles.tooltip}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Score ring (single headline value)
// ---------------------------------------------------------------------------
export function ScoreRing({ score, size = 132, color = Colors.accent, caption }: { score: number; size?: number; color?: string; caption?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Txt variant={size > 100 ? 'hero' : 'h2'}>{Math.round(score)}</Txt>
      {caption ? <Txt variant="caption">{caption}</Txt> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Whole-night sound timeline: area = avg level/min, lanes = snore & noise
// ---------------------------------------------------------------------------
export function SoundTimeline({ night, height = 170 }: { night: Night; height?: number }) {
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const mins = night.minutes;
  const n = Math.max(mins.length, 2);
  const laneH = 10;
  const chartH = height - laneH * 2 - 24;
  const maxDb = Math.max(60, ...mins.map((m) => m.avg)) + 5;
  const minDb = Math.max(0, Math.min(...mins.map((m) => m.avg).filter((x) => x > 0), 30) - 5);
  const x = (i: number) => (i / (n - 1)) * width;
  const y = (db: number) => chartH - ((Math.max(minDb, db) - minDb) / (maxDb - minDb)) * chartH;

  // Minutes without samples (avg 0) break the line instead of dropping to 0 dB.
  let line = '';
  let area = '';
  let segStart = -1;
  const closeSeg = (end: number) => {
    if (segStart >= 0) area += `L${x(end).toFixed(1)},${chartH}L${x(segStart).toFixed(1)},${chartH}Z`;
    segStart = -1;
  };
  mins.forEach((m, i) => {
    if (m.avg <= 0) {
      closeSeg(i - 1);
      return;
    }
    const pt = `${x(i).toFixed(1)},${y(m.avg).toFixed(1)}`;
    if (segStart < 0) {
      segStart = i;
      line += `M${pt}`;
      area += `M${pt}`;
    } else {
      line += `L${pt}`;
      area += `L${pt}`;
    }
  });
  closeSeg(mins.length - 1);
  const gapMins = mins.map((m, i) => (m.avg <= 0 ? i : -1)).filter((i) => i >= 0);

  // Hour ticks
  const ticks: { i: number; label: string }[] = [];
  const startD = new Date(night.start);
  const firstHourOffset = (60 - startD.getMinutes()) % 60;
  for (let i = firstHourOffset; i < mins.length; i += 60) ticks.push({ i, label: fmtClock(night.start + i * 60_000) });
  const step = Math.ceil(ticks.length / 6) || 1;

  const onPress = (lx: number) => {
    const i = Math.round((lx / width) * (n - 1));
    setSel(i >= 0 && i < mins.length ? i : null);
  };

  const s = sel != null ? mins[sel] : null;
  const colW = Math.max(1.5, width / n);

  return (
    <View style={{ gap: Spacing.two }}>
      <Legend
        items={[
          { label: 'Nivel de sonido', color: Colors.sound, shape: 'line' },
          { label: 'Ronquido', color: Colors.snore },
          { label: 'Ruido prolongado', color: Colors.noise },
        ]}
      />
      <Pressable onLayout={onLayout} onPress={(e) => onPress(e.nativeEvent.locationX)}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.sound} stopOpacity={0.45} />
              <Stop offset="1" stopColor={Colors.sound} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={f} x1={0} x2={width} y1={chartH * f} y2={chartH * f} stroke={Colors.grid} strokeWidth={1} />
          ))}
          {gapMins.map((i) => (
            <Rect key={`g${i}`} x={x(i) - colW / 2} y={0} width={colW} height={chartH} fill={Colors.textMuted} opacity={0.12} />
          ))}
          {area ? <Path d={area} fill="url(#area)" /> : null}
          {line ? <Path d={line} stroke={Colors.sound} strokeWidth={2} fill="none" strokeLinejoin="round" /> : null}
          {mins.map((m, i) =>
            m.snoreSec >= 3 ? (
              <Rect
                key={`s${i}`}
                x={x(i) - colW / 2}
                y={chartH + 6}
                width={colW}
                height={laneH}
                rx={2}
                fill={Colors.snore}
                opacity={Math.min(1, 0.45 + m.snoreSec / 40)}
              />
            ) : null,
          )}
          {mins.map((m, i) =>
            m.noise > 0 ? (
              <Rect key={`n${i}`} x={x(i) - colW / 2} y={chartH + 8 + laneH} width={colW} height={laneH} rx={2} fill={Colors.noise} />
            ) : null,
          )}
          {night.pausesList.map((p, i) => {
            const px = x(p.t / 60_000);
            return <Circle key={`p${i}`} cx={px} cy={6} r={4} fill={Colors.critical} stroke={Colors.surface} strokeWidth={2} />;
          })}
          {sel != null ? (
            <Line x1={x(sel)} x2={x(sel)} y1={0} y2={chartH + laneH * 2 + 8} stroke={Colors.text} strokeWidth={1} strokeDasharray="3 3" />
          ) : null}
        </Svg>
        <View style={{ height: 16 }}>
          {ticks
            .filter((_, k) => k % step === 0)
            .map((t) => (
              <Txt key={t.i} variant="caption" style={{ position: 'absolute', left: Math.min(width - 34, Math.max(0, x(t.i) - 16)) }}>
                {t.label}
              </Txt>
            ))}
        </View>
      </Pressable>
      {s && s.avg <= 0 ? (
        <Tooltip>
          <Txt variant="small" color={Colors.text}>
            {fmtClock(night.start + sel! * 60_000)} · sin datos
          </Txt>
          <Txt variant="caption">El análisis estuvo pausado en este minuto (pantalla bloqueada o micrófono ocupado).</Txt>
        </Tooltip>
      ) : s ? (
        <Tooltip>
          <Txt variant="small" color={Colors.text}>
            {fmtClock(night.start + sel! * 60_000)} · {Math.round(s.avg)} dB prom. · máx {s.max} dB
          </Txt>
          <Txt variant="caption">
            {s.snoreSec > 0 ? `Ronquido ${Math.round(s.snoreSec)} s` : 'Sin ronquido'} · {s.noise} ruidos · {s.transients} movimientos/sonidos breves
          </Txt>
        </Tooltip>
      ) : (
        <Txt variant="caption">Toca el gráfico para ver el detalle de cada minuto. Puntos rojos = posibles pausas.</Txt>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Acoustic state strip (5-min blocks)
// ---------------------------------------------------------------------------
const STATE_COLOR: Record<MinuteState, string> = {
  calm: Colors.sound,
  snore: Colors.snore,
  active: Colors.noise,
  nodata: Colors.border,
};
const STATE_LABEL: Record<MinuteState, string> = { calm: 'Calma', snore: 'Ronquido', active: 'Actividad', nodata: 'Sin datos' };

export function StateStrip({ night }: { night: Night }) {
  const [width, onLayout] = useWidth();
  const blocks: { state: MinuteState; t: number }[] = [];
  for (let i = 0; i < night.minutes.length; i += 5) {
    const slice = night.minutes.slice(i, i + 5);
    const states = slice.map(minuteState);
    const snore = states.filter((s) => s === 'snore').length;
    const active = states.filter((s) => s === 'active').length;
    const nodata = states.filter((s) => s === 'nodata').length;
    blocks.push({
      state: nodata >= 3 ? 'nodata' : snore >= 2 ? 'snore' : active >= 2 ? 'active' : 'calm',
      t: i,
    });
  }
  const totals = { calm: 0, snore: 0, active: 0, nodata: 0 } as Record<MinuteState, number>;
  blocks.forEach((b) => (totals[b.state] += 1));
  const bw = blocks.length ? width / blocks.length : width;
  const gap = bw > 4 ? 1 : 0;
  return (
    <View style={{ gap: Spacing.two }}>
      <View onLayout={onLayout}>
        <Svg width={width} height={28}>
          {blocks.map((b, i) => (
            <Rect
              key={i}
              x={i * bw}
              y={b.state === 'calm' || b.state === 'nodata' ? 10 : b.state === 'active' ? 4 : 0}
              width={Math.max(1, bw - gap)}
              height={b.state === 'calm' || b.state === 'nodata' ? 18 : b.state === 'active' ? 24 : 28}
              rx={2}
              fill={STATE_COLOR[b.state]}
              opacity={b.state === 'calm' ? 0.5 : 1}
            />
          ))}
        </Svg>
      </View>
      <Row gap={Spacing.three} style={{ flexWrap: 'wrap' }}>
        {(['calm', 'snore', 'active', 'nodata'] as MinuteState[])
          .filter((k) => k !== 'nodata' || totals.nodata > 0)
          .map((k) => (
          <Row key={k} gap={6}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATE_COLOR[k] }} />
            <Txt variant="caption" color={Colors.textSecondary}>
              {STATE_LABEL[k]} {blocks.length ? Math.round((totals[k] / blocks.length) * 100) : 0}%
            </Txt>
          </Row>
        ))}
      </Row>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Vertical bars (single series) with tap-to-inspect
// ---------------------------------------------------------------------------
export function Bars({
  data,
  color = Colors.accent,
  height = 140,
  format = (v: number) => String(Math.round(v)),
  target,
  targetLabel,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  format?: (v: number) => string;
  target?: number;
  targetLabel?: string;
}) {
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(target ?? 0, ...data.map((d) => d.value), 1) * 1.1;
  const slot = data.length ? width / data.length : width;
  const bw = Math.max(4, Math.min(28, slot - 6));
  const h = height - 18;
  const showEvery = Math.ceil(data.length / 8);

  return (
    <View style={{ gap: Spacing.two }}>
      <Pressable
        onLayout={onLayout}
        onPress={(e) => {
          const i = Math.floor(e.nativeEvent.locationX / slot);
          setSel(i >= 0 && i < data.length ? (sel === i ? null : i) : null);
        }}>
        <Svg width={width} height={h}>
          {[0.5, 1].map((f) => (
            <Line key={f} x1={0} x2={width} y1={h - (h - 4) * f} y2={h - (h - 4) * f} stroke={Colors.grid} strokeWidth={1} />
          ))}
          {target != null ? (
            <Line
              x1={0}
              x2={width}
              y1={h - (target / max) * h}
              y2={h - (target / max) * h}
              stroke={Colors.textSecondary}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ) : null}
          {data.map((d, i) => {
            const bh = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * h);
            const bx = i * slot + (slot - bw) / 2;
            const r = Math.min(4, bw / 2, bh);
            // Rounded top, square base anchored to the baseline.
            const path = `M${bx},${h} L${bx},${h - bh + r} Q${bx},${h - bh} ${bx + r},${h - bh} L${bx + bw - r},${h - bh} Q${bx + bw},${h - bh} ${bx + bw},${h - bh + r} L${bx + bw},${h} Z`;
            return bh > 0 ? <Path key={i} d={path} fill={color} opacity={sel == null || sel === i ? 1 : 0.4} /> : null;
          })}
        </Svg>
        <View style={{ height: 16 }}>
          {data.map((d, i) =>
            i % showEvery === 0 ? (
              <Txt
                key={i}
                variant="caption"
                numberOfLines={1}
                style={{ position: 'absolute', left: i * slot, width: Math.max(slot * showEvery, 30), textAlign: 'left' }}>
                {d.label}
              </Txt>
            ) : null,
          )}
        </View>
      </Pressable>
      {sel != null ? (
        <Tooltip>
          <Txt variant="small" color={Colors.text}>
            {data[sel].label}: {format(data[sel].value)}
          </Txt>
        </Tooltip>
      ) : target != null && targetLabel ? (
        <Txt variant="caption">Línea discontinua: {targetLabel}. Toca una barra para ver su valor.</Txt>
      ) : (
        <Txt variant="caption">Toca una barra para ver su valor.</Txt>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Live level bars for the recording screen
// ---------------------------------------------------------------------------
export function LiveBars({ levels, baseline, snoring }: { levels: number[]; baseline: number; snoring: boolean }) {
  const [width, onLayout] = useWidth();
  const h = 90;
  const count = 48;
  const slot = width / count;
  const padded = [...Array(Math.max(0, count - levels.length)).fill(0), ...levels.slice(-count)];
  return (
    <View onLayout={onLayout} style={{ width: '100%' }}>
      <Svg width={width} height={h}>
        {padded.map((db, i) => {
          const v = Math.max(0, Math.min(1, (db - 15) / 60));
          const bh = Math.max(3, v * h);
          const isLoud = db > baseline + 7;
          return (
            <Rect
              key={i}
              x={i * slot + 1}
              y={(h - bh) / 2}
              width={Math.max(2, slot - 3)}
              height={bh}
              rx={Math.min(2, (slot - 3) / 2)}
              fill={isLoud && snoring ? Colors.snore : Colors.sound}
              opacity={0.35 + (i / count) * 0.65}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    padding: Spacing.two + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
});
