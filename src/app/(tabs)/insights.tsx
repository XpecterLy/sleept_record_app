import { router } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { Bars } from '@/components/charts';
import { Button, Card, Chip, Icon, IconButton, Row, Screen, SectionTitle, Stat, StatGrid, StatusBadge, Txt } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { ARTICLES } from '@/content/learn';
import { factorLabel, FACTORS, fmtDuration, fmtMinutesOfDay, fmtShortDate } from '@/lib/format';
import { buildRecommendations, factorImpact, type Recommendation } from '@/lib/recommendations';
import {
  ageOf,
  avg,
  bedtimePlan,
  bedtimeStats,
  chronotype,
  essInterpretation,
  recommendedSleep,
  sleepDebt,
  snorerProfile,
  socialJetlag,
  stopBang,
} from '@/lib/science';
import { notify } from '@/lib/confirm';
import { buildDoctorReport } from '@/lib/report';
import { useStore } from '@/lib/store';

const CATS: (Recommendation['category'] | 'Todas')[] = ['Todas', 'Salud', 'Ronquido', 'Horario', 'Hábitos', 'Ambiente'];

export default function Insights() {
  const profile = useStore((s) => s.profile)!;
  const nights = useStore((s) => s.nights);
  const [cat, setCat] = useState<(typeof CATS)[number]>('Todas');

  const recent = nights.slice(0, 14);
  const first = profile.name.split(' ')[0];
  const rec = recommendedSleep(ageOf(profile));
  const sleepH = avg(recent.map((n) => (n.survey ? n.metrics.durationMin - n.survey.latencyMin : n.metrics.sleepMin))) / 60;
  const bt = bedtimeStats(recent);
  const sp = snorerProfile(recent);
  const sb = stopBang(profile, recent);
  const chrono = profile.rmeq ? chronotype(profile.rmeq.score) : null;
  const recs = buildRecommendations(profile, nights).filter((r) => cat === 'Todas' || r.category === cat);
  const chrono14 = [...recent].reverse();

  const debt = sleepDebt(recent, profile);
  const sj = socialJetlag(nights);
  const [wake, setWake] = useState(() => (bt ? Math.round(bt.meanWake / 15) * 15 : 7 * 60));
  const plan = bedtimePlan(wake, profile, recent);
  const shiftWake = (d: number) => setWake((w) => (w + d + 1440) % 1440);

  const share = async () => {
    try {
      await Share.share({ title: 'Informe de sueño', message: buildDoctorReport(profile, nights) });
    } catch (e) {
      notify('No se pudo compartir', String(e));
    }
  };

  const impacts = FACTORS.map((f) => ({ f, impact: factorImpact(recent, f.key) })).filter((x) => x.impact);

  return (
    <Screen>
      <Txt variant="title">Tu análisis</Txt>
      <Txt>
        {first}, esto es lo que sabemos de tu sueño
        {recent.length ? ` a partir de tus últimas ${recent.length} noches` : ''} y tu perfil.
      </Txt>

      {/* Sleep type */}
      <SectionTitle>Tu tipo de sueño</SectionTitle>
      <Card tone="accent">
        <ProfileRow
          icon="sun"
          title="Cronotipo"
          value={chrono ? `${chrono.label} (${chrono.short})` : 'Sin evaluar'}
          detail={chrono ? `${chrono.detail} ${chrono.window}` : 'Haz el test rMEQ de 5 preguntas para conocerlo.'}
          onPress={() => router.push('/test/rmeq')}
        />
        <ProfileRow
          icon="lungs"
          title="Perfil de ronquido"
          value={sp.label}
          detail={sp.detail}
        />
        <ProfileRow
          icon="timer"
          title="Duración habitual"
          value={recent.length >= 3 ? `${sleepH.toFixed(1)} h` : 'Sin datos suficientes'}
          detail={`Recomendado para ${rec.group}: ${rec.min}–${rec.max} h.${
            recent.length >= 3 ? (sleepH < rec.min ? ' Duermes menos de lo recomendado.' : ' Estás dentro de lo recomendado.') : ''
          }`}
        />
        <ProfileRow
          icon="calendar"
          title="Regularidad"
          value={bt ? (bt.sdBed <= 30 ? 'Muy regular' : bt.sdBed <= 60 ? 'Regular' : 'Irregular') : 'Sin datos suficientes'}
          detail={
            bt
              ? `Te acuestas de media a las ${fmtMinutesOfDay(bt.meanBed)} (±${Math.round(bt.sdBed)} min) y te levantas a las ${fmtMinutesOfDay(bt.meanWake)}.`
              : 'Registra al menos 3 noches.'
          }
        />
      </Card>

      {/* Schedule */}
      <SectionTitle>Tu horario</SectionTitle>
      <StatGrid>
        <Stat
          label="Deuda de sueño (7 días)"
          value={debt ? debt.debtH.toFixed(1) : '—'}
          unit="h"
          icon="timer"
          hint={debt ? `Necesitas ~${debt.needH} h/noche · ${debt.nights} noches` : 'Registra noches esta semana'}
        />
        <Stat
          label="Jet lag social"
          value={sj ? sj.hours.toFixed(1) : '—'}
          unit="h"
          icon="calendar"
          hint={
            sj
              ? `${sj.label} · laborables ${fmtMinutesOfDay(sj.mswMin)} vs libres ${fmtMinutesOfDay(sj.msfMin)} (punto medio)`
              : 'Necesita noches laborables y de fin de semana'
          }
        />
      </StatGrid>
      <Card>
        <Txt variant="h3">¿A qué hora acostarte?</Txt>
        <Txt variant="small">Elige a qué hora quieres despertar:</Txt>
        <Row style={{ justifyContent: 'center' }} gap={Spacing.three}>
          <IconButton name="back" label="15 minutos antes" onPress={() => shiftWake(-15)} />
          <Txt variant="hero">{fmtMinutesOfDay(wake)}</Txt>
          <IconButton name="chevron" label="15 minutos después" onPress={() => shiftWake(15)} />
        </Row>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Txt variant="small">Acuéstate idealmente a las</Txt>
          <Txt variant="title" color={Colors.accent}>
            {fmtMinutesOfDay(plan.ideal)}
          </Txt>
          <Txt variant="caption" style={{ textAlign: 'center' }}>
            Rango saludable: {fmtMinutesOfDay(plan.earliest)} – {fmtMinutesOfDay(plan.latest)} ({plan.range.min}–{plan.range.max} h de
            sueño para tu edad + ~{plan.latency} min que sueles tardar en dormirte)
          </Txt>
        </View>
      </Card>

      {/* Risk */}
      <SectionTitle>Riesgo de apnea (STOP-BANG)</SectionTitle>
      <Card tone={sb.level === 'critical' ? 'critical' : sb.level === 'warning' ? 'warning' : 'default'}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="number">{sb.score}/8</Txt>
          <StatusBadge level={sb.level} label={`Riesgo ${sb.risk.toLowerCase()}`} />
        </Row>
        {sb.items.map((i) => (
          <Row key={i.key} gap={Spacing.two}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: i.positive ? 'rgba(229,83,75,0.18)' : Colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Txt variant="caption" color={Colors.text}>
                {i.key}
              </Txt>
            </View>
            <Txt variant="small" style={{ flex: 1 }}>
              {i.label}
            </Txt>
            <Txt variant="caption" color={i.positive ? Colors.critical : Colors.textMuted}>
              {i.positive == null ? 'Sin dato' : i.positive ? 'Sí' : 'No'}
            </Txt>
          </Row>
        ))}
        {sb.missing.length ? (
          <Txt variant="caption" color={Colors.accent} onPress={() => router.push('/profile-edit')}>
            Completa tu perfil para afinar el resultado →
          </Txt>
        ) : null}
        <Txt variant="caption">Cuestionario validado de cribado (Chung et al., 2008/2016). No es un diagnóstico.</Txt>
      </Card>

      {profile.ess ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">Somnolencia diurna (Epworth)</Txt>
            <StatusBadge level={essInterpretation(profile.ess.score).level} label={`${profile.ess.score}/24`} />
          </Row>
          <Txt variant="small">{essInterpretation(profile.ess.score).detail}</Txt>
        </Card>
      ) : null}

      {/* Trends */}
      {recent.length >= 2 ? (
        <>
          <SectionTitle>Tendencias</SectionTitle>
          <StatGrid>
            <Stat label="Tiempo en cama medio" value={fmtDuration(avg(recent.map((n) => n.metrics.durationMin)))} icon="timer" />
            <Stat label="Ronquido medio" value={avg(recent.map((n) => n.metrics.snorePct)).toFixed(0)} unit="%" icon="lungs" />
            <Stat label="Pausas/noche" value={avg(recent.map((n) => n.metrics.pauses)).toFixed(1)} icon="warning" />
            <Stat
              label="Calidad percibida"
              value={recent.some((n) => n.survey) ? avg(recent.filter((n) => n.survey).map((n) => n.survey!.quality)).toFixed(1) : '—'}
              unit="/5"
              icon="heart"
            />
          </StatGrid>
          <Card>
            <Txt variant="h3">Horas en cama por noche</Txt>
            <Bars
              data={chrono14.map((n) => ({ label: fmtShortDate(n.start), value: n.metrics.durationMin / 60 }))}
              color={Colors.sound}
              target={rec.min}
              targetLabel={`mínimo recomendado (${rec.min} h)`}
              format={(v) => `${v.toFixed(1)} h`}
            />
          </Card>
          <Card>
            <Txt variant="h3">% de la noche roncando</Txt>
            <Bars
              data={chrono14.map((n) => ({ label: fmtShortDate(n.start), value: n.metrics.snorePct }))}
              color={Colors.snore}
              format={(v) => `${v.toFixed(0)}% roncando`}
            />
          </Card>
        </>
      ) : null}

      {/* Factors */}
      <SectionTitle>Qué te afecta</SectionTitle>
      <Card>
        {impacts.length ? (
          impacts.map(({ f, impact }) => {
            const diff = impact!.withPct - impact!.withoutPct;
            return (
              <View key={f.key} style={{ gap: 2, paddingVertical: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="h3">{factorLabel(f.key)}</Txt>
                  <Row gap={4}>
                    <Icon name={diff > 0 ? 'trendUp' : 'trendDown'} size={14} color={diff > 3 ? Colors.critical : Colors.good} />
                    <Txt variant="small" color={Colors.text}>
                      {diff > 0 ? '+' : ''}
                      {diff.toFixed(0)} pts ronquido
                    </Txt>
                  </Row>
                </Row>
                <Txt variant="caption">
                  Con: {impact!.withPct.toFixed(0)}% ({impact!.nWith} noches) · Sin: {impact!.withoutPct.toFixed(0)}% ({impact!.nWithout} noches)
                </Txt>
              </View>
            );
          })
        ) : (
          <Txt variant="small">
            Marca los factores antes de dormir. Cuando un factor aparezca en al menos 2 noches (y falte en otras 2), te mostraremos su
            efecto real en tu ronquido.
          </Txt>
        )}
      </Card>

      {/* Recommendations */}
      <SectionTitle>Recomendaciones para ti</SectionTitle>
      <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
        {CATS.map((c) => (
          <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />
        ))}
      </Row>
      {recs.map((r) => (
        <Card key={r.id} tone={r.priority === 'alta' ? 'warning' : 'default'}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="caption">{r.category.toUpperCase()}</Txt>
            <StatusBadge
              level={r.priority === 'alta' ? 'critical' : r.priority === 'media' ? 'warning' : 'good'}
              label={`Prioridad ${r.priority}`}
            />
          </Row>
          <Txt variant="h3">{r.title}</Txt>
          <Txt>{r.body}</Txt>
          <Row gap={6} style={{ alignItems: 'flex-start' }}>
            <Icon name="book" size={12} color={Colors.textMuted} />
            <Txt variant="caption" style={{ flex: 1 }}>
              {r.source}
            </Txt>
          </Row>
        </Card>
      ))}

      {/* Share & reliability */}
      <SectionTitle>Para tu médico</SectionTitle>
      <Card>
        <Txt variant="small">
          Genera un resumen con tus cuestionarios, métricas de las últimas 14 noches, síntomas y factores, listo para enviar por
          WhatsApp, correo o imprimir.
        </Txt>
        <Button title="Compartir informe" icon="clipboard" variant="secondary" onPress={share} />
        <Button title="Precisión y límites de Noctua" icon="science" variant="ghost" onPress={() => router.push('/reliability')} />
      </Card>

      {/* Learn */}
      <SectionTitle>Aprende</SectionTitle>
      {ARTICLES.map((a) => (
        <Card key={a.slug} onPress={() => router.push(`/learn/${a.slug}`)}>
          <Row gap={Spacing.three}>
            <View
              style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={a.icon} size={20} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{a.title}</Txt>
              <Txt variant="small">{a.subtitle}</Txt>
            </View>
            <Icon name="chevron" size={14} color={Colors.textMuted} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

function ProfileRow({
  icon,
  title,
  value,
  detail,
  onPress,
}: {
  icon: 'sun' | 'lungs' | 'timer' | 'calendar';
  title: string;
  value: string;
  detail: string;
  onPress?: () => void;
}) {
  return (
    <Row gap={Spacing.three} style={{ alignItems: 'flex-start', paddingVertical: 6 }}>
      <View style={{ marginTop: 2 }}>
        <Icon name={icon} size={18} color={Colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="caption">{title.toUpperCase()}</Txt>
        <Txt variant="h3">{value}</Txt>
        <Txt variant="small">{detail}</Txt>
        {onPress ? (
          <Txt variant="small" color={Colors.accent} onPress={onPress}>
            {value === 'Sin evaluar' ? 'Hacer el test →' : 'Repetir test →'}
          </Txt>
        ) : null}
      </View>
    </Row>
  );
}

