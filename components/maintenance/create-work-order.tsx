'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, LoaderCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatePanel } from '@/components/ui/state-panel';
import { Textarea } from '@/components/ui/textarea';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

type Asset = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  model: string | null;
};

type DrillingReview = {
  review_id: string;
  source_report_id: string;
  canonical_asset_id: string;
  asset_code: string | null;
  asset_name: string | null;
  operation_date: string | null;
  review_reason: string;
  equipment_status_raw: string | null;
  machine_observations: string | null;
  review_status: string;
  linked_work_order_id: string | null;
  has_linked_work_order: boolean;
};

type WorkOrderCreateT = Dictionary['app']['workOrderCreate'];

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function CreateWorkOrder({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const t = dictionary.app.workOrderCreate;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get('assetId') || '';
  const reviewId = searchParams.get('reviewId') || '';
  const [canonicalAssetId, setCanonicalAssetId] = useState(initialAssetId);
  const [title, setTitle] = useState(searchParams.get('title') || '');
  const [description, setDescription] = useState(searchParams.get('description') || '');
  const [requestedMaterials, setRequestedMaterials] = useState('');
  const [workType, setWorkType] = useState(searchParams.get('workType') || 'preventive');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'medium');
  const [scheduledDate, setScheduledDate] = useState(searchParams.get('scheduledDate') || new Date().toISOString().slice(0, 10));
  const [plannedHours, setPlannedHours] = useState(searchParams.get('plannedDurationHours') || '');
  const [assignedToName, setAssignedToName] = useState('');
  const [meterReading, setMeterReading] = useState('');
  const [meterUnit, setMeterUnit] = useState('hours');
  const [submitting, setSubmitting] = useState(false);

  const fetcher = async (url: string) => {
    const response = await fetch(url, { credentials: 'include' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || t.loadDataError);
    return payload;
  };

  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/equipment', fetcher, { revalidateOnFocus: false });
  const {
    data: reviewData,
    error: reviewError,
    isLoading: reviewLoading,
  } = useSWR(reviewId ? `/api/maintenance/drilling-reviews/${reviewId}` : null, fetcher, { revalidateOnFocus: false });

  const assets = useMemo(() => (Array.isArray(data?.equipment) ? (data.equipment as Asset[]) : []), [data]);
  const selectedAsset = assets.find((asset) => asset.id === canonicalAssetId) || null;
  const review = (reviewData?.review || null) as DrillingReview | null;

  useEffect(() => {
    if (!review) return;
    if (!canonicalAssetId && review.canonical_asset_id) setCanonicalAssetId(review.canonical_asset_id);
    if (!title.trim()) {
      setTitle(fill(t.reviewTitleTemplate, { asset: review.asset_name || review.asset_code || t.fallbackEquipment }));
    }
    if (!description.trim()) {
      setDescription([
        review.equipment_status_raw ? fill(t.reviewReportedStatus, { value: review.equipment_status_raw }) : null,
        review.machine_observations ? fill(t.reviewObservation, { value: review.machine_observations }) : null,
        review.operation_date ? fill(t.reviewReportDate, { value: review.operation_date }) : null,
      ].filter(Boolean).join('\n'));
    }
  }, [review, canonicalAssetId, title, description, t]);

  const validate = () => {
    if (!canonicalAssetId) return t.validation.assetRequired;
    if (review && review.canonical_asset_id !== canonicalAssetId) return t.validation.reviewAssetMismatch;
    if (!title.trim()) return t.validation.titleRequired;
    if (!scheduledDate) return t.validation.dateRequired;
    if (plannedHours && (!Number.isFinite(Number(plannedHours)) || Number(plannedHours) < 0)) {
      return t.validation.plannedHoursInvalid;
    }
    if (meterReading && (!Number.isFinite(Number(meterReading)) || Number(meterReading) < 0)) {
      return t.validation.meterReadingInvalid;
    }
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) return toast.error(validationError);

    setSubmitting(true);
    try {
      const response = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          canonicalAssetId,
          reviewId: reviewId || null,
          title: title.trim(),
          description: description.trim() || null,
          requestedMaterials: requestedMaterials.trim() || null,
          workType,
          priority,
          scheduledDate,
          plannedDurationHours: plannedHours ? Number(plannedHours) : 0,
          assignedToName: assignedToName.trim() || null,
          meterReading: meterReading ? Number(meterReading) : null,
          meterUnit: meterReading ? meterUnit : null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || t.createError);
      toast.success(reviewId ? t.toastLinked : t.toastCreated);
      router.push(`/dashboard/mantenimiento/ordenes-trabajo/${payload.data.id}`);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : t.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>{t.eyebrow}</PageHeaderEyebrow>
          <PageHeaderTitle>{t.title}</PageHeaderTitle>
          <PageHeaderDescription>{reviewId ? t.descriptionReview : t.descriptionDefault}</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <Link href={`/dashboard/mantenimiento/ordenes-trabajo`}><ArrowLeft className="h-4 w-4" />{t.back}</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {error ? (
        <StatePanel
          tone="error"
          title={t.loadEquipmentError}
          description={error.message}
          actions={<Button variant="outline" onClick={() => void mutate()}>{t.retry}</Button>}
          className="min-h-0 py-5"
        />
      ) : null}

      {reviewError ? (
        <StatePanel
          tone="error"
          title={t.loadReviewError}
          description={reviewError.message}
          className="min-h-0 py-5"
        />
      ) : null}

      {reviewId && !reviewError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.reviewCard.title}</CardTitle>
            <CardDescription>{reviewLoading ? t.reviewCard.loading : t.reviewCard.description}</CardDescription>
          </CardHeader>
          {review ? (
            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">{t.reviewCard.reportedAsset}</p><p className="font-medium">{review.asset_name || review.asset_code || t.noName}</p></div>
              <div><p className="text-xs text-muted-foreground">{t.reviewCard.reportDate}</p><p className="font-medium">{review.operation_date || t.noDate}</p></div>
              <div><p className="text-xs text-muted-foreground">{t.reviewCard.status}</p><p className="font-medium">{review.equipment_status_raw || t.noStatus}</p></div>
              <div><p className="text-xs text-muted-foreground">{t.reviewCard.review}</p><p className="font-medium">{review.review_status === 'pending' ? t.reviewCard.pendingResolution : review.review_status}</p></div>
              {review.machine_observations ? <div className="md:col-span-2"><p className="text-xs text-muted-foreground">{t.reviewCard.observation}</p><p className="font-medium">{review.machine_observations}</p></div> : null}
              {review.linked_work_order_id ? (
                <div className="md:col-span-2">
                  <Button asChild variant="outline" size="sm"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${review.linked_work_order_id}`}>{t.reviewCard.openLinked}</Link></Button>
                </div>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section1}</CardTitle>
          <CardDescription>{t.section1Description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="asset">{t.fields.asset}</Label>
            <Select value={canonicalAssetId} onValueChange={setCanonicalAssetId} disabled={isLoading || Boolean(error) || Boolean(reviewId)}>
              <SelectTrigger id="asset"><SelectValue placeholder={isLoading ? t.fields.loadingAssets : t.fields.selectAsset} /></SelectTrigger>
              <SelectContent>{assets.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.code} · {asset.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedAsset ? (
              <p className="text-xs text-muted-foreground">
                {selectedAsset.type}{selectedAsset.model ? ` · ${selectedAsset.model}` : ''} · {t.assetStatus[selectedAsset.status as keyof typeof t.assetStatus] || selectedAsset.status}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="work-title">{t.fields.workTitle}</Label>
            <Input id="work-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t.fields.workTitlePlaceholder} maxLength={160} />
            <p className="text-xs text-muted-foreground">{t.fields.workTitleHint}</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">{t.fields.description}</Label>
            <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t.fields.descriptionPlaceholder} rows={4} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="requested-materials">{t.fields.materials}</Label>
            <Textarea id="requested-materials" value={requestedMaterials} onChange={(event) => setRequestedMaterials(event.target.value)} placeholder={t.fields.materialsPlaceholder} rows={3} />
            <p className="text-xs text-muted-foreground">{t.fields.materialsHint}</p>
          </div>

          <div className="space-y-2">
            <Label>{t.fields.workType}</Label>
            <Select value={workType} onValueChange={setWorkType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrective">{t.workTypes.corrective}</SelectItem><SelectItem value="preventive">{t.workTypes.preventive}</SelectItem><SelectItem value="predictive">{t.workTypes.predictive}</SelectItem><SelectItem value="inspection">{t.workTypes.inspection}</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-2">
            <Label>{t.fields.priority}</Label>
            <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">{t.priorities.low}</SelectItem><SelectItem value="medium">{t.priorities.medium}</SelectItem><SelectItem value="high">{t.priorities.high}</SelectItem><SelectItem value="critical">{t.priorities.critical}</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section2}</CardTitle>
          <CardDescription>{t.section2Description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="scheduled-date">{t.fields.scheduledDate}</Label><Input id="scheduled-date" type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="planned-hours">{t.fields.plannedHours}</Label><Input id="planned-hours" type="number" min="0" step="0.5" value={plannedHours} onChange={(event) => setPlannedHours(event.target.value)} placeholder={t.fields.plannedHoursPlaceholder} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="assigned-to">{t.fields.assignedTo}</Label><Input id="assigned-to" value={assignedToName} onChange={(event) => setAssignedToName(event.target.value)} placeholder={t.fields.assignedToPlaceholder} /></div>
          <div className="space-y-2"><Label htmlFor="meter-reading">{t.fields.meterReading}</Label><Input id="meter-reading" type="number" min="0" step="0.1" value={meterReading} onChange={(event) => setMeterReading(event.target.value)} placeholder={t.fields.meterReadingPlaceholder} /></div>
          <div className="space-y-2"><Label>{t.fields.meterUnit}</Label><Select value={meterUnit} onValueChange={setMeterUnit} disabled={!meterReading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hours">{t.meterUnits.hours}</SelectItem><SelectItem value="km">{t.meterUnits.km}</SelectItem><SelectItem value="cycles">{t.meterUnits.cycles}</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button asChild variant="outline"><Link href={`/dashboard/mantenimiento/ordenes-trabajo`}>{t.cancel}</Link></Button>
        <Button onClick={submit} disabled={submitting || isLoading || Boolean(error) || reviewLoading || Boolean(reviewError) || Boolean(review?.linked_work_order_id)}>
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {submitting ? t.creating : reviewId ? t.createAndResolve : t.create}
        </Button>
      </div>
    </div>
  );
}
