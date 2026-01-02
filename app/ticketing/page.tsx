'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TicketingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // Redirect based on role
      if (parsedUser.role === 'ADMIN') {
        router.push('/ticketing/admin/tickets');
      } else {
        router.push('/ticketing/employee/dashboard');
      }
    }
  }, [router]);

  return(
    router.push('ticketing/employee')
  );
}
