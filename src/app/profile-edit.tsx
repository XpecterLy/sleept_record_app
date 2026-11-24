import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { SexPicker, TextField, toNum, YesNo } from '@/components/form';
import { Button, IconButton, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ageOf } from '@/lib/science';
import { updateProfile, useStore } from '@/lib/store';
import type { Profile } from '@/lib/types';

const str = (n?: number) => (n == null ? '' : String(n));

export default function ProfileEdit() {
  const p = useStore((s) => s.profile)!;
  const [name, setName] = useState(p.name);
  const [age, setAge] = useState(String(ageOf(p)));
  const [sex, setSex] = useState(p.sex);
  const [height, setHeight] = useState(str(p.heightCm));
  const [weight, setWeight] = useState(str(p.weightKg));
  const [neck, setNeck] = useState(str(p.neckCm));
  const [health, setHealth] = useState<Partial<Profile>>({
    reportedSnoring: p.reportedSnoring,
    observedApnea: p.observedApnea,
    daytimeTiredness: p.daytimeTiredness,
    hypertension: p.hypertension,
    smoker: p.smoker,
  });

  const ageN = toNum(age);
  const valid = name.trim().length >= 2 && !!ageN && ageN >= 14 && ageN <= 110;

  const save = () => {
    updateProfile({
      name: name.trim(),
      birthYear: new Date().getFullYear() - Math.round(ageN!),
      sex,
      heightCm: toNum(height),
      weightKg: toNum(weight),
      neckCm: toNum(neck),
      ...health,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} bottomInset={40}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="h2">Editar perfil</Txt>
          <IconButton name="close" label="Cerrar" onPress={() => router.back()} />
        </Row>
        <TextField label="Nombre" value={name} onChangeText={setName} />
        <TextField label="Edad" value={age} onChangeText={setAge} keyboardType="number-pad" suffix="años" />
        <SexPicker value={sex} onChange={setSex} />
        <Row gap={Spacing.two}>
          <View style={{ flex: 1 }}>
            <TextField label="Altura" value={height} onChangeText={setHeight} keyboardType="decimal-pad" suffix="cm" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Peso" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix="kg" />
          </View>
        </Row>
        <TextField label="Perímetro de cuello" value={neck} onChangeText={setNeck} keyboardType="decimal-pad" suffix="cm" />
        <SectionTitle>Salud</SectionTitle>
        <YesNo label="¿Te han dicho que roncas fuerte?" value={health.reportedSnoring} onChange={(v) => setHealth({ ...health, reportedSnoring: v })} />
        <YesNo label="¿Te han visto dejar de respirar dormido?" value={health.observedApnea} onChange={(v) => setHealth({ ...health, observedApnea: v })} />
        <YesNo label="¿Cansancio o somnolencia diurna?" value={health.daytimeTiredness} onChange={(v) => setHealth({ ...health, daytimeTiredness: v })} />
        <YesNo label="¿Presión arterial alta?" value={health.hypertension} onChange={(v) => setHealth({ ...health, hypertension: v })} />
        <YesNo label="¿Fumas?" value={health.smoker} onChange={(v) => setHealth({ ...health, smoker: v })} />
        <Button title="Guardar cambios" icon="check" onPress={save} disabled={!valid} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
