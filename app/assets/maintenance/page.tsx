'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { AssetsLayout } from '@/components/assets/AssetsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

interface MaintenanceRecord {
  id: string;
  maintenanceType: string;
  description: string;
  scheduledDate: string;
  completedDate?: string;
  cost?: number;
  performedBy?: string;
  status: string;
  notes?: string;
  asset: {
    id: string;
    name: string;
    category: string;
    serialNumber?: string;
  };
}

export default function MaintenancePage() {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchMaintenanceRecords();
  }, [statusFilter, typeFilter]);

  const fetchMaintenanceRecords = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('maintenanceType', typeFilter);

      const data = await authFetch(`/api/assets/maintenance?${params.toString()}`, {}, '/assets/login');
      setMaintenanceRecords(data);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-500';
      case 'IN_PROGRESS':
        return 'bg-yellow-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'CANCELLED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PREVENTIVE':
        return 'bg-green-500';
      case 'CORRECTIVE':
        return 'bg-orange-500';
      case 'INSPECTION':
        return 'bg-blue-500';
      case 'UPGRADE':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <AssetsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
          <Link href="/assets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assets
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Asset Maintenance</h1>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Maintenance
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Maintenance Records</CardTitle>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                  <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                  <SelectItem value="INSPECTION">Inspection</SelectItem>
                  <SelectItem value="UPGRADE">Upgrade</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Completed Date</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{record.asset.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {record.asset.category.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(record.maintenanceType)}>
                      {record.maintenanceType}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {record.description}
                  </TableCell>
                  <TableCell>{formatDate(record.scheduledDate)}</TableCell>
                  <TableCell>
                    {record.completedDate ? formatDate(record.completedDate) : '-'}
                  </TableCell>
                  <TableCell>
                    {record.cost ? `$${record.cost.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>{record.performedBy || '-'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(record.status)}>
                      {record.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </AssetsLayout>
  );
}
