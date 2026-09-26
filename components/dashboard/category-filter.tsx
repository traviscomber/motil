'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { BodegaCategory } from '@/hooks/use-module-apis';

interface CategoryFilterProps {
  categories: BodegaCategory[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const totalItems = categories.reduce((sum, c) => sum + c.count, 0);

  if (!isMobile) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            {categories.length} categorías - {totalItems.toLocaleString()} items
          </p>
          {selectedCategory && (
            <p className="text-xs text-muted-foreground">
              Mostrando: <span className="font-medium text-foreground">{selectedCategory}</span>
            </p>
          )}
        </div>
        <div>
          <div className="overflow-x-auto pb-2 [-webkit-mask-image:linear-gradient(to_right,#000,#000_calc(100%-2rem),transparent)] [mask-image:linear-gradient(to_right,#000,#000_calc(100%-2rem),transparent)]">
            <div className="flex gap-2 min-w-min">
              <button
                onClick={() => onCategoryChange('')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0',
                  selectedCategory === ''
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground',
                )}
              >
                Todas
                <span className="opacity-60">{totalItems.toLocaleString()}</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => onCategoryChange(cat.label)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0',
                    selectedCategory === cat.label
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground',
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cat.color)} />
                  {cat.label}
                  <span className="opacity-60">{cat.count.toLocaleString()}</span>
                  {cat.low_stock > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-400">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {cat.low_stock}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{categories.length} categorías</span>
        {selectedCategory && (
          <span className="font-medium text-primary">Filtrado: {selectedCategory}</span>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-between text-sm font-medium',
              selectedCategory && 'border-primary/50 bg-primary/10 hover:bg-primary/15',
            )}
          >
            <span className="truncate">{selectedCategory || 'Selecciona una categoría...'}</span>
            <ChevronDown className={cn('ml-2 h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar categoría..." className="text-sm" />
            <CommandEmpty className="py-6 text-center text-sm">No se encontraron categorías.</CommandEmpty>
            <CommandGroup className="max-h-80 overflow-y-auto">
              <CommandItem onSelect={() => { onCategoryChange(''); setOpen(false); }} className="cursor-pointer">
                <Check className={cn('mr-2 h-4 w-4', selectedCategory === '' ? 'opacity-100' : 'opacity-0')} />
                <span className="font-medium">Todas ({totalItems.toLocaleString()})</span>
              </CommandItem>
              {categories.map((cat) => (
                <CommandItem
                  key={cat.label}
                  onSelect={() => { onCategoryChange(cat.label); setOpen(false); }}
                  className="cursor-pointer"
                >
                  <Check className={cn('mr-2 h-4 w-4', selectedCategory === cat.label ? 'opacity-100' : 'opacity-0')} />
                  <span className={cn('w-2 h-2 rounded-full mr-2 flex-shrink-0', cat.color)} />
                  <span className="flex-1">{cat.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{cat.count}</span>
                  {cat.low_stock > 0 && (
                    <span className="ml-2 flex items-center gap-0.5 text-xs text-amber-400">
                      <AlertTriangle className="w-3 h-3" />{cat.low_stock}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
