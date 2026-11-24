import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, Icon, IconButton, Row, Screen, StatusBadge, Txt, type IconName } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { notify } from '@/lib/confirm';
import { FACTORS } from '@/lib/format';
import { typicalDrain } from '@/lib/battery';
import { checkReadiness, useSession, type Readiness } from '@/lib/session';
import { useStore } from '@/lib/store';
import type { PreSleepFactor } from '@/lib/types';

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'phone', text: 'Teléfono en la mesita, a 0,5–1 m de tu cabeza.' },
  { icon: 'moon', text: 'Deja Noctua abierta con la pantalla en modo nocturno (se apaga casi por completo). No bloquees el teléfono: algunos Android pausan el análisis.' },
  { icon: 'speaker', text: 'Activa "No molestar" para que las notificaciones no te despierten.' },
  { icon: 'ear', text: 'No lo cubras con almohadas ni mantas. Mejor boca arriba, sin funda que tape el micrófono.' },
];

export default function PreSleep() {
  const name = useStore((s) => s.profile?.name.split(' ')[0] ?? '');
  const { start } = useSession();
  const [factors, setFactors] = useState<PreSleepFactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<Readiness | null>(null);
  const drain = typicalDrain(useStore((s) => s.nights));
  const defaultKeep = useStore((s) => s.settings.keepAudio);
  const [keepAudio, setKeepAudio] = useState(defaultKeep);

  useEffect(() => {
    let alive = true;
    checkReadiness().then((r) => alive && setReady(r));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = (k: PreSleepFactor) => setFactors((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));

  const begin = async () => {
    setLoading(true);
    try {
      const { audio } = await start(factors, { keepAudio });
      router.replace('/session');
      if (keepAudio && !audio) {
        notify('Poco espacio libre', 'Esta noche se analizará sin guardar el audio porque queda poco espacio en el teléfono.');
      }
    } catch (e) {
      setLoading(false);
      if (e instanceof Error && e.message === 'permission') {
        notify('Micrófono necesario', 'Noctua necesita acceso al micrófono para detectar ronquidos. Actívalo en los ajustes del teléfono.');
      } else {
        notify('No se pudo iniciar', String(e));
      }
    }
  };

  return (
    <Screen edges={['top', 'bottom']} bottomInset={40}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="label">Antes de dormir</Txt>
        <IconButton name="close" label="Cerrar" onPress={() => router.back()} />
      </Row>
      <Txt variant="title">¿Algo especial hoy, {name}?</Txt>
      <Txt>
        Marca lo que aplique. Con el tiempo compararemos tus noches y te diremos qué factores afectan realmente a tu ronquido y tu
        descanso.
      </Txt>
      <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
        {FACTORS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            icon={f.icon as IconName}
            selected={factors.includes(f.key)}
            onPress={() => toggle(f.key)}
          />
        ))}
      </Row>

      {ready ? (
        <Card>
          <Txt variant="label">Comprobación del teléfono</Txt>
          <Check
            ok={ready.charging !== false}
            okText={ready.charging ? 'Cargando' : 'Batería: estado desconocido'}
            badText={`No está cargando${ready.batteryLevel != null ? ` · batería ${Math.round(ready.batteryLevel * 100)}%` : ''}. ${
              drain
                ? `En tu teléfono una noche de 8 h usa ~${drain.per8h}% (medido en ${drain.nights} ${drain.nights === 1 ? 'noche' : 'noches'}).`
                : 'Una noche de 8 h puede usar entre 15% y 40% según el teléfono.'
            }${
              drain && ready.batteryLevel != null && ready.batteryLevel * 100 < drain.per8h + 10
                ? ' Podría no alcanzar hasta la mañana.'
                : ''
            } Te recomendamos conectarlo al cargador.`}
          />
          <Check
            ok={ready.audioPossible}
            okText={ready.freeMb != null ? `Espacio libre: ${(ready.freeMb / 1024).toFixed(1)} GB` : 'Espacio suficiente'}
            badText={`Solo ${ready.freeMb} MB libres: se analizará sin guardar audio.`}
          />
          {ready.lowPower ? <Check ok={false} okText="" badText="Ahorro de energía activo: puede interrumpir el análisis. Desactívalo esta noche." /> : null}
        </Card>
      ) : null}

      <Card>
        <Txt variant="label">Audio de esta noche</Txt>
        <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
          <Chip label="Guardar audio" icon="wave" selected={keepAudio} onPress={() => setKeepAudio(true)} />
          <Chip label="Solo análisis" icon="chart" selected={!keepAudio} onPress={() => setKeepAudio(false)} />
        </Row>
        <Txt variant="caption">
          {keepAudio
            ? 'Podrás escuchar tus ronquidos mañana (~110 MB por noche de 8 h). Puedes borrarlo cuando quieras en Perfil → Grabaciones.'
            : 'No ocupará espacio: el audio se borra al despertar y conservas el informe completo.'}
        </Txt>
      </Card>

      <Card>
        <Txt variant="label">Para una mejor medición</Txt>
        {TIPS.map((t) => (
          <Row key={t.text} gap={Spacing.three} style={{ paddingVertical: 4 }}>
            <Icon name={t.icon} size={18} color={Colors.accent} />
            <Txt variant="small" style={{ flex: 1 }}>
              {t.text}
            </Txt>
          </Row>
        ))}
      </Card>

      <View style={{ gap: Spacing.two }}>
        <Button title="Empezar a escuchar" icon="moon" onPress={begin} loading={loading} />
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          La pantalla se atenuará sola. Si se bloquea por accidente, el audio sigue grabándose y el informe indicará qué parte se analizó.
        </Txt>
      </View>
    </Screen>
  );
}

function Check({ ok, okText, badText }: { ok: boolean; okText: string; badText: string }) {
  return (
    <Row gap={Spacing.two} style={{ paddingVertical: 2 }}>
      <StatusBadge level={ok ? 'good' : 'warning'} label={ok ? 'OK' : 'Atención'} />
      <Txt variant="small" style={{ flex: 1 }}>
        {ok ? okText : badText}
      </Txt>
    </Row>
  );
}
