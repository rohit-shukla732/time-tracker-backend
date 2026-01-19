"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings, 
  LogOut 
} from "lucide-react";

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip authentication check for login page
    if (pathname === "/hr/login") {
      setIsLoading(false);
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    const userRole = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");

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

    setUserName(name || "");
    setIsLoading(false);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    router.push("/");
  };

  const navItems = [
    {
      href: "/hr",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/hr/employees",
      label: "Employees",
      icon: Users,
    },
    {
      href: "/hr/leaves",
      label: "Leave Requests",
      icon: Calendar,
    },
    {
      href: "/hr/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  // Show loading or login page without sidebar
  if (isLoading || pathname === "/hr/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r">
        <div className="p-6">
          <h2 className="text-2xl font-bold">HR Portal</h2>
          {userName && (
            <p className="text-sm text-muted-foreground mt-1">{userName}</p>
          )}
        </div>
        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  );
}
