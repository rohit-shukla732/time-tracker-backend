"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validateAuth } from '@/lib/authFetch';
import EmployeeDashboard from '@/components/employee/EmployeeDashboard';

export default function EmployeePage() {
  const router = useRouter();

  useEffect(() => {
    const user = validateAuth('EMPLOYEE', '/employee/login');
    if (!user) {
      // validateAuth handles the redirect
      return;
    }
  }, [router]);

  return <EmployeeDashboard />;
}
