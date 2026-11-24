import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  IconButton,
  OptionList,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { confirm, notify } from '@/lib/confirm';
import { AUDIO_MB_PER_HOUR, fmtBytes, fmtDuration, fmtNightDate } from '@/lib/format';
import { freeSpace } from '@/lib/storage';
import {
  audioBeyondLimit,
  audioInventory,
  deleteAudioFor,
  setAudioNights,
  updateSettings,
  useStore,
  type AudioItem,
} from '@/lib/store';

const LIMITS = [
  { value: 3, label: '3 noches' },
  { value: 7, label: '7 noches' },
  { value: 14, label: '14 noches' },
  { value: 30, label: '30 noches' },
  { value: 0, label: 'Sin límite' },
];
const NIGHT_MB = AUDIO_MB_PER_HOUR * 8;

const sum = (items: AudioItem[]) => items.reduce((a, i) => a + i.bytes, 0);

export default function StorageScreen() {
  const nights = useStore((s) => s.nights);
  const settings = useStore((s) => s.settings);
  const [selected, setSelected] = useState<string[]>([]);
  const now = useNow(60_000);

  const items = audioInventory(nights);
  const used = sum(items);
  const free = freeSpace();

  const noSnore = items.filter((i) => i.episodes === 0);
  const old = items.filter((i) => now - i.start > 7 * 86_400_000);
  const reviewed = items.filter((i) => i.reviewed > 0);
  const chosen = items.filter((i) => selected.includes(i.id));

  /** Asks for confirmation, deletes, and tells the user how much was freed. */
  const remove = async (list: AudioItem[], what: string) => {
    if (!list.length) return;
    const bytes = sum(list);
    const ok = await confirm(
      `Borrar ${list.length === 1 ? '1 grabación' : `${list.length} grabaciones`}`,
      `${what}\n\nLiberarás ${fmtBytes(bytes)}. Los informes, gráficos y métricas de esas noches se conservan; solo dejarás de poder escuchar el audio.`,
      'Borrar audio',
      true,
    );
    if (!ok) return;
    deleteAudioFor(list.map((i) => i.id));
    setSelected((s) => s.filter((id) => !list.some((i) => i.id === id)));
    notify('Listo', `Liberaste ${fmtBytes(bytes)} de espacio.`);
  };

  const changeLimit = async (limit: number) => {
    const affected = audioInventory(audioBeyondLimit(limit, nights));
    if (affected.length) {
      const ok = await confirm(
        `Conservar ${limit} noches`,
        `Se borrará el audio de las ${affected.length} noches más antiguas (${fmtBytes(sum(affected))}). Sus informes se conservan.`,
        'Aplicar',
        true,
      );
      if (!ok) return;
    }
    setAudioNights(limit);
  };

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = items.length > 0 && selected.length === items.length;

  return (
    <Screen edges={['top', 'bottom']} bottomInset={40}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h2">Grabaciones y espacio</Txt>
        <IconButton name="close" label="Cerrar" onPress={() => router.back()} />
      </Row>

      {/* 1. How much space */}
      <Card tone="accent" style={{ gap: Spacing.three }}>
        <Row gap={Spacing.three}>
          <View style={styles.bigIcon}>
            <Icon name="wave" size={26} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="caption">TUS GRABACIONES OCUPAN</Txt>
            <Txt variant="title">{fmtBytes(used)}</Txt>
            <Txt variant="small">
              {items.length === 0 ? 'No hay audios guardados' : `${items.length} ${items.length === 1 ? 'noche' : 'noches'} con audio`}
              {free != null ? ` · ${fmtBytes(free)} libres en el teléfono` : ''}
            </Txt>
          </View>
        </Row>
        {free != null && used > 0 ? (
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.max(2, Math.min(100, (used / (used + free)) * 100))}%` }]} />
          </View>
        ) : null}
      </Card>

      {/* 2. What happens when deleting */}
      <Card>
        <Txt variant="h3">¿Qué pasa si borro el audio?</Txt>
        <Row gap={Spacing.three} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Row gap={6}>
              <Icon name="check" size={14} color={Colors.good} />
              <Txt variant="small" color={Colors.text}>
                Se conserva
              </Txt>
            </Row>
            <Txt variant="caption">Informe y puntuación</Txt>
            <Txt variant="caption">Gráficos y métricas</Txt>
            <Txt variant="caption">Encuesta y consejos</Txt>
            <Txt variant="caption">Tendencias e historial</Txt>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Row gap={6}>
              <Icon name="close" size={14} color={Colors.critical} />
              <Txt variant="small" color={Colors.text}>
                Se pierde
              </Txt>
            </Row>
            <Txt variant="caption">Escuchar los ronquidos</Txt>
            <Txt variant="caption">Revisar episodios (mío / otra persona)</Txt>
          </View>
        </Row>
        <Txt variant="caption">Consejo: revisa algunos episodios antes de borrar; así Noctua aprende cuánto acierta contigo.</Txt>
      </Card>

      {/* 3. Save audio? */}
      <SectionTitle>Paso 1 · ¿Guardar el audio de cada noche?</SectionTitle>
      <OptionList
        value={settings.keepAudio ? 'yes' : 'no'}
        onChange={(v) => updateSettings({ keepAudio: v === 'yes' })}
        options={[
          {
            value: 'yes',
            label: 'Sí, guardar el audio',
            hint: `Podrás escuchar tus ronquidos. Ocupa ~${AUDIO_MB_PER_HOUR} MB por hora (≈${NIGHT_MB} MB por noche de 8 h).`,
          },
          {
            value: 'no',
            label: 'No, solo el análisis',
            hint: 'Ocupa casi nada (menos de 1 MB por noche). El análisis y los informes son igual de completos.',
          },
        ]}
      />
      <Txt variant="caption">
        También puedes decidirlo cada noche antes de dormir. Durante la noche el audio se guarda temporalmente para poder analizarlo; si
        eliges no guardarlo, se borra automáticamente al despertar.
      </Txt>

      {/* 4. Retention */}
      {settings.keepAudio ? (
        <>
          <SectionTitle>Paso 2 · ¿Cuántas noches conservar?</SectionTitle>
          <Card>
            <Txt variant="small">Al guardar una noche nueva, el audio más antiguo se borra solo.</Txt>
            <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
              {LIMITS.map((l) => (
                <Chip key={l.value} label={l.label} selected={settings.audioNights === l.value} onPress={() => changeLimit(l.value)} />
              ))}
            </Row>
            <Txt variant="caption">
              {settings.audioNights > 0
                ? `Ocupará como máximo ≈${fmtBytes(settings.audioNights * NIGHT_MB * 1024 * 1024)} con noches de 8 h.`
                : 'Sin límite: los audios se acumulan hasta que los borres.'}
            </Txt>
          </Card>
        </>
      ) : null}

      {/* 5. Quick clean-up */}
      <SectionTitle>Liberar espacio rápido</SectionTitle>
      <QuickAction
        icon="lungs"
        title="Noches sin ronquidos"
        text="No hay nada que escuchar en ellas."
        items={noSnore}
        onPress={() => remove(noSnore, 'Se borrará el audio de las noches en las que no se detectaron ronquidos.')}
      />
      <QuickAction
        icon="check"
        title="Noches ya revisadas"
        text="Ya marcaste sus episodios."
        items={reviewed}
        onPress={() => remove(reviewed, 'Se borrará el audio de las noches cuyos episodios ya revisaste.')}
      />
      <QuickAction
        icon="calendar"
        title="Más de 7 días"
        text="Grabaciones antiguas."
        items={old}
        onPress={() => remove(old, 'Se borrará el audio de las noches de hace más de una semana.')}
      />
      <QuickAction
        icon="trash"
        title="Todas las grabaciones"
        text="Libera todo el espacio de audio."
        items={items}
        danger
        onPress={() => remove(items, 'Se borrará el audio de todas tus noches.')}
      />

      {/* 6. Pick nights */}
      {items.length ? (
        <>
          <SectionTitle
            action={
              <Txt variant="small" color={Colors.accent} onPress={() => setSelected(allSelected ? [] : items.map((i) => i.id))}>
                {allSelected ? 'Quitar selección' : 'Seleccionar todas'}
              </Txt>
            }>
            O elige noche por noche
          </SectionTitle>
          <Card style={{ gap: 0 }}>
            {items.map((i, k) => {
              const on = selected.includes(i.id);
              return (
                <View key={i.id}>
                  {k > 0 ? <Divider /> : null}
                  <Pressable onPress={() => toggle(i.id)} style={({ pressed }) => [styles.itemRow, pressed && { opacity: 0.7 }]}>
                    <View style={[styles.check, on && styles.checkOn]}>{on ? <Icon name="check" size={12} color="#fff" /> : null}</View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="h3">{fmtNightDate(i.start)}</Txt>
                      <Txt variant="caption">
                        {fmtDuration(i.durationMin)} ·{' '}
                        {i.episodes ? `${i.episodes} episodios de ronquido` : 'sin ronquidos'}
                        {i.reviewed ? ' · revisada' : ''}
                      </Txt>
                    </View>
                    <Txt variant="small" color={Colors.text}>
                      {fmtBytes(i.bytes)}
                    </Txt>
                  </Pressable>
                  <Txt
                    variant="caption"
                    color={Colors.accent}
                    style={{ marginLeft: 34, marginBottom: 6 }}
                    onPress={() => router.push(`/night/${i.id}`)}>
                    Abrir informe y escuchar →
                  </Txt>
                </View>
              );
            })}
          </Card>
          <Button
            title={chosen.length ? `Borrar audio de ${chosen.length} (${fmtBytes(sum(chosen))})` : 'Selecciona noches para borrar'}
            icon="trash"
            variant="danger"
            disabled={!chosen.length}
            onPress={() => remove(chosen, 'Se borrará el audio de las noches seleccionadas.')}
          />
        </>
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: Spacing.four }}>
          <Icon name="check" size={28} color={Colors.good} />
          <Txt variant="h3">No hay grabaciones guardadas</Txt>
          <Txt variant="small" style={{ textAlign: 'center' }}>
            Tus informes siguen disponibles en el historial.
          </Txt>
        </Card>
      )}
    </Screen>
  );
}

function QuickAction({
  icon,
  title,
  text,
  items,
  danger,
  onPress,
}: {
  icon: 'lungs' | 'check' | 'calendar' | 'trash';
  title: string;
  text: string;
  items: AudioItem[];
  danger?: boolean;
  onPress: () => void;
}) {
  const empty = items.length === 0;
  return (
    <Card onPress={empty ? undefined : onPress} style={empty ? { opacity: 0.45 } : undefined}>
      <Row gap={Spacing.three}>
        <Icon name={icon} size={20} color={danger ? Colors.critical : Colors.accent} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3">{title}</Txt>
          <Txt variant="caption">{empty ? 'Nada que borrar' : `${text} ${items.length} ${items.length === 1 ? 'noche' : 'noches'}.`}</Txt>
        </View>
        {!empty ? (
          <Txt variant="small" color={danger ? Colors.critical : Colors.text}>
            {fmtBytes(sum(items))}
          </Txt>
        ) : null}
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  bigIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { height: 8, borderRadius: 4, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  check: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm / 2,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
});
