'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ThemeProviderProps } from 'next-themes/dist/types';
import { SidebarProvider } from '@/lib/hooks/use-sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NextUIProvider } from '@nextui-org/react';

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <NextUIProvider>
      <NextThemesProvider {...props}>
        <SidebarProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </SidebarProvider>
      </NextThemesProvider>
    </NextUIProvider>
  );
}
