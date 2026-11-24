import type { IconName } from '@/components/ui';

export interface Article {
  slug: string;
  title: string;
  subtitle: string;
  icon: IconName;
  sections: { heading: string; body: string }[];
  sources: string[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'ronquido',
    title: '¿Por qué roncamos?',
    subtitle: 'Tipos de ronquido y sus causas',
    icon: 'lungs',
    sections: [
      {
        heading: 'Qué es el ronquido',
        body: 'El ronquido es el sonido que producen los tejidos blandos de la vía aérea superior (paladar blando, úvula, amígdalas, base de la lengua) al vibrar cuando el aire pasa por una vía estrechada. Durante el sueño los músculos que mantienen abierta la garganta se relajan, y si el espacio es reducido el flujo de aire se vuelve turbulento.',
      },
      {
        heading: 'Qué tan frecuente es',
        body: 'Es muy común: en el estudio Wisconsin Sleep Cohort, alrededor del 44% de los hombres y el 28% de las mujeres de 30 a 60 años roncaban de forma habitual. La prevalencia aumenta con la edad, el peso y, en mujeres, tras la menopausia.',
      },
      {
        heading: 'Tipos de ronquido',
        body: '• Nasal: por congestión, desviación del tabique o alergias. Suele mejorar con lavados nasales o tratando la alergia.\n• Palatino (boca abierta): vibración del paladar blando y la úvula; típico al respirar por la boca.\n• Lingual (base de la lengua): la lengua cae hacia atrás, sobre todo boca arriba; frecuente con alcohol o sedantes.\n• Posicional: aparece o empeora claramente al dormir boca arriba.\n• Multinivel: combinación de varios puntos de vibración.',
      },
      {
        heading: 'Factores de riesgo',
        body: 'Sobrepeso (especialmente perímetro de cuello grande), alcohol y sedantes, tabaco, congestión nasal, dormir boca arriba, edad, sexo masculino, mandíbula retraída, amígdalas grandes, embarazo, privación de sueño e hipotiroidismo.',
      },
      {
        heading: 'Ronquido simple vs. apnea',
        body: 'El ronquido simple no interrumpe la respiración. Si el ronquido es fuerte y se acompaña de pausas, despertares con ahogo, somnolencia diurna o hipertensión, puede ser síntoma de apnea obstructiva del sueño y conviene consultar.',
      },
    ],
    sources: [
      'Young T. et al. The occurrence of sleep-disordered breathing among middle-aged adults. NEJM 1993.',
      'Stuck BA. et al. Diagnosis and treatment of snoring in adults. Eur Arch Otorhinolaryngol 2019.',
    ],
  },
  {
    slug: 'apnea',
    title: 'Apnea obstructiva del sueño',
    subtitle: 'Señales de alarma, diagnóstico y tratamiento',
    icon: 'warning',
    sections: [
      {
        heading: 'Qué es',
        body: 'En la apnea obstructiva del sueño (AOS) la vía aérea se cierra parcial (hipopnea) o totalmente (apnea) durante 10 segundos o más, repetidamente durante la noche. Baja el oxígeno y el cerebro provoca microdespertares para reabrir la vía aérea, fragmentando el sueño.',
      },
      {
        heading: 'Cómo se mide',
        body: 'Con el índice de apnea-hipopnea (IAH), eventos por hora de sueño: 5–14 leve, 15–29 moderada, ≥30 grave. Solo se puede medir con polisomnografía o poligrafía respiratoria, que registran flujo de aire, esfuerzo respiratorio y oxígeno. El micrófono de un teléfono NO puede calcular el IAH.',
      },
      {
        heading: 'Señales de alarma',
        body: 'Ronquido fuerte y habitual, pausas observadas por tu pareja, despertares con sensación de ahogo, somnolencia diurna, dolor de cabeza matutino, boca seca, nicturia, hipertensión difícil de controlar, dificultad de concentración.',
      },
      {
        heading: 'Por qué importa',
        body: 'La AOS no tratada se asocia a hipertensión, fibrilación auricular, ictus, diabetes tipo 2, accidentes de tráfico por somnolencia y peor calidad de vida.',
      },
      {
        heading: 'Tratamientos con evidencia',
        body: '• CPAP: presión positiva continua, tratamiento de referencia en casos moderados-graves.\n• Dispositivos de avance mandibular: útiles en ronquido y apnea leve-moderada.\n• Terapia posicional: si la apnea ocurre sobre todo boca arriba.\n• Pérdida de peso, ejercicio y evitar alcohol y sedantes.\n• Cirugía en casos seleccionados.',
      },
      {
        heading: 'Qué hace Noctua',
        body: 'Noctua marca "posibles pausas": silencios de 10 a 90 segundos dentro de un periodo de ronquido, seguidos de un ronquido más fuerte. Es un patrón acústico orientativo, útil para llevar a la consulta, pero no es un diagnóstico.',
      },
    ],
    sources: [
      'Kapur VK. et al. Clinical Practice Guideline for Diagnostic Testing for Adult OSA. J Clin Sleep Med 2017.',
      'Benjafield AV. et al. Estimation of the global prevalence of OSA. Lancet Respir Med 2019.',
      'Chung F. et al. STOP-Bang Questionnaire. Chest 2016.',
    ],
  },
  {
    slug: 'fases',
    title: 'Las fases del sueño',
    subtitle: 'Ciclos, sueño profundo y REM',
    icon: 'brain',
    sections: [
      {
        heading: 'Ciclos de ~90 minutos',
        body: 'Durante la noche pasamos por 4–6 ciclos de unos 90 minutos. Cada ciclo recorre las fases N1, N2, N3 (sueño no-REM) y el sueño REM.',
      },
      {
        heading: 'N1 y N2: sueño ligero',
        body: 'N1 es la transición vigilia-sueño (unos minutos). N2 ocupa cerca de la mitad de la noche: baja la temperatura corporal y aparecen los husos de sueño, relacionados con la consolidación de la memoria.',
      },
      {
        heading: 'N3: sueño profundo',
        body: 'Predomina en la primera mitad de la noche. Es el más reparador físicamente: se libera hormona del crecimiento y se favorece la recuperación. Disminuye con la edad.',
      },
      {
        heading: 'REM',
        body: 'Predomina en la segunda mitad de la noche. Es la fase de los sueños vívidos; los músculos están casi paralizados. Por esa relajación muscular, en muchas personas el ronquido y las apneas empeoran en REM.',
      },
      {
        heading: '¿Por qué Noctua no muestra fases?',
        body: 'Las fases del sueño se definen por la actividad eléctrica del cerebro (EEG), los ojos y los músculos. Ningún micrófono puede medirlas de forma fiable. En lugar de inventar un hipnograma, Noctua muestra un "mapa acústico" (calma, ronquido y actividad) que sí se basa en lo que realmente registra.',
      },
    ],
    sources: [
      'Berry RB. et al. AASM Manual for the Scoring of Sleep and Associated Events, v3.',
      'Ohayon MM. et al. Meta-analysis of quantitative sleep parameters from childhood to old age. Sleep 2004.',
    ],
  },
  {
    slug: 'cronotipo',
    title: 'Tu cronotipo',
    subtitle: 'Alondras, búhos y jet lag social',
    icon: 'sun',
    sections: [
      {
        heading: 'Qué es',
        body: 'El cronotipo es tu preferencia natural de horario, determinada en parte por la genética y la edad. Los matutinos ("alondras") se activan temprano; los vespertinos ("búhos") rinden mejor de tarde-noche. La mayoría estamos en el medio.',
      },
      {
        heading: 'Cambia con la edad',
        body: 'Los adolescentes y adultos jóvenes tienden a ser más vespertinos; a partir de los 20–25 años el cronotipo se adelanta progresivamente.',
      },
      {
        heading: 'Jet lag social',
        body: 'Es el desfase entre tu reloj biológico y tus horarios sociales (trabajo, estudios). Se nota en la diferencia entre la hora en que duermes en días laborables y en días libres. Se asocia con peor ánimo, más consumo de cafeína y mayor riesgo metabólico.',
      },
      {
        heading: 'Cómo ajustarlo',
        body: 'La luz es el principal sincronizador: luz natural intensa por la mañana adelanta tu reloj; la luz brillante por la noche lo retrasa. Mantén horarios regulares incluso en fin de semana.',
      },
    ],
    sources: [
      'Adan A, Almirall H. Horne & Östberg MEQ: a reduced scale. Pers Individ Dif 1991.',
      'Roenneberg T. et al. Social jetlag and obesity. Curr Biol 2012.',
    ],
  },
  {
    slug: 'higiene',
    title: 'Hábitos que mejoran el sueño',
    subtitle: 'Recomendaciones con respaldo científico',
    icon: 'sparkles',
    sections: [
      {
        heading: 'Regularidad',
        body: 'Acostarte y levantarte a la misma hora todos los días estabiliza tu ritmo circadiano. La regularidad se asocia a mejor salud incluso más allá de las horas totales de sueño.',
      },
      {
        heading: 'Luz',
        body: 'Busca luz natural por la mañana y reduce luces intensas y pantallas 1 hora antes de dormir.',
      },
      {
        heading: 'Cafeína y alcohol',
        body: 'Evita la cafeína después de las 14 h (vida media 5–6 h). El alcohol ayuda a dormirse pero fragmenta la segunda mitad de la noche y aumenta el ronquido.',
      },
      {
        heading: 'Ejercicio',
        body: 'El ejercicio regular mejora la calidad del sueño y reduce el tiempo para dormirse. Evita solo el ejercicio muy intenso en la hora previa a acostarte.',
      },
      {
        heading: 'Dormitorio',
        body: 'Fresco (~17–20 °C), oscuro y silencioso. Usa la cama solo para dormir; si no te duermes en unos 20 minutos, levántate y vuelve cuando tengas sueño.',
      },
      {
        heading: 'Cuándo consultar',
        body: 'Si el insomnio dura más de 3 meses, si tienes somnolencia diurna importante o si sospechas apnea. La terapia cognitivo-conductual para el insomnio (TCC-I) es el tratamiento de primera elección para el insomnio crónico.',
      },
    ],
    sources: [
      'Irish LA. et al. The role of sleep hygiene in promoting public health. Sleep Med Rev 2015.',
      'Qaseem A. et al. Management of Chronic Insomnia Disorder in Adults. Ann Intern Med 2016.',
      'Drake C. et al. Caffeine effects on sleep taken 0, 3, or 6 hours before bed. J Clin Sleep Med 2013.',
    ],
  },
  {
    slug: 'metodo',
    title: 'Cómo mide Noctua',
    subtitle: 'Qué medimos, cómo y sus límites',
    icon: 'science',
    sections: [
      {
        heading: 'Lo que escucha',
        body: 'Durante la noche, Noctua lee el nivel de sonido del micrófono 4 veces por segundo y graba el audio en baja calidad para que puedas escuchar tus ronquidos. Todo se procesa y guarda solo en tu teléfono.',
      },
      {
        heading: 'Cómo detecta el ronquido',
        body: '1) Calcula el ruido de fondo de tu habitación de forma adaptativa. 2) Detecta sonidos que lo superan claramente. 3) Los sonidos de 0,35 a 4,5 s son candidatos (como una respiración). 4) Solo se cuentan como ronquido cuando se repiten con el ritmo de la respiración (cada 2–10 s, de forma regular). Así se descartan ruidos aislados, voces o tráfico.',
      },
      {
        heading: 'Valores en dB',
        body: 'Los micrófonos de los teléfonos no están calibrados. Los dB que ves son estimaciones útiles para comparar noches en el mismo teléfono y la misma posición, no mediciones de sonómetro.',
      },
      {
        heading: 'Puntuación de la noche',
        body: 'Combina duración frente a lo recomendado para tu edad (40 pts), ronquido y posibles pausas (25), continuidad (15) y tu valoración subjetiva por la mañana (20). Es orientativa.',
      },
      {
        heading: 'Cobertura del análisis',
        body: 'El análisis en vivo funciona mientras Noctua está abierta. Si la pantalla se bloquea o la app pasa a segundo plano, algunos teléfonos pausan el análisis aunque el audio siga grabándose. Cada informe indica qué porcentaje de la noche se analizó y marca en gris los minutos sin datos, para que nunca confundas "sin datos" con "sin ronquido".',
      },
      {
        heading: 'Tu precisión real',
        body: 'Al revisar los episodios de ronquido ("mi ronquido", "otra persona", "no era ronquido") Noctua calcula qué porcentaje de detecciones acierta en tu dormitorio y te sugiere ajustar la sensibilidad si hay muchos falsos positivos.',
      },
      {
        heading: 'Para mejores resultados',
        body: 'Coloca el teléfono a 0,5–1 m de tu cabeza, conectado al cargador. Si duermes acompañado, la detección puede incluir los ronquidos de la otra persona.',
      },
      {
        heading: 'Aviso',
        body: 'Noctua es una herramienta de bienestar y autoconocimiento, no un dispositivo médico. No diagnostica ni sustituye la valoración de un profesional sanitario.',
      },
    ],
    sources: [
      'Dafna E. et al. Automatic detection of whole night snoring events using non-contact microphone. PLoS One 2013.',
      'Jané R. et al. Automatic snoring signal analysis in sleep studies. IEEE EMBS 2003.',
    ],
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);
