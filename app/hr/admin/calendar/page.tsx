'use client';

import { HrAdminLayout } from '@/components/hr/HrAdminLayout';
import TeamCalendarView from '@/components/hr/TeamCalendarView';

export default function HrCalendarPage() {
  return (
    <HrAdminLayout>
      <TeamCalendarView
        loginPath="/hr/admin/login"
        heading="Company Calendar"
        description="Leave requests and daily attendance for every employee. Click a day for details."
      />
    </HrAdminLayout>
  );
}