import { ManagerLayout } from '@/components/manager/ManagerLayout';

export const metadata = {
  title: 'Manager',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ManagerLayout>
      {children}
    </ManagerLayout>
  );
}
