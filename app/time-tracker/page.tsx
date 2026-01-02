'use client';
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
        router.push('/time-tracker/admin');
      } else if (parsedUser.role === 'MANAGER') {
        router.push('/time-tracker/manager');
        } else {
        router.push('/time-tracker/employee');
      }
    }
  }, [router]);

  return(
    router.push('/time-tracker/employee')
  );
}
