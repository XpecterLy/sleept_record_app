import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Card, Icon, IconButton, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getArticle } from '@/content/learn';

export default function LearnArticle() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const a = getArticle(slug);

  return (
    <Screen>
      <IconButton name="back" label="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/insights'))} />
      {!a ? (
        <Txt>Artículo no encontrado.</Txt>
      ) : (
        <>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={a.icon} size={28} color={Colors.accent} />
          </View>
          <Txt variant="title">{a.title}</Txt>
          <Txt variant="h3" color={Colors.textSecondary}>
            {a.subtitle}
          </Txt>
          {a.sections.map((s) => (
            <View key={s.heading} style={{ gap: Spacing.two }}>
              <Txt variant="h3">{s.heading}</Txt>
              <Txt>{s.body}</Txt>
            </View>
          ))}
          <SectionTitle>Fuentes</SectionTitle>
          <Card>
            {a.sources.map((s) => (
              <Row key={s} gap={Spacing.two} style={{ alignItems: 'flex-start' }}>
                <Icon name="book" size={12} color={Colors.textMuted} />
                <Txt variant="caption" style={{ flex: 1 }}>
                  {s}
                </Txt>
              </Row>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
