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
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">IT Support Ticketing System</h1>
          <p className="text-muted-foreground text-lg">Choose your portal to continue</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Button 
            className="w-full h-auto py-8" 
            onClick={() => router.push('/ticketing/employee/login')}
            variant="default"
            size="lg"
          >
            <div className="flex flex-col items-center w-full gap-2">
              <span className="text-2xl font-semibold">Employee Portal</span>
              <span className="text-sm opacity-90">Create and track your IT support tickets</span>
            </div>
          </Button>
          
          {/* <Button 
            className="w-full h-auto py-8" 
            onClick={() => router.push('/ticketing/admin/login')}
            variant="outline"
            size="lg"
          >
            <div className="flex flex-col items-center w-full gap-2">
              <span className="text-2xl font-semibold">IT Admin Portal</span>
              <span className="text-sm">Manage and resolve support tickets</span>
            </div>
          </Button> */}
        </div>
      </div>
    </div>
  );
}
