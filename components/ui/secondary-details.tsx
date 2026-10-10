import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function SecondaryDetails({ children, label = 'Ver más' }: { children: ReactNode; label?: string }) {
  return (
    <details className="group rounded-lg border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {label}<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-5 border-t p-4">{children}</div>
    </details>
  );
}
