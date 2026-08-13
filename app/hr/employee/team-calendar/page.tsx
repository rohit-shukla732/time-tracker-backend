'use client';

import { HrEmployeeLayout } from '@/components/hr/HrEmployeeLayout';
import TeamCalendarView from '@/components/hr/TeamCalendarView';

export default function TeamCalendarPage() {
  return (
    <HrEmployeeLayout>
      <TeamCalendarView
        loginPath="/hr/employee/login"
        heading="Team Calendar"
        description="Leave requests and daily attendance across your team. Click a day for details."
      />
    </HrEmployeeLayout>
  );
}