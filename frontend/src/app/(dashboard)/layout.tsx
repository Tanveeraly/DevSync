'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell title="DevSync Workspace">
      {children}
    </AppShell>
  );
}
