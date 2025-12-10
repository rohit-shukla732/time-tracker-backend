import { EmployeeLayout } from '@/components/employee/EmployeeLayout';

export const metadata = {
  title: 'Employee Dashboard',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <EmployeeLayout>
      {children}
    </EmployeeLayout>
  );
}
