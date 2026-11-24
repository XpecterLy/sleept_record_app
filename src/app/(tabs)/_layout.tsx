import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useStore } from '@/lib/store';

export default function TabLayout() {
  const hasProfile = useStore((s) => !!s.profile);
  if (!hasProfile) return <Redirect href="/onboarding" />;
  return <AppTabs />;
}
