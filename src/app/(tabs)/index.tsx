import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScoreRing } from '@/components/charts';
import { Card, Icon, levelColor, Row, Screen, SectionTitle, Stat, StatGrid, StatusBadge, Txt } from '@/components/ui';
import { Colors, Gradients, Spacing } from '@/constants/theme';
import { fmtDuration, fmtMinutesOfDay, fmtNightDate, greeting } from '@/lib/format';
import { buildRecommendations } from '@/lib/recommendations';
import { avg, bedtimePlan, bedtimeStats, nightScore, scoreLabel, sleepDebt, snoreLevel } from '@/lib/science';
import { useNow } from '@/hooks/use-now';
import { useSession } from '@/lib/session';
import { useStore } from '@/lib/store';

export default function SleepHome() {
  const profile = useStore((s) => s.profile)!;
  const nights = useStore((s) => s.nights);
  const { active } = useSession();
  const now = useNow(60_000);
  const last = nights[0];
  const week = nights.filter((n) => now - n.start < 7 * 86_400_000);
  const recs = buildRecommendations(profile, nights);
  const top = recs[0];

  const bt = bedtimeStats(nights);
  const plan = bt ? bedtimePlan(Math.round(bt.meanWake / 15) * 15, profile, nights) : null;
  const debt = sleepDebt(nights, profile, now);
  const lastScore = last ? nightScore(last, profile) : null;
  const lastLabel = lastScore ? scoreLabel(lastScore.score) : null;
  const needsSurvey = last && !last.survey && now - last.end < 18 * 3600_000;

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Txt variant="label">Noctua</Txt>
        <Txt variant="title">{greeting(profile.name.split(' ')[0])}</Txt>
      </View>

      {/* Primary action */}
      <Pressable onPress={() => router.push(active ? '/session' : '/pre-sleep')}style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
        <LinearGradient colors={Gradients.night} style={styles.hero}>
          <View style={styles.moonGlow}>
            <LinearGradient colors={Gradients.accent} style={styles.moonBtn}>
              <Icon name="moon" size={44} color="#fff" />
            </LinearGradient>
          </View>
          <Txt variant="h2">{active ? 'Sesión en curso' : 'Empezar a dormir'}</Txt>
          <Txt variant="small" style={{ textAlign: 'center' }}>
            {active
              ? 'Estoy escuchando tu noche. Toca para volver a la pantalla nocturna.'
              : 'Deja el teléfono cargando junto a tu cama. Escucharé toda la noche hasta que me detengas.'}
          </Txt>
        </LinearGradient>
      </Pressable>

      {plan && bt && !active ? (
        <Card>
          <Row gap={Spacing.three}>
            <Icon name="sleep" size={22} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">Esta noche, acuéstate a las {fmtMinutesOfDay(plan.ideal)}</Txt>
              <Txt variant="small">
                Para despertar a tu hora habitual ({fmtMinutesOfDay(Math.round(bt.meanWake / 15) * 15)}) con el sueño que necesitas.
                {debt && debt.debtH >= 3 ? ` Llevas ${debt.debtH} h de deuda esta semana: adelántalo 30 min.` : ''}
              </Txt>
            </View>
          </Row>
        </Card>
      ) : null}

      {needsSurvey ? (
        <Card tone="accent" onPress={() => router.push(`/morning/${last.id}`)}>
          <Row gap={Spacing.three}>
            <Icon name="sun" size={24} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">¿Cómo dormiste?</Txt>
              <Txt variant="small">Responde 4 preguntas para completar tu informe.</Txt>
            </View>
            <Icon name="chevron" size={16} color={Colors.textMuted} />
          </Row>
        </Card>
      ) : null}

      {last && lastScore && lastLabel ? (
        <>
          <SectionTitle>Última noche</SectionTitle>
          <Card onPress={() => router.push(`/night/${last.id}`)}>
            <Row gap={Spacing.three}>
              <ScoreRing score={lastScore.score} size={92} color={levelColor(lastLabel.level)} />
              <View style={{ flex: 1, gap: 6 }}>
                <Txt variant="small">{fmtNightDate(last.start)}</Txt>
                <StatusBadge level={lastLabel.level} label={`Noche ${lastLabel.label.toLowerCase()}`} />
                <Txt variant="h3">{fmtDuration(last.metrics.durationMin)} en cama</Txt>
                <Txt variant="small">
                  Ronquido: {snoreLevel(last.metrics.snorePct).label.toLowerCase()} ({last.metrics.snorePct.toFixed(0)}%)
                </Txt>
              </View>
              <Icon name="chevron" size={16} color={Colors.textMuted} />
            </Row>
          </Card>
        </>
      ) : null}

      {week.length > 0 ? (
        <>
          <SectionTitle>Últimos 7 días</SectionTitle>
          <StatGrid>
            <Stat label="Noches" value={String(week.length)} icon="calendar" />
            <Stat label="Puntuación media" value={String(Math.round(avg(week.map((n) => nightScore(n, profile).score))))} icon="sparkles" />
            <Stat label="Tiempo en cama" value={fmtDuration(avg(week.map((n) => n.metrics.durationMin)))} icon="timer" />
            <Stat label="Ronquido medio" value={avg(week.map((n) => n.metrics.snorePct)).toFixed(0)} unit="%" icon="lungs" />
          </StatGrid>
        </>
      ) : null}

      {top ? (
        <>
          <SectionTitle
            action={
              <Pressable onPress={() => router.push('/insights')}>
                <Txt variant="small" color={Colors.accent}>
                  Ver todos
                </Txt>
              </Pressable>
            }>
            Consejo para ti
          </SectionTitle>
          <Card tone={top.priority === 'alta' ? 'warning' : 'default'}>
            <Row gap={Spacing.two}>
              <Icon name="bulb" size={18} color={Colors.warning} />
              <Txt variant="h3" style={{ flex: 1 }}>
                {top.title}
              </Txt>
            </Row>
            <Txt>{top.body}</Txt>
            <Txt variant="caption">Fuente: {top.source}</Txt>
          </Card>
        </>
      ) : null}

      {!profile.rmeq || !profile.ess ? (
        <>
          <SectionTitle>Conócete mejor</SectionTitle>
          {!profile.rmeq ? (
            <TestCard
              icon="sun"
              title="Descubre tu cronotipo"
              text="¿Eres alondra, colibrí o búho? 5 preguntas (rMEQ)."
              onPress={() => router.push('/test/rmeq')}
            />
          ) : null}
          {!profile.ess ? (
            <TestCard
              icon="brain"
              title="Mide tu somnolencia diurna"
              text="Escala de Epworth: 8 situaciones, 1 minuto."
              onPress={() => router.push('/test/ess')}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function TestCard({ icon, title, text, onPress }: { icon: 'sun' | 'brain'; title: string; text: string; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <Row gap={Spacing.three}>
        <View style={styles.testIcon}>
          <Icon name={icon} size={20} color={Colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="h3">{title}</Txt>
          <Txt variant="small">{text}</Txt>
        </View>
        <Icon name="chevron" size={16} color={Colors.textMuted} />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moonGlow: {
    padding: 14,
    borderRadius: 80,
    backgroundColor: 'rgba(139,123,240,0.12)',
    marginBottom: Spacing.two,
  },
  moonBtn: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  testIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
