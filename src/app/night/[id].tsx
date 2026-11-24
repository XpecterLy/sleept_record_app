import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Bars, ScoreRing, SoundTimeline, StateStrip } from '@/components/charts';
import {
  Button,
  Card,
  Chip,
  ConfidenceTag,
  Divider,
  Icon,
  IconButton,
  levelColor,
  Row,
  Screen,
  SectionTitle,
  Stat,
  StatGrid,
  StatusBadge,
  Txt,
} from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { factorLabel, fmtBytes, fmtClock, fmtDuration, fmtNightDate, SYMPTOMS } from '@/lib/format';
import { batteryPerHour } from '@/lib/battery';
import { fileSize } from '@/lib/storage';
import { nightInsights } from '@/lib/recommendations';
import { loudnessLabel, nightScore, scoreLabel, snoreLevel } from '@/lib/science';
import { deleteNight, deleteNightAudio, getNight, setEpisodeFeedback, useStore } from '@/lib/store';
import type { Night, SnoreFeedback } from '@/lib/types';

export default function NightScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Subscribe to the summary so the screen refreshes after edits.
  const summary = useStore((s) => s.nights.find((n) => n.id === id));
  const profile = useStore((s) => s.profile);
  const night = summary ? getNight(id) : null;

  if (!night || !profile) {
    return (
      <Screen>
        <Header />
        <Txt>No se encontró esta noche.</Txt>
      </Screen>
    );
  }
  return <NightReport night={night} />;
}

function Header({ title }: { title?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <IconButton name="back" label="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      {title ? <Txt variant="small">{title}</Txt> : null}
      <View style={{ width: 40 }} />
    </Row>
  );
}

