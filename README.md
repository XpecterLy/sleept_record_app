# Noctua 🦉

Noctua es una app móvil para registrar y analizar tu sueño. Mientras duermes, escucha por el micrófono, detecta ronquidos y posibles pausas respiratorias, y por la mañana te muestra un informe de la noche con recomendaciones basadas en evidencia científica.

> ⚠️ Noctua es una herramienta de orientación y **no es un dispositivo médico**. Una "posible pausa" es solo una señal de cribado, no un diagnóstico de apnea (eso requiere una polisomnografía).

## Funcionalidades

- **Sesión nocturna**: graba audio mono de baja tasa de bits (unos 14 MB por hora) y analiza el nivel del micrófono en tiempo real, también con la pantalla apagada.
- **Detector de ronquidos**: estima el ruido de fondo de forma adaptativa, filtra eventos según su duración y exige el ritmo de la respiración para clasificar un sonido como ronquido. Agrupa los ronquidos en episodios y marca posibles pausas ([src/lib/analysis/detector.ts](src/lib/analysis/detector.ts)).
- **Informe matutino**: una encuesta breve, la línea de tiempo de la noche y la reproducción de cada episodio.
- **Historial e insights**: tendencias entre noches y efecto de los factores previos al sueño (alcohol, cafeína, cena tardía, etc.).
- **Perfil de salud**: IMC, cuello y antecedentes, cronotipo y hora ideal para acostarse.
- **Tests**: cuestionarios validados, como la escala de somnolencia de Epworth.
- **Fiabilidad**: puedes revisar episodios para medir la precisión del detector en tu dormitorio.
- **Aprende**: artículos sobre el ronquido, la apnea, las fases del sueño, el cronotipo y la higiene del sueño.
- **Privacidad**: todo se queda en el teléfono. No hay cuentas, servidores ni analítica. El audio y los datos se guardan en el almacenamiento local de la app.

## Stack

- [Expo](https://expo.dev) SDK 58 · React Native 0.88 · React 19 · TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/) (rutas basadas en archivos dentro de `src/app/`)
- `expo-audio` (grabación en segundo plano con medición del nivel), `expo-file-system`, `expo-battery`, `expo-keep-awake`
- `react-native-svg` para los gráficos y Reanimated para las animaciones

## Estructura

```
src/
  app/            Pantallas (Expo Router)
    (tabs)/       Inicio, Historial, Insights, Perfil
    night/[id]    Detalle de una noche
    morning/[id]  Encuesta matutina
    learn/[slug]  Artículos
    test/[kind]   Cuestionarios
    session.tsx   Sesión de grabación en curso
  components/     UI reutilizable (ui, form, charts, tabs)
  constants/      Tema (colores y espaciado)
  content/        Contenido de los artículos
  hooks/          Hooks compartidos
  lib/            Lógica: detector, sesión, almacenamiento, ciencia, recomendaciones
tests/            Tests unitarios (node:test)
```

## Desarrollo

Requisitos: Node.js 20 o superior y npm.

```bash
npm install
npx expo start
```

La app usa grabación en segundo plano y módulos nativos, así que en Android y iOS necesitas un **development build**. Expo Go no basta:

```bash
npx expo run:android      # build local (requiere Android Studio)
# o en la nube:
npx eas-cli@latest build --profile preview --platform android   # APK instalable
```

### Calidad

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # tests del detector y del cálculo de batería
```

## Publicar en Google Play

La configuración de EAS está en [eas.json](eas.json):

| Perfil       | Uso                                                  |
| ------------ | ---------------------------------------------------- |
| `preview`    | APK para instalar directamente y probar              |
| `production` | AAB para Play Store, con `versionCode` autoincremental |

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android --profile production
```

El envío sube la build al track **internal** como borrador. Después la promocionas a producción desde Play Console.

**Una sola vez, antes del primer envío:**

1. Crea una cuenta de [Google Play Console](https://play.google.com/console) (pago único de 25 USD) y crea la app.
2. Crea una [cuenta de servicio de Google](https://expo.fyi/creating-google-service-account) y súbela con `npx eas-cli@latest credentials --platform android`. **No subas el JSON de la clave al repositorio.**
3. Completa la ficha de Play Console:
   - **Política de privacidad**: es obligatoria porque la app usa el micrófono.
   - **Seguridad de los datos**: indica que el audio y los datos de salud se procesan y se guardan solo en el dispositivo.
   - **Declaración de servicio en primer plano** (tipo `microphone`): explica que se usa para grabar y analizar el sueño durante la noche, y adjunta un video corto que lo muestre.
   - Clasificación de contenido, público objetivo, capturas de pantalla e icono de 512×512.

El identificador de la app en Android es `com.xpecterly.noctua` (`android.package` en [app.json](app.json)). **No se puede cambiar después de la primera publicación.**

## Licencia

MIT. Consulta [LICENSE](LICENSE).
