import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Chip, Divider, Icon, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { ageOf, bmiCategory, bmiOf, chronotype, essInterpretation } from '@/lib/science';
import { fmtBytes } from '@/lib/format';
import { audioInventory, deleteAllData, detectionAccuracy, updateSettings, useStore } from '@/lib/store';
import type { Sensitivity } from '@/lib/types';

const SEX_LABEL = { male: 'Hombre', female: 'Mujer', other: 'No indicado' } as const;
const yn = (v: boolean | undefined) => (v == null ? '—' : v ? 'Sí' : 'No');

export default function ProfileTab() {
  const p = useStore((s) => s.profile)!;
  const settings = useStore((s) => s.settings);
  const allNights = useStore((s) => s.nights);
  const nights = allNights.length;
  const acc = detectionAccuracy(allNights);
  const audioBytes = audioInventory(allNights).reduce((a, i) => a + i.bytes, 0);
  const bmi = bmiOf(p);

  const wipe = async () => {
    if (await confirm('Borrar todos los datos', 'Se eliminarán tu perfil, todas las noches y grabaciones. No se puede deshacer.', 'Borrar todo', true)) {
      deleteAllData();
      router.replace('/onboarding');
    }
  };

  return (
    <Screen>
      <Row gap={Spacing.three}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Txt variant="title" color={Colors.accent}>
            {p.name.charAt(0).toUpperCase()}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="h2">{p.name}</Txt>
          <Txt variant="small">
            {ageOf(p)} años · {SEX_LABEL[p.sex]} · {nights} noches registradas
          </Txt>
        </View>
      </Row>

      <SectionTitle
        action={
          <Txt variant="small" color={Colors.accent} onPress={() => router.push('/profile-edit')}>
            Editar
          </Txt>
        }>
        Datos personales
      </SectionTitle>
      <Card>
        <Item label="Altura" value={p.heightCm ? `${p.heightCm} cm` : '—'} />
        <Item label="Peso" value={p.weightKg ? `${p.weightKg} kg` : '—'} />
        <Item label="IMC" value={bmi ? `${bmi} · ${bmiCategory(bmi)}` : '—'} />
        <Item label="Perímetro de cuello" value={p.neckCm ? `${p.neckCm} cm` : '—'} />
        <Divider />
        <Item label="Ronquido fuerte reportado" value={yn(p.reportedSnoring)} />
        <Item label="Pausas observadas" value={yn(p.observedApnea)} />
        <Item label="Cansancio diurno" value={yn(p.daytimeTiredness)} />
        <Item label="Hipertensión" value={yn(p.hypertension)} />
        <Item label="Fumador" value={yn(p.smoker)} />
      </Card>

      <SectionTitle>Tests</SectionTitle>
      <Card onPress={() => router.push('/test/rmeq')}>
        <Row gap={Spacing.three}>
          <Icon name="sun" color={Colors.accent} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Cronotipo (rMEQ)</Txt>
            <Txt variant="small">{p.rmeq ? `${chronotype(p.rmeq.score).label} · ${p.rmeq.score} pts` : 'Pendiente'}</Txt>
          </View>
          <Icon name="chevron" size={14} color={Colors.textMuted} />
        </Row>
      </Card>
      <Card onPress={() => router.push('/test/ess')}>
        <Row gap={Spacing.three}>
          <Icon name="brain" color={Colors.accent} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Somnolencia (Epworth)</Txt>
            <Txt variant="small">{p.ess ? `${essInterpretation(p.ess.score).label} · ${p.ess.score}/24` : 'Pendiente'}</Txt>
          </View>
          <Icon name="chevron" size={14} color={Colors.textMuted} />
        </Row>
      </Card>

      <SectionTitle>Ajustes de detección</SectionTitle>
      <Card>
        <Txt variant="h3">Sensibilidad</Txt>
        <Txt variant="small">
          Alta detecta ronquidos más suaves (útil si el teléfono está lejos); baja reduce falsos positivos en habitaciones ruidosas.
        </Txt>
        <Row gap={Spacing.two}>
          {(
            [
              ['low', 'Baja'],
              ['normal', 'Normal'],
              ['high', 'Alta'],
            ] as [Sensitivity, string][]
          ).map(([k, l]) => (
            <Chip key={k} label={l} selected={settings.sensitivity === k} onPress={() => updateSettings({ sensitivity: k })} />
          ))}
        </Row>
      </Card>

      <SectionTitle>Grabaciones y espacio</SectionTitle>
      <Card onPress={() => router.push('/storage')}>
        <Row gap={Spacing.three}>
          <Icon name="wave" color={Colors.accent} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{fmtBytes(audioBytes)} en grabaciones</Txt>
            <Txt variant="small">
              {settings.keepAudio
                ? `Guardando audio · se conservan ${settings.audioNights ? `${settings.audioNights} noches` : 'sin límite'}`
                : 'Audio desactivado · solo se guarda el análisis'}
            </Txt>
            <Txt variant="caption" color={Colors.accent}>
              Gestionar y liberar espacio →
            </Txt>
          </View>
          <Icon name="chevron" size={14} color={Colors.textMuted} />
        </Row>
      </Card>

      <SectionTitle>Información</SectionTitle>
      <Card onPress={() => router.push('/reliability')}>
        <Row gap={Spacing.three}>
          <Icon name="check" color={Colors.accent} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Precisión y límites</Txt>
            <Txt variant="small">
              {acc.precision != null
                ? `Precisión medida: ${Math.round(acc.precision * 100)}% (${acc.reviewed} episodios revisados)`
                : 'Fiabilidad de cada dato y cómo mejorarla'}
            </Txt>
          </View>
          <Icon name="chevron" size={14} color={Colors.textMuted} />
        </Row>
      </Card>
      <Card onPress={() => router.push('/learn/metodo')}>
        <Row gap={Spacing.three}>
          <Icon name="science" color={Colors.accent} />
          <Txt variant="h3" style={{ flex: 1 }}>
            Cómo mide Noctua y sus límites
          </Txt>
          <Icon name="chevron" size={14} color={Colors.textMuted} />
        </Row>
      </Card>
      <Txt variant="caption">
        Noctua es una herramienta de bienestar, no un dispositivo médico. Todos tus datos se guardan únicamente en este teléfono.
      </Txt>
      <Button title="Borrar todos mis datos" variant="danger" icon="trash" onPress={wipe} />
    </Screen>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 2 }}>
      <Txt variant="small">{label}</Txt>
      <Txt variant="small" color={Colors.text}>
        {value}
      </Txt>
    </Row>
  );
}
