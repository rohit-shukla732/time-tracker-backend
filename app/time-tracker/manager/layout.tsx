'use client';

import { usePathname } from 'next/navigation';
import { ManagerLayout } from '@/components/manager/ManagerLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't wrap login page with layout
  if (pathname?.includes('/login')) {
    return <>{children}</>;
  }
  
  return (
    <ManagerLayout>
      {children}
    </ManagerLayout>
  );
}
