import { getDictionaryForRequest } from '@/lib/i18n/server';
import { DecisionCenterShell } from '@/components/dashboard/decision-center-shell';

export default async function DecisionCenterLayout({ children }: { children: React.ReactNode }) {
  const { dictionary } = await getDictionaryForRequest();
  return <DecisionCenterShell dictionary={dictionary}>{children}</DecisionCenterShell>;
}
