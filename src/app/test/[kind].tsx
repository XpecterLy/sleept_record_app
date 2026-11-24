import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, IconButton, OptionList, ProgressDots, Row, Screen, StatusBadge, Txt } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { chronotype, ESS_ITEMS, ESS_OPTIONS, essInterpretation, RMEQ_ITEMS } from '@/lib/science';
import { updateProfile, useStore } from '@/lib/store';

export default function TestScreen() {
  const { kind } = useLocalSearchParams<{ kind: 'rmeq' | 'ess' }>();
  const name = useStore((s) => s.profile?.name.split(' ')[0] ?? '');
  const isEss = kind === 'ess';

  const questions = isEss
    ? ESS_ITEMS.map((q) => ({ q, options: ESS_OPTIONS }))
    : RMEQ_ITEMS;
  const [answers, setAnswers] = useState<(number | undefined)[]>(Array(questions.length).fill(undefined));
  const [i, setI] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  const current = questions[i];
  const answer = answers[i];

  const next = () => {
    if (i < questions.length - 1) return setI(i + 1);
    const score = answers.reduce<number>((a, b) => a + (b ?? 0), 0);
    updateProfile(isEss ? { ess: { score, date: Date.now() } } : { rmeq: { score, date: Date.now() } });
    setResult(score);
  };

  if (result != null) {
    const ess = isEss ? essInterpretation(result) : null;
    const chrono = !isEss ? chronotype(result) : null;
    return (
      <Screen edges={['top', 'bottom']} bottomInset={40}>
        <Row style={{ justifyContent: 'flex-end' }}>
          <IconButton name="close" label="Cerrar" onPress={() => router.back()} />
        </Row>
        <Txt variant="label">Resultado</Txt>
        {ess ? (
          <>
            <Txt variant="title">{result}/24</Txt>
            <StatusBadge level={ess.level} label={ess.label} />
            <Txt>{ess.detail}</Txt>
            <Card>
              <Txt variant="small">
                {name}, la Escala de Epworth mide tu tendencia a quedarte dormido en situaciones cotidianas. Una puntuación alta puede
                deberse a sueño insuficiente, apnea del sueño, narcolepsia u otros trastornos. Repite el test cada pocas semanas para ver
                tu evolución.
              </Txt>
              <Txt variant="caption">Johns MW. A new method for measuring daytime sleepiness. Sleep 1991.</Txt>
            </Card>
          </>
        ) : chrono ? (
          <>
            <Txt variant="title">{chrono.short}</Txt>
            <Txt variant="h3" color={Colors.accent}>
              {chrono.label} · {result} puntos
            </Txt>
            <Txt>{chrono.detail}</Txt>
            <Card tone="accent">
              <Txt variant="h3">{chrono.window}</Txt>
              <Txt variant="small">
                {name}, si tus horarios encajan con tu cronotipo dormirás mejor. Si no es posible, la luz natural por la mañana y la
                oscuridad por la noche te ayudarán a ajustar tu reloj interno.
              </Txt>
            </Card>
            <Txt variant="caption">Adan A, Almirall H. Horne & Östberg morningness-eveningness questionnaire: a reduced scale. 1991.</Txt>
          </>
        ) : null}
        <Button title="Listo" icon="check" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']} bottomInset={40}>
      <Row style={{ justifyContent: 'space-between' }}>
        <ProgressDots total={questions.length} current={i} />
        <IconButton name="close" label="Cerrar" onPress={() => router.back()} />
      </Row>
      <Txt variant="label">{isEss ? 'Escala de somnolencia de Epworth' : 'Cuestionario de cronotipo (rMEQ)'}</Txt>
      {isEss ? (
        <Txt variant="small">¿Qué probabilidad tienes de quedarte dormido o cabecear en esta situación? Piensa en tu vida reciente.</Txt>
      ) : null}
      <Txt variant="h2">{current.q}</Txt>
      <OptionList
        options={current.options.map((o) => ({ label: o.label, value: o.value }))}
        value={answer}
        onChange={(v) => setAnswers((a) => a.map((x, k) => (k === i ? v : x)))}
      />
      <View style={{ gap: Spacing.two }}>
        <Button title={i === questions.length - 1 ? 'Ver resultado' : 'Siguiente'} icon="next" onPress={next} disabled={answer == null} />
        {i > 0 ? <Button title="Anterior" variant="ghost" onPress={() => setI(i - 1)} /> : null}
      </View>
    </Screen>
  );
}
