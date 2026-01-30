"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateAuth } from '@/lib/authFetch';
import ManagerDashboard from '@/components/manager/ManagerDashboard';

export default function ManagerPage() {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const user = validateAuth('MANAGER', '/time-tracker/manager/login');
    if (!user) {
      // validateAuth handles the redirect
      setIsValidating(false);
      return;
    }
    setIsAuthenticated(true);
    setIsValidating(false);
  }, [router]);

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via validateAuth
  }

  return <ManagerDashboard />;
}
