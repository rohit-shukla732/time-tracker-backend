"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ManagerDashboard from '@/components/manager/ManagerDashboard';

export default function ManagerPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/manager/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
        router.push('/manager/login');
      }
    } catch (e) {
      console.error('Failed to parse user:', e);
      router.push('/manager/login');
    }
  }, [router]);

  return <ManagerDashboard />;
}
