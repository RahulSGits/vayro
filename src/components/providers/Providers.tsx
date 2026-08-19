'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { initAnalytics, track } from '@/lib/analytics';

function PageViews() {
  const pathname = usePathname();
  useEffect(() => {
    initAnalytics();
    track('page_view', { path: pathname, title: document.title });
  }, [pathname]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageViews />
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}
