import { TabList, TabSlot, TabTrigger, Tabs, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

import { Icon, Txt, type IconName } from './ui';

const TABS: { name: string; href: '/' | '/history' | '/insights' | '/profile'; label: string; icon: IconName }[] = [
  { name: 'index', href: '/', label: 'Dormir', icon: 'moon' },
  { name: 'history', href: '/history', label: 'Historial', icon: 'calendar' },
  { name: 'insights', href: '/insights', label: 'Análisis', icon: 'chart' },
  { name: 'profile', href: '/profile', label: 'Perfil', icon: 'person' },
];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabButton icon={t.icon}>{t.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: IconName }) {
  const color = isFocused ? Colors.text : Colors.textMuted;
  return (
    <Pressable {...(props as PressableProps)} style={({ pressed }) => [styles.tab, isFocused && styles.tabOn, pressed && { opacity: 0.7 }]}>
      <Icon name={icon} size={18} color={color} />
      <Txt variant="caption" color={color}>
        {children}
      </Txt>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.container}>
      <View style={styles.inner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, width: '100%', padding: Spacing.three, alignItems: 'center' },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.one,
  },
  tab: { alignItems: 'center', gap: 2, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Radius.lg, flex: 1 },
  tabOn: { backgroundColor: Colors.accentSoft },
});
