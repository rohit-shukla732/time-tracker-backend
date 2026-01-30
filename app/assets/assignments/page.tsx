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
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Assignment {
  id: string;
  assignedDate: string;
  returnedDate?: string;
  expectedReturnDate?: string;
  status: string;
  condition?: string;
  notes?: string;
  asset: {
    id: string;
    name: string;
    category: string;
    serialNumber?: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  assignedByUser: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAssignments();
  }, [statusFilter]);

  const fetchAssignments = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const data = await authFetch(`/api/assets/assignments?${params.toString()}`, {}, '/assets/login');
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
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
      case 'ACTIVE':
        return 'bg-green-500';
      case 'RETURNED':
        return 'bg-blue-500';
      case 'OVERDUE':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <AssetsLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/assets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Asset Assignments</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Assignments</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Condition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">{assignment.asset.name}</TableCell>
                  <TableCell>
                    {assignment.asset.category.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell>{assignment.asset.serialNumber || '-'}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{assignment.user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {assignment.user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{assignment.assignedByUser.name}</div>
                  </TableCell>
                  <TableCell>{formatDate(assignment.assignedDate)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(assignment.status)}>
                      {assignment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {assignment.condition ? (
                      <Badge variant="outline">{assignment.condition}</Badge>
                    ) : (
                      '-'
                    )}
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
