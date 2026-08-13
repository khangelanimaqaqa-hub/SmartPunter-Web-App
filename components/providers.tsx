'use client';

import React from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { DataProvider } from '@/lib/data-context';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        {children}
        <Toaster position="top-center" richColors />
      </DataProvider>
    </AuthProvider>
  );
}
