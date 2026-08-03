'use client';
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HelpdeskPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);

      // Redirect based on role
      if (parsedUser.role === 'ADMIN') {
        router.replace('/helpdesk/admin/tickets');
      } else {
        router.replace('/helpdesk/employee/dashboard');
      }
    } else {
      router.replace('/helpdesk/employee/login');
    }
  }, [router]);

  return null;
}
