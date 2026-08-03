"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HRLayout as HRNavLayout } from "@/components/hr/HRLayout";

export default function HRRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip authentication check for login page
    if (pathname === "/hr/login") {
      setIsLoading(false);
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    const userRole = localStorage.getItem("userRole");

    // Check if user is logged in and has appropriate role
    if (!accessToken || !userRole) {
      router.push("/hr/login");
      return;
    }

    // Verify role is HR, ADMIN, or MANAGER
    if (userRole !== "HR" && userRole !== "ADMIN" && userRole !== "MANAGER") {
      router.push("/hr/login");
      return;
    }

    setIsLoading(false);
  }, [pathname, router]);

  // Show loading or just children for login page
  if (isLoading || pathname === "/hr/login") {
    return <>{children}</>;
  }

  return <HRNavLayout>{children}</HRNavLayout>;
}
