"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validateAuth } from '@/lib/authFetch';
import ManagerDashboard from '@/components/manager/ManagerDashboard';

export default function ManagerPage() {
  const router = useRouter();

  useEffect(() => {
    const user = validateAuth('MANAGER', '/time-tracker/manager/login');
    if (!user) {
      // validateAuth handles the redirect
      return;
    }
  }, [router]);

  return <ManagerDashboard />;
}
