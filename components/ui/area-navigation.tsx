'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Item = { href: string; label: string; onSelect?: () => void };

export function AreaNavigation({ label, primary, secondary, isActive }: {
  label: string;
  primary: Item[];
  secondary: Item[];
  isActive: (href: string) => boolean;
}) {
  const activeSecondary = secondary.find((item) => isActive(item.href));
  return (
    <nav aria-label={label} className="flex min-w-0 items-center gap-1 border-b pb-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain" role="group" aria-label={`${label}: vistas principales`}>
      {primary.map((item) => (
        <Link key={item.href} href={item.href} onClick={item.onSelect ? (event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); item.onSelect?.(); } : undefined} aria-current={isActive(item.href) ? 'page' : undefined}
          className={cn('inline-flex min-h-11 items-center rounded-md px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isActive(item.href) ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
          {item.label}
        </Link>
      ))}
      </div>
      {secondary.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={cn('min-h-11 shrink-0 gap-2 text-sm', activeSecondary ? 'bg-muted' : 'text-muted-foreground')}>
              {activeSecondary?.label || 'Más'}<ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {secondary.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} onClick={item.onSelect ? (event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); item.onSelect?.(); } : undefined} aria-current={isActive(item.href) ? 'page' : undefined}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );
}
