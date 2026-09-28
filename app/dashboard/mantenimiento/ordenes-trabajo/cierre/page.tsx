import type { Metadata } from 'next';
import { getDictionaryForRequest } from '@/lib/i18n/server';
import { ProgressiveWorkOrderCloseQueue } from '@/components/maintenance/progressive-work-order-close-queue';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getDictionaryForRequest();
  const t = dictionary.app.workOrderClose;

  return {
    title: t.meta.title,
    description: t.meta.description,
  };
}

export default async function WorkOrderCloseQueuePage() {
  const { dictionary } = await getDictionaryForRequest();
  const t = dictionary.app.workOrderClose;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>{t.eyebrow}</PageHeaderEyebrow>
          <PageHeaderTitle>{t.title}</PageHeaderTitle>
          <PageHeaderDescription>{t.description}</PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <ProgressiveWorkOrderCloseQueue />
    </div>
  );
}
