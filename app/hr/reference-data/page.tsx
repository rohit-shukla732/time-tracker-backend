'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Briefcase, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ReferenceDataPage() {
  const router = useRouter();

  const referenceCards = [
    {
      title: 'Departments',
      description: 'Manage organizational departments and teams',
      icon: Building2,
      href: '/hr/settings/departments',
      color: 'text-blue-500',
    },
    {
      title: 'Designations',
      description: 'Manage job titles and hierarchy levels',
      icon: Briefcase,
      href: '/hr/settings/designations',
      color: 'text-green-500',
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Reference Data Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage departments, designations, and other reference data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {referenceCards.map((setting) => (
          <Link key={setting.href} href={setting.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <setting.icon className={`h-6 w-6 ${setting.color}`} />
                  {setting.title}
                </CardTitle>
                <CardDescription>{setting.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Manage {setting.title}
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
