'use client';

import { usePathname } from 'next/navigation';
import { EmployeeLayout } from '@/components/employee/EmployeeLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't wrap login page with layout
  if (pathname?.includes('/login')) {
    return <>{children}</>;
  }
  
  return (
    <EmployeeLayout>
      {children}
    </EmployeeLayout>
  );
}
