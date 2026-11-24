import { router } from 'expo-router';
import { View } from 'react-native';

import {
  Button,
  Card,
  ConfidenceTag,
  IconButton,
  Row,
  Screen,
  SectionTitle,
  StatusBadge,
  Txt,
  type Confidence,
} from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { detectionAccuracy, updateSettings, useStore } from '@/lib/store';

const METRICS: { name: string; conf: Confidence; how: string }[] = [
  {
    name: 'Cuestionarios (STOP-BANG, Epworth, cronotipo)',
    conf: 'alta',
    how: 'Instrumentos validados en estudios clínicos. STOP-BANG ≥3 detecta ~9 de cada 10 apneas moderadas-graves, pero también da positivo en muchas personas sin apnea: sirve para cribar, no para diagnosticar.',
  },
  {
    name: 'Tiempo en cama y horarios',
    conf: 'alta',
    how: 'Se mide con el reloj del teléfono desde que inicias hasta que detienes la sesión.',
  },
  {
    name: 'Tu percepción matutina',
    conf: 'alta',
    how: 'Es lo que tú respondes; la calidad subjetiva del sueño es en sí misma un indicador de salud reconocido.',
  },
  {
    name: 'Ronquido (cantidad, % de la noche, episodios)',
    conf: 'media',
    how: 'Se detecta por volumen y ritmo respiratorio. Puede confundirse con ronquidos de otra persona o ruidos rítmicos. Revisar episodios mejora y mide su precisión real.',
  },
  {
    name: 'Intensidad en dB y ruido de fondo',
    conf: 'media',
    how: 'El micrófono del teléfono no está calibrado: los valores sirven para comparar noches en el mismo teléfono y posición, no como medición de sonómetro.',
  },
  {
    name: 'Deuda de sueño y jet lag social',
    conf: 'media',
    how: 'Se calculan con tus horarios y la latencia que reportas. Son tan precisos como tus registros: más noches, mejor estimación.',
  },
  {
    name: 'Hora de dormirte estimada / sueño estimado',
    conf: 'baja',
    how: 'Se infiere de la calma acústica. Si respondes la encuesta matutina usamos tu latencia referida, que es más fiable.',
  },
  {
    name: 'Posibles pausas respiratorias',
    conf: 'baja',
    how: 'Patrón sonoro compatible con apnea (silencio de 10–90 s dentro del ronquido y reanudación fuerte). No mide flujo de aire ni oxígeno: no equivale al índice de apnea-hipopnea.',
  },
  {
    name: 'Puntuación de la noche',
    conf: 'baja',
    how: 'Índice compuesto propio de Noctua (duración, ronquido, continuidad y percepción). Útil para seguir tu evolución, no es un estándar clínico.',
  },
];

export default function Reliability() {
  const nights = useStore((s) => s.nights);
  const sensitivity = useStore((s) => s.settings.sensitivity);
  const acc = detectionAccuracy(nights);
  const pct = acc.precision != null ? Math.round(acc.precision * 100) : null;

  const suggestion =
    acc.reviewed >= 10 && pct != null && pct < 70 && sensitivity !== 'low'
      ? ('low' as const)
      : acc.reviewed >= 10 && pct != null && pct >= 95 && sensitivity === 'low'
        ? ('normal' as const)
        : null;

  return (
    <Screen edges={['top', 'bottom']} bottomInset={40}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h2">Precisión y límites</Txt>
        <IconButton name="close" label="Cerrar" onPress={() => router.back()} />
      </Row>
      <Txt>Qué tan confiable es cada dato de Noctua, y cuánto acierta el detector contigo.</Txt>

      <SectionTitle>Precisión medida con tus revisiones</SectionTitle>
      <Card tone="accent">
        {acc.reviewed === 0 || pct == null ? (
          <>
            <Txt variant="h3">Aún no has revisado episodios</Txt>
            <Txt variant="small">
              En el informe de cada noche, escucha los momentos de ronquido y marca si eran tuyos, de otra persona o no eran ronquido.
              Con 10 o más revisiones calcularemos la precisión real del detector en tu dormitorio.
            </Txt>
          </>
        ) : (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="number">{pct}%</Txt>
              <StatusBadge
                level={pct >= 85 ? 'good' : pct >= 70 ? 'warning' : 'critical'}
                label={acc.reviewed < 10 ? 'Pocas revisiones' : pct >= 85 ? 'Buena' : pct >= 70 ? 'Aceptable' : 'Baja'}
              />
            </Row>
            <Txt variant="small">
              De {acc.reviewed} episodios revisados: {acc.snore} tuyos, {acc.other} de otra persona, {acc.notSnore} no eran ronquido.
            </Txt>
            {acc.reviewed < 10 ? <Txt variant="caption">Revisa al menos 10 episodios para un resultado estable.</Txt> : null}
          </>
        )}
        {suggestion ? (
          <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
            <Txt variant="small" color={Colors.text}>
              {suggestion === 'low'
                ? 'Hay bastantes falsos positivos. Te sugerimos bajar la sensibilidad del detector.'
                : 'El detector acierta casi siempre; puedes volver a sensibilidad normal para captar ronquidos más suaves.'}
            </Txt>
            <Button
              title={suggestion === 'low' ? 'Usar sensibilidad baja' : 'Usar sensibilidad normal'}
              variant="secondary"
              onPress={() => updateSettings({ sensitivity: suggestion })}
            />
          </View>
        ) : null}
      </Card>

      <SectionTitle>Fiabilidad de cada dato</SectionTitle>
      {METRICS.map((m) => (
        <Card key={m.name}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={Spacing.two}>
            <Txt variant="h3" style={{ flex: 1 }}>
              {m.name}
            </Txt>
            <ConfidenceTag value={m.conf} />
          </Row>
          <Txt variant="small">{m.how}</Txt>
        </Card>
      ))}

      <SectionTitle>Cómo obtener mejores datos</SectionTitle>
      <Card>
        <Txt variant="small">• Teléfono a 0,5–1 m de tu cabeza, siempre en el mismo sitio.</Txt>
        <Txt variant="small">• Noctua abierta en modo noche y conectada al cargador; sin ahorro de energía.</Txt>
        <Txt variant="small">• Responde la encuesta matutina y revisa algunos episodios cada semana.</Txt>
        <Txt variant="small">• Si duermes acompañado, acerca el teléfono a tu lado de la cama.</Txt>
      </Card>
      <Txt variant="caption">
        Noctua no es un dispositivo médico. Ante ronquido fuerte con pausas, somnolencia diurna o hipertensión, consulta a un
        profesional: el diagnóstico de apnea requiere polisomnografía o poligrafía respiratoria.
      </Txt>
    </Screen>
  );
}
