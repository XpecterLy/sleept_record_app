import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Sex } from '@/lib/types';

import { Chip, Row, Txt } from './ui';

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  suffix,
  hint,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  suffix?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="small" color={Colors.text}>
        {label}
      </Txt>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          style={styles.input}
          selectionColor={Colors.accent}
        />
        {suffix ? <Txt variant="small">{suffix}</Txt> : null}
      </View>
      {hint ? <Txt variant="caption">{hint}</Txt> : null}
    </View>
  );
}

export function YesNo({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.yesno}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="h3">{label}</Txt>
        {hint ? <Txt variant="caption">{hint}</Txt> : null}
      </View>
      <Row gap={6}>
        <Chip label="Sí" selected={value === true} onPress={() => onChange(true)} />
        <Chip label="No" selected={value === false} onPress={() => onChange(false)} />
      </Row>
    </View>
  );
}

export function SexPicker({ value, onChange }: { value: Sex | undefined; onChange: (s: Sex) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="small" color={Colors.text}>
        Sexo biológico
      </Txt>
      <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
        <Chip label="Mujer" selected={value === 'female'} onPress={() => onChange('female')} />
        <Chip label="Hombre" selected={value === 'male'} onPress={() => onChange('male')} />
        <Chip label="Prefiero no decir" selected={value === 'other'} onPress={() => onChange('other')} />
      </Row>
      <Txt variant="caption">Influye en el riesgo de ronquido y apnea (hormonas, anatomía de la vía aérea).</Txt>
    </View>
  );
}

export const toNum = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.three,
  },
  input: { flex: 1, color: Colors.text, fontSize: 17, paddingVertical: 14 },
  yesno: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.three,
  },
});
