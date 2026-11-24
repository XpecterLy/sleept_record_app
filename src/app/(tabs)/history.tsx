import { router } from 'expo-router';
import { View } from 'react-native';

import { Bars } from '@/components/charts';
import { Card, Icon, levelColor, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { fmtDuration, fmtNightDate, fmtShortDate } from '@/lib/format';
import { nightScore, scoreLabel, snoreLevel } from '@/lib/science';
import { useStore } from '@/lib/store';

export default function History() {
  const nights = useStore((s) => s.nights);
  const profile = useStore((s) => s.profile)!;
  const last14 = nights.slice(0, 14).reverse();

  return (
    <Screen>
      <Txt variant="title">Historial</Txt>
      {nights.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: Spacing.five }}>
          <Icon name="calendar" size={36} color={Colors.textMuted} />
          <Txt variant="h3">Aún no hay noches registradas</Txt>
          <Txt variant="small" style={{ textAlign: 'center' }}>
            Inicia tu primera sesión desde la pestaña Dormir.
          </Txt>
        </Card>
      ) : (
        <>
          {last14.length >= 2 ? (
            <>
              <SectionTitle>Puntuación · últimas {last14.length} noches</SectionTitle>
              <Card>
                <Bars
                  data={last14.map((n) => ({ label: fmtShortDate(n.start), value: nightScore(n, profile).score }))}
                  color={Colors.sound}
                  format={(v) => `${Math.round(v)} puntos`}
                />
              </Card>
            </>
          ) : null}

          <SectionTitle>Todas las noches</SectionTitle>
          {nights.map((n) => {
            const s = nightScore(n, profile).score;
            const sl = scoreLabel(s);
            const snore = snoreLevel(n.metrics.snorePct);
            return (
              <Card key={n.id} onPress={() => router.push(`/night/${n.id}`)}>
                <Row gap={Spacing.three}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      borderWidth: 3,
                      borderColor: levelColor(sl.level),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Txt variant="h3">{s}</Txt>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="h3">{fmtNightDate(n.start)}</Txt>
                    <Txt variant="small">
                      {fmtDuration(n.metrics.durationMin)} · ronquido {snore.label.toLowerCase()} ({n.metrics.snorePct.toFixed(0)}%)
                    </Txt>
                    <Row gap={Spacing.two}>
                      {n.metrics.pauses > 0 ? (
                        <Txt variant="caption" color={Colors.warning}>
                          {n.metrics.pauses} posibles pausas
                        </Txt>
                      ) : null}
                      {n.hasAudio ? <Txt variant="caption">● audio</Txt> : null}
                      {!n.survey ? <Txt variant="caption">sin encuesta</Txt> : null}
                    </Row>
                  </View>
                  <Icon name="chevron" size={14} color={Colors.textMuted} />
                </Row>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