function NightReport({ night }: { night: Night }) {
  const profile = useStore((s) => s.profile)!;
  const m = night.metrics;
  const { score, parts, hours } = nightScore(night, profile);
  const sl = scoreLabel(score);
  const snore = snoreLevel(m.snorePct);
  const insights = nightInsights(night, profile);

  // Snore minutes per clock hour
  const byHour: { label: string; value: number }[] = [];
  night.minutes.forEach((min, i) => {
    const h = new Date(night.start + i * 60_000).getHours();
    const label = `${h.toString().padStart(2, '0')}h`;
    let slot = byHour[byHour.length - 1];
    if (!slot || slot.label !== label) {
      slot = { label, value: 0 };
      byHour.push(slot);
    }
    slot.value += min.snoreSec / 60;
  });

  const remove = async () => {
    if (await confirm('Eliminar noche', 'Se borrarán el informe y la grabación de esta noche.', 'Eliminar', true)) {
      deleteNight(night.id);
      router.replace('/history');
    }
  };

  return (
    <Screen>
      <Header title={fmtNightDate(night.start)} />

      <Card style={{ alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.four }}>
        <ScoreRing score={score} color={levelColor(sl.level)} caption="de 100" />
        <StatusBadge level={sl.level} label={`Noche ${sl.label.toLowerCase()}`} />
        <Txt variant="small">
          {fmtClock(night.start)} → {fmtClock(night.end)} · {fmtDuration(m.durationMin)}
          {night.interrupted ? ' · sesión interrumpida' : ''}
        </Txt>
        <Row gap={Spacing.three} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <Part label="Duración" value={parts.duration} max={40} />
          <Part label="Ronquido" value={parts.snore} max={25} />
          <Part label="Continuidad" value={parts.continuity} max={15} />
          <Part label="Percepción" value={parts.subjective} max={20} />
        </Row>
      </Card>

      {m.coveragePct != null && m.coveragePct < 90 ? (
        <Card tone="warning">
          <Row gap={Spacing.two}>
            <Icon name="warning" size={18} color={Colors.warning} />
            <Txt variant="h3" style={{ flex: 1 }}>
              Se analizó el {Math.round(m.coveragePct)}% de la noche
            </Txt>
          </Row>
          <Txt variant="small">
            Hubo {Math.round(m.gapMin ?? 0)} min sin análisis (zonas grises del gráfico), normalmente porque la pantalla se bloqueó o la
            app pasó a segundo plano. {night.hasAudio ? 'El audio sí se grabó completo. ' : ''}Deja Noctua abierta en modo noche para
            informes completos.
          </Txt>
        </Card>
      ) : null}

      {!night.survey ? (
        <Card tone="accent" onPress={() => router.push(`/morning/${night.id}`)}>
          <Row gap={Spacing.two}>
            <Icon name="sun" color={Colors.accent} />
            <Txt variant="h3" style={{ flex: 1 }}>
              Completa la encuesta matutina para un análisis más preciso
            </Txt>
            <Icon name="chevron" size={14} color={Colors.textMuted} />
          </Row>
        </Card>
      ) : null}

      <SectionTitle>Resumen</SectionTitle>
      <Card>
        {insights.map((t) => (
          <Row key={t} gap={Spacing.two} style={{ alignItems: 'flex-start' }}>
            <View style={{ marginTop: 3 }}>
              <Icon name="sparkles" size={14} color={Colors.accent} />
            </View>
            <Txt style={{ flex: 1 }}>{t}</Txt>
          </Row>
        ))}
      </Card>

      <SectionTitle
        action={
          <Txt variant="small" color={Colors.accent} onPress={() => router.push('/reliability')}>
            ¿Qué tan fiable es?
          </Txt>
        }>
        Métricas
      </SectionTitle>
      <StatGrid>
        <Stat label="Sueño estimado" value={hours.toFixed(1)} unit="h" icon="sleep" hint={night.survey ? 'Según tu latencia reportada' : 'Estimación acústica'} />
        <Stat
          label="Conciliación"
          value={night.survey ? `${night.survey.latencyMin}` : m.onsetMin != null ? `${Math.round(m.onsetMin)}` : '—'}
          unit="min"
          icon="timer"
          hint={night.survey ? 'Reportada por ti' : 'Estimada por calma acústica'}
        />
        <Stat label="Tiempo roncando" value={fmtDuration(m.snoreMin)} icon="lungs" hint={`${m.snorePct.toFixed(0)}% · ${snore.label}`} />
        <Stat label="Ronquidos" value={String(m.snoreCount)} icon="wave" hint={`${m.episodes} episodios`} />
        <Stat label="Intensidad media" value={m.avgSnoreDb ? String(Math.round(m.avgSnoreDb)) : '—'} unit="dB" icon="speaker" hint={loudnessLabel(m.avgSnoreDb)} />
        <Stat label="Pico" value={m.maxSnoreDb ? String(m.maxSnoreDb) : '—'} unit="dB" icon="trendUp" hint="Estimado" />
        <Stat label="Episodio más largo" value={fmtDuration(m.longestEpisodeMin)} icon="history" />
        <Stat
          label="Posibles pausas"
          value={String(m.pauses)}
          icon="warning"
          hint={m.pauses ? `${m.pausesPerHour}/h · orientativo` : 'Ninguna detectada'}
        />
        <Stat
          label="Batería"
          value={
            !night.battery ? '—' : night.battery.charged ? 'Cargando' : `${Math.max(0, night.battery.startPct - night.battery.endPct)}`
          }
          unit={night.battery && !night.battery.charged ? '%' : undefined}
          icon="stress"
          hint={
            !night.battery
              ? 'No medida'
              : night.battery.charged
                ? `${night.battery.startPct}% → ${night.battery.endPct}% (conectado)`
                : `${night.battery.startPct}% → ${night.battery.endPct}%${batteryPerHour(night) != null ? ` · ${batteryPerHour(night)!.toFixed(1)}%/h` : ''}`
          }
        />
        <Stat label="Ruido de fondo" value={String(m.baselineDb)} unit="dB" icon="ear" hint="Estimado" />
        <Stat label="Ruidos prolongados" value={String(m.noiseEvents)} icon="speaker" hint={`${m.quietPct.toFixed(0)}% minutos en calma`} />
      </StatGrid>

      <SectionTitle action={<ConfidenceTag value="media" />}>Sonido durante la noche</SectionTitle>
      <Card>
        <SoundTimeline night={night} />
      </Card>

      <SectionTitle action={<ConfidenceTag value="media" />}>Mapa acústico</SectionTitle>
      <Card>
        <Txt variant="small">Bloques de 5 minutos según lo que captó el micrófono. No son fases del sueño (requieren EEG).</Txt>
        <StateStrip night={night} />
      </Card>

      {m.snoreCount > 0 ? (
        <>
          <SectionTitle>Minutos de ronquido por hora</SectionTitle>
          <Card>
            <Bars data={byHour} color={Colors.snore} format={(v) => `${v.toFixed(1)} min de ronquido`} />
          </Card>
        </>
      ) : null}

      <SnoreMoments night={night} />

      {night.factors.length || night.survey ? (
        <>
          <SectionTitle>Contexto</SectionTitle>
          <Card>
            {night.factors.length ? (
              <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
                {night.factors.map((f) => (
                  <Chip key={f} label={factorLabel(f)} />
                ))}
              </Row>
            ) : (
              <Txt variant="small">Sin factores especiales registrados.</Txt>
            )}
            {night.survey ? (
              <>
                <Divider />
                <Txt variant="small">
                  Calidad {night.survey.quality}/5 · Descanso {night.survey.rested}/5 · {night.survey.awakenings} despertares recordados
                </Txt>
                {night.survey.symptoms.length ? (
                  <Txt variant="small">
                    Síntomas: {night.survey.symptoms.map((s) => SYMPTOMS.find((x) => x.key === s)?.label).join(', ')}
                  </Txt>
                ) : null}
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      <SectionTitle>Gestionar</SectionTitle>
      {night.audioUri ? (
        <Button
          title={`Borrar solo la grabación (${fmtBytes(fileSize(night.audioUri))})`}
          variant="secondary"
          icon="trash"
          onPress={async () => {
            if (await confirm('Borrar grabación', 'El informe se conserva, pero no podrás escuchar los ronquidos.', 'Borrar', true))
              deleteNightAudio(night.id);
          }}
        />
      ) : null}
      <Button title="Gestionar grabaciones y espacio" variant="ghost" icon="wave" onPress={() => router.push('/storage')} />
      <Button title="Eliminar esta noche" variant="danger" icon="trash" onPress={remove} />
    </Screen>
  );
}

function Part({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 64 }}>
      <Txt variant="h3">
        {Math.round(value)}
        <Txt variant="caption">/{max}</Txt>
      </Txt>
      <Txt variant="caption">{label}</Txt>
    </View>
  );
}

function SnoreMoments({ night }: { night: Night }) {
  const player = useAudioPlayer(night.audioUri ?? null);
  const status = useAudioPlayerStatus(player);
  const [playing, setPlaying] = useState<number | null>(null);

  const review = (start: number, v: SnoreFeedback) =>
    setEpisodeFeedback(night.id, start, night.feedback?.[String(start)] === v ? null : v);

  const top = [...night.episodesList]
    .sort((a, b) => b.peakDb - a.peakDb)
    .slice(0, 8)
    .sort((a, b) => a.start - b.start);

  if (!top.length) return null;

  const play = async (i: number, startMs: number) => {
    if (playing === i && status.playing) {
      player.pause();
      setPlaying(null);
      return;
    }
    await player.seekTo(Math.max(0, startMs / 1000 - 2));
    player.play();
    setPlaying(i);
  };

  return (
    <>
      <SectionTitle>Momentos de ronquido</SectionTitle>
      <Card>
        {!night.audioUri ? (
          <Txt variant="small">
            El audio de esta noche no está guardado (se borró o elegiste «solo análisis»). El informe sigue completo.
          </Txt>
        ) : (
          <Txt variant="small">
            Escucha cada episodio y dinos qué era. Tus respuestas miden la precisión real del detector y ajustan tus consejos.
          </Txt>
        )}
        {top.map((e, i) => {
          const isPlaying = playing === i && status.playing;
          return (
            <View key={e.start}>
              {i > 0 ? <Divider /> : null}
              <Row gap={Spacing.three}>
                {night.audioUri ? (
                  <Pressable
                    onPress={() => play(i, e.start)}
                    accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isPlaying ? Colors.snore : Colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Icon name={isPlaying ? 'pause' : 'play'} size={16} />
                  </Pressable>
                ) : (
                  <Icon name="wave" color={Colors.snore} />
                )}
                <View style={{ flex: 1 }}>
                  <Txt variant="h3">{fmtClock(night.start + e.start)}</Txt>
                  <Txt variant="caption">
                    {fmtDuration((e.end - e.start) / 60_000)} · {e.count} ronquidos · pico {e.peakDb} dB ({loudnessLabel(e.peakDb).toLowerCase()})
                  </Txt>
                </View>
              </Row>
              {night.audioUri ? (
                <Row gap={6} style={{ flexWrap: 'wrap', marginTop: Spacing.two }}>
                  {(
                    [
                      ['snore', 'Mi ronquido'],
                      ['other', 'Otra persona'],
                      ['notSnore', 'No era ronquido'],
                    ] as [SnoreFeedback, string][]
                  ).map(([k, l]) => (
                    <Chip key={k} label={l} selected={night.feedback?.[String(e.start)] === k} onPress={() => review(e.start, k)} />
                  ))}
                </Row>
              ) : null}
            </View>
          );
        })}
      </Card>
    </>
  );
}
