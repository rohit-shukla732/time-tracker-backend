'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TicketingPage() {
  const router = useRouter();

  useEffect(() => {
    // Create default admin user for testing
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      const defaultAdmin = {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN'
      };
      localStorage.setItem('user', JSON.stringify(defaultAdmin));
    }
  }, []);

  const setAdminUser = () => {
    const adminUser = {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN'
    };
    localStorage.setItem('user', JSON.stringify(adminUser));
    router.push('/ticketing/admin');
  };

  const setEmployeeUser = () => {
    const employeeUser = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'EMPLOYEE'
    };
    localStorage.setItem('user', JSON.stringify(employeeUser));
    router.push('/ticketing/employee/dashboard');
  };

  return(
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">IT Support System</h1>
      <p className="text-muted-foreground mb-6">Submit and track your IT support requests</p>
      
      <div className="space-y-4">
        <Button 
          className="w-full h-auto py-6" 
          onClick={setEmployeeUser}
          variant="default"
        >
          <div className="flex flex-col items-start w-full">
            <span className="text-lg font-semibold">Employee Dashboard</span>
            <span className="text-sm opacity-90">Create and manage your IT support tickets</span>
          </div>
        </Button>
        
        <Button 
          className="w-full h-auto py-6" 
          onClick={setAdminUser}
          variant="outline"
        >
          <div className="flex flex-col items-start w-full">
            <span className="text-lg font-semibold">IT Admin Dashboard</span>
            <span className="text-sm">Manage all IT support tickets</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
