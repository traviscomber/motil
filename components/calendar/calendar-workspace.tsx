'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComfortableOperationalCalendar } from '@/components/operational-calendar/comfortable-operational-calendar';
import { OperationalCalendar } from '@/components/calendar/operational-calendar';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

export function CalendarWorkspace({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const [view, setView] = useState('calendar');
  return <div className="space-y-4">
    <Tabs value={view} onValueChange={setView}><TabsList aria-label={locale === 'en' ? 'Calendar view' : 'Vista de calendario'}><TabsTrigger value="calendar">{locale === 'en' ? 'Timeline' : 'Calendario'}</TabsTrigger><TabsTrigger value="agenda">Agenda</TabsTrigger></TabsList></Tabs>
    {view === 'calendar' ? <ComfortableOperationalCalendar /> : <OperationalCalendar locale={locale} dictionary={dictionary} />}
  </div>;
}
