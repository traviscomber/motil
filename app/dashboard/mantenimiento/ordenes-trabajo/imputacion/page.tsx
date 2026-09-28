import { getDictionaryForRequest } from '@/lib/i18n/server';
import { CostCenterReview } from '@/components/maintenance/cost-center-review';

export default async function CostCenterReviewPage() {
  const { locale, dictionary } = await getDictionaryForRequest();

  return <CostCenterReview locale={locale} dictionary={dictionary} />;
}
