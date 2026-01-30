'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AssetsLayout } from '@/components/assets/AssetsLayout';
import { authFetch } from '@/lib/authFetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  UserPlus, 
  Wrench,
  Package,
  Calendar,
  DollarSign,
  MapPin,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface Asset {
  id: string;
  assetType: string;
  category: string;
  name: string;
  description?: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  purchaseCost?: number;
  currentValue?: number;
  status: string;
  location?: string;
  notes?: string;
  assignments?: any[];
  maintenanceRecords?: any[];
}

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Assignment form
  const [assignForm, setAssignForm] = useState({
    userId: '',
    expectedReturnDate: '',
    condition: 'GOOD',
    notes: '',
  });

  // Maintenance form
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceType: 'PREVENTIVE',
    description: '',
    scheduledDate: '',
    cost: '',
    performedBy: '',
    notes: '',
  });

  useEffect(() => {
    fetchAsset();
    fetchUsers();
  }, [assetId]);

  const fetchAsset = async () => {
    try {
      const data = await authFetch(`/api/assets/${assetId}`, {}, '/assets/login');
      setAsset(data);
    } catch (error) {
      toast.error('Failed to load asset');
      router.push('/assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await authFetch('/api/users', {}, '/assets/login');
      // Handle different response formats - could be array or object with users property
      const usersList = Array.isArray(data) ? data : (data?.users || []);
      setUsers(usersList);
    } catch (error) {
      console.error('Failed to load users');
      setUsers([]); // Set empty array on error
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await authFetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
      }, '/assets/login');
      toast.success('Asset deleted successfully');
      router.push('/assets');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete asset');
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleAssign = async () => {
    try {
      await authFetch(`/api/assets/${assetId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm),
      }, '/assets/login');
      toast.success('Asset assigned successfully');
      setAssignDialogOpen(false);
      fetchAsset();
      setAssignForm({ userId: '', expectedReturnDate: '', condition: 'GOOD', notes: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign asset');
    }
  };

  const handleReturn = async () => {
    try {
      await authFetch(`/api/assets/${assetId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: 'GOOD', notes: '' }),
      }, '/assets/login');
      toast.success('Asset returned successfully');
      fetchAsset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to return asset');
    }
  };

  const handleScheduleMaintenance = async () => {
    try {
      const payload = {
        assetId,
        ...maintenanceForm,
        cost: maintenanceForm.cost ? parseFloat(maintenanceForm.cost) : undefined,
      };
      await authFetch('/api/assets/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, '/assets/login');
      toast.success('Maintenance scheduled successfully');
      setMaintenanceDialogOpen(false);
      fetchAsset();
      setMaintenanceForm({
        maintenanceType: 'PREVENTIVE',
        description: '',
        scheduledDate: '',
        cost: '',
        performedBy: '',
        notes: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule maintenance');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return `$${amount.toFixed(2)}`;
  };

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-500',
    ASSIGNED: 'bg-blue-500',
    IN_MAINTENANCE: 'bg-yellow-500',
    RETIRED: 'bg-gray-500',
    DAMAGED: 'bg-red-500',
    LOST: 'bg-red-700',
  };

  if (loading) {
    return (
      <AssetsLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AssetsLayout>
    );
  }

  if (!asset) return null;

  return (
    <AssetsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/assets">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{asset.name}</h1>
              <p className="text-muted-foreground">
                {asset.category.replace(/_/g, ' ')} • {asset.serialNumber || 'No Serial'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/assets/${assetId}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            {asset.status === 'AVAILABLE' && (
              <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign
              </Button>
            )}
            {asset.status === 'ASSIGNED' && (
              <Button size="sm" variant="secondary" onClick={handleReturn}>
                Return Asset
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setMaintenanceDialogOpen(true)}>
              <Wrench className="h-4 w-4 mr-2" />
              Maintenance
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={statusColors[asset.status]}>
                {asset.status.replace(/_/g, ' ')}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Purchase Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{formatDate(asset.purchaseDate)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Current Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{formatCurrency(asset.currentValue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{asset.location || '-'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="assignments">
              Assignments ({asset.assignments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              Maintenance ({asset.maintenanceRecords?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Asset Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Asset Type</Label>
                    <p className="font-medium">{asset.assetType.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="font-medium">{asset.category.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Model</Label>
                    <p className="font-medium">{asset.model || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Manufacturer</Label>
                    <p className="font-medium">{asset.manufacturer || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Serial Number</Label>
                    <p className="font-medium">{asset.serialNumber || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Warranty Expiry</Label>
                    <p className="font-medium">{formatDate(asset.warrantyExpiry)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Purchase Cost</Label>
                    <p className="font-medium">{formatCurrency(asset.purchaseCost)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Value</Label>
                    <p className="font-medium">{formatCurrency(asset.currentValue)}</p>
                  </div>
                </div>
                {asset.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="font-medium">{asset.description}</p>
                  </div>
                )}
                {asset.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="font-medium">{asset.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <CardTitle>Assignment History</CardTitle>
              </CardHeader>
              <CardContent>
                {asset.assignments && asset.assignments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Assigned By</TableHead>
                        <TableHead>Assigned Date</TableHead>
                        <TableHead>Returned Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {asset.assignments.map((assignment: any) => (
                        <TableRow key={assignment.id}>
                          <TableCell>{assignment.user.name}</TableCell>
                          <TableCell>{assignment.assignedByUser.name}</TableCell>
                          <TableCell>{formatDate(assignment.assignedDate)}</TableCell>
                          <TableCell>{formatDate(assignment.returnedDate)}</TableCell>
                          <TableCell>
                            <Badge variant={assignment.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {assignment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No assignment history
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance History</CardTitle>
              </CardHeader>
              <CardContent>
                {asset.maintenanceRecords && asset.maintenanceRecords.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {asset.maintenanceRecords.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.maintenanceType}</TableCell>
                          <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                          <TableCell>{formatDate(record.scheduledDate)}</TableCell>
                          <TableCell>{formatDate(record.completedDate)}</TableCell>
                          <TableCell>{formatCurrency(record.cost)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No maintenance history
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this asset? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
            <DialogDescription>Assign this asset to a user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User *</Label>
              <Select
                value={assignForm.userId}
                onValueChange={(value) => setAssignForm({ ...assignForm, userId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No users available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected Return Date</Label>
              <Input
                type="date"
                value={assignForm.expectedReturnDate}
                onChange={(e) => setAssignForm({ ...assignForm, expectedReturnDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={assignForm.condition}
                onValueChange={(value) => setAssignForm({ ...assignForm, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXCELLENT">Excellent</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="FAIR">Fair</SelectItem>
                  <SelectItem value="POOR">Poor</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!assignForm.userId}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>Schedule maintenance for this asset</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={maintenanceForm.maintenanceType}
                  onValueChange={(value) => setMaintenanceForm({ ...maintenanceForm, maintenanceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                    <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                    <SelectItem value="INSPECTION">Inspection</SelectItem>
                    <SelectItem value="UPGRADE">Upgrade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scheduled Date *</Label>
                <Input
                  type="date"
                  value={maintenanceForm.scheduledDate}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, scheduledDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={maintenanceForm.cost}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Performed By</Label>
                <Input
                  value={maintenanceForm.performedBy}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedBy: e.target.value })}
                  placeholder="Technician name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={maintenanceForm.description}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={maintenanceForm.notes}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleScheduleMaintenance}
              disabled={!maintenanceForm.description || !maintenanceForm.scheduledDate}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AssetsLayout>
  );
}
