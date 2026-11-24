import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { SexPicker, TextField, toNum, YesNo } from '@/components/form';
import { Button, Card, Icon, ProgressDots, Row, Screen, Txt } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { bmiCategory } from '@/lib/science';
import { saveProfile } from '@/lib/store';
import type { Profile, Sex } from '@/lib/types';

const STEPS = 5;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [neck, setNeck] = useState('');
  const [health, setHealth] = useState<Partial<Profile>>({});

  const ageN = toNum(age);
  const h = toNum(height);
  const w = toNum(weight);
  const bmi = h && w ? w / (h / 100) ** 2 : null;
  const first = name.trim().split(' ')[0] || '';

  const canNext = [
    true,
    name.trim().length >= 2,
    !!ageN && ageN >= 14 && ageN <= 110 && !!sex,
    (!height || (!!h && h > 100 && h < 250)) && (!weight || (!!w && w > 30 && w < 350)),
    true,
  ][step];

  const finish = () => {
    saveProfile({
      name: name.trim(),
      birthYear: new Date().getFullYear() - Math.round(ageN!),
      sex: sex!,
      heightCm: h,
      weightKg: w,
      neckCm: toNum(neck),
      ...health,
      createdAt: Date.now(),
    });
    router.replace('/');
  };

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : finish());

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} bottomInset={40}>
        <Row style={{ justifyContent: 'space-between', minHeight: 40 }}>
          {step > 0 ? (
            <Button title="Atrás" variant="ghost" icon="back" onPress={() => setStep(step - 1)} />
          ) : (
            <View />
          )}
          <ProgressDots total={STEPS} current={step} />
        </Row>

        {step === 0 && (
          <View style={{ gap: Spacing.four, paddingTop: Spacing.five }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sleep" size={42} color={Colors.accent} />
            </View>
            <Txt variant="hero">Noctua</Txt>
            <Txt variant="h2" style={{ fontWeight: '500' }}>
              Descubre cómo duermes y si roncas, con información basada en evidencia científica.
            </Txt>
            <View style={{ gap: Spacing.three }}>
              <Feature icon="mic" text="Escucha tu noche completa y detecta ronquidos por su ritmo respiratorio." />
              <Feature icon="chart" text="Informes detallados con gráficos, tendencias y factores que te afectan." />
              <Feature icon="bulb" text="Consejos personalizados según tu edad, cuerpo, hábitos y tus propios datos." />
              <Feature icon="heart" text="Tus datos y grabaciones se quedan solo en tu teléfono." />
            </View>
            <Card tone="accent">
              <Txt variant="caption" color={Colors.textSecondary}>
                Noctua es una herramienta de bienestar, no un dispositivo médico. No diagnostica enfermedades.
              </Txt>
            </Card>
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: Spacing.four, paddingTop: Spacing.four }}>
            <View style={{ gap: Spacing.two }}>
              <Txt variant="title">¿Cómo te llamas?</Txt>
              <Txt>Usaremos tu nombre para dirigirnos a ti en tus informes y consejos.</Txt>
            </View>
            <TextField label="Tu nombre" value={name} onChangeText={setName} placeholder="Ej. Laura" autoFocus />
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: Spacing.four, paddingTop: Spacing.four }}>
            <View style={{ gap: Spacing.two }}>
              <Txt variant="title">Encantados, {first}</Txt>
              <Txt>Las necesidades de sueño y el riesgo de ronquido cambian con la edad y el sexo.</Txt>
            </View>
            <TextField label="Edad" value={age} onChangeText={setAge} keyboardType="number-pad" suffix="años" placeholder="35" />
            <SexPicker value={sex} onChange={setSex} />
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: Spacing.four, paddingTop: Spacing.four }}>
            <View style={{ gap: Spacing.two }}>
              <Txt variant="title">Tu cuerpo</Txt>
              <Txt>
                El peso y el perímetro del cuello son de los factores que más influyen en el ronquido. Es opcional, pero mejora mucho
                el análisis.
              </Txt>
            </View>
            <Row gap={Spacing.two}>
              <View style={{ flex: 1 }}>
                <TextField label="Altura" value={height} onChangeText={setHeight} keyboardType="decimal-pad" suffix="cm" placeholder="170" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Peso" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix="kg" placeholder="70" />
              </View>
            </Row>
            {bmi ? (
              <Txt variant="small">
                IMC: {bmi.toFixed(1)} · {bmiCategory(bmi)}
              </Txt>
            ) : null}
            <TextField
              label="Perímetro de cuello (opcional)"
              value={neck}
              onChangeText={setNeck}
              keyboardType="decimal-pad"
              suffix="cm"
              placeholder="38"
              hint="Mídelo con una cinta a la altura de la nuez. Un cuello >40 cm es un factor de riesgo de apnea."
            />
          </View>
        )}

        {step === 4 && (
          <View style={{ gap: Spacing.three, paddingTop: Spacing.four }}>
            <View style={{ gap: Spacing.two }}>
              <Txt variant="title">Tu salud</Txt>
              <Txt>Estas preguntas forman parte del cuestionario STOP-BANG, validado para estimar el riesgo de apnea del sueño.</Txt>
            </View>
            <YesNo
              label="¿Te han dicho que roncas fuerte?"
              hint="Más fuerte que hablar, o se oye a través de una puerta"
              value={health.reportedSnoring}
              onChange={(v) => setHealth({ ...health, reportedSnoring: v })}
            />
            <YesNo
              label="¿Alguien te ha visto dejar de respirar dormido?"
              hint="O ahogarte / jadear mientras duermes"
              value={health.observedApnea}
              onChange={(v) => setHealth({ ...health, observedApnea: v })}
            />
            <YesNo
              label="¿Te sientes cansado o somnoliento durante el día?"
              hint="A menudo, aunque hayas dormido"
              value={health.daytimeTiredness}
              onChange={(v) => setHealth({ ...health, daytimeTiredness: v })}
            />
            <YesNo
              label="¿Tienes o tratas la presión arterial alta?"
              value={health.hypertension}
              onChange={(v) => setHealth({ ...health, hypertension: v })}
            />
            <YesNo label="¿Fumas?" value={health.smoker} onChange={(v) => setHealth({ ...health, smoker: v })} />
          </View>
        )}

        <Button
          title={step === 0 ? 'Comenzar' : step === STEPS - 1 ? `Listo, ${first}` : 'Continuar'}
          icon={step === STEPS - 1 ? 'check' : 'next'}
          onPress={next}
          disabled={!canNext}
          style={{ marginTop: Spacing.three }}
        />
        {step === 3 || step === 4 ? (
          <Txt variant="caption" style={{ textAlign: 'center' }}>
            Puedes completar o cambiar estos datos más tarde en tu perfil.
          </Txt>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Feature({ icon, text }: { icon: 'mic' | 'chart' | 'bulb' | 'heart'; text: string }) {
  return (
    <Row gap={Spacing.three} style={{ alignItems: 'flex-start' }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={Colors.accent} />
      </View>
      <Txt style={{ flex: 1 }}>{text}</Txt>
    </Row>
  );
}
