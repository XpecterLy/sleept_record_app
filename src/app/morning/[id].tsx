import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Row, Screen, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { SYMPTOMS } from '@/lib/format';
import { saveSurvey, useStore } from '@/lib/store';
import type { MorningSymptom } from '@/lib/types';

const SCALE = [
  { v: 1, l: 'Muy mal' },
  { v: 2, l: 'Mal' },
  { v: 3, l: 'Normal' },
  { v: 4, l: 'Bien' },
  { v: 5, l: 'Muy bien' },
];
const LATENCY = [
  { v: 5, l: '< 10 min' },
  { v: 15, l: '10–20 min' },
  { v: 25, l: '20–30 min' },
  { v: 45, l: '30–60 min' },
  { v: 75, l: '> 1 hora' },
];
const AWAKE = [0, 1, 2, 3, 4];

export default function Morning() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const name = useStore((s) => s.profile?.name.split(' ')[0] ?? '');
  const [quality, setQuality] = useState<number>();
  const [rested, setRested] = useState<number>();
  const [latency, setLatency] = useState<number>();
  const [awakenings, setAwakenings] = useState<number>();
  const [symptoms, setSymptoms] = useState<MorningSymptom[]>([]);

  const done = quality != null && rested != null && latency != null && awakenings != null;

  const submit = () => {
    saveSurvey(id, { quality: quality!, rested: rested!, latencyMin: latency!, awakenings: awakenings!, symptoms });
    router.replace(`/night/${id}`);
  };

  return (
    <Screen edges={['top', 'bottom']} bottomInset={40}>
      <Txt variant="label">Encuesta matutina</Txt>
      <Txt variant="title">Buenos días, {name}</Txt>
      <Txt>
        Tu percepción importa: la calidad subjetiva del sueño es un indicador validado de salud y complementa lo que mide el micrófono.
      </Txt>

      <Question title="¿Cómo calificarías tu sueño?">
        {SCALE.map((o) => (
          <Chip key={o.v} label={o.l} selected={quality === o.v} onPress={() => setQuality(o.v)} />
        ))}
      </Question>

      <Question title="¿Qué tan descansado te sientes?">
        {SCALE.map((o) => (
          <Chip key={o.v} label={o.l} selected={rested === o.v} onPress={() => setRested(o.v)} />
        ))}
      </Question>

      <Question title="¿Cuánto tardaste en dormirte?">
        {LATENCY.map((o) => (
          <Chip key={o.v} label={o.l} selected={latency === o.v} onPress={() => setLatency(o.v)} />
        ))}
      </Question>

      <Question title="¿Cuántas veces recuerdas haberte despertado?">
        {AWAKE.map((v) => (
          <Chip key={v} label={v === 4 ? '4 o más' : String(v)} selected={awakenings === v} onPress={() => setAwakenings(v)} />
        ))}
      </Question>

      <Question title="¿Notas alguno de estos síntomas? (opcional)">
        {SYMPTOMS.map((s) => (
          <Chip
            key={s.key}
            label={s.label}
            selected={symptoms.includes(s.key)}
            onPress={() => setSymptoms((x) => (x.includes(s.key) ? x.filter((k) => k !== s.key) : [...x, s.key]))}
          />
        ))}
      </Question>

      <Button title="Ver mi informe" icon="chart" onPress={submit} disabled={!done} />
      <Button title="Omitir por ahora" variant="ghost" onPress={() => router.replace(`/night/${id}`)} />
    </Screen>
  );
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <Txt variant="h3">{title}</Txt>
      <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
        {children}
      </Row>
    </View>
  );
}
