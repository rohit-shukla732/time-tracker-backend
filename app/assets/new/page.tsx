'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssetsLayout } from '@/components/assets/AssetsLayout';
import { authFetch } from '@/lib/authFetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
}

function NewAssetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetTypeParam = searchParams.get('type'); // 'user' or 'it'
  
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    assetType: assetTypeParam === 'it' ? 'IT_INFRASTRUCTURE' : 'USER_SIDE',
    category: '',
    name: '',
    description: '',
    serialNumber: '',
    model: '',
    manufacturer: '',
    location: '',
    notes: '',
    // Laptop peripherals
    monitorName: '',
    monitorCount: '1',
    keyboardName: '',
    mouseName: '',
    headphoneName: '',
    // Assignment
    assignToUserId: '',
  });

  useEffect(() => {
    if (formData.assetType === 'USER_SIDE') {
      fetchUsers();
    }
  }, [formData.assetType]);

  const fetchUsers = async () => {
    try {
      const data = await authFetch('/api/users', {}, '/assets/login');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const userSideCategories = [
    { value: 'LAPTOP', label: 'Laptop' },
    { value: 'KEYBOARD', label: 'Keyboard' },
    { value: 'MOUSE', label: 'Mouse' },
    { value: 'HEADSET', label: 'Headset' },
    { value: 'MONITOR', label: 'Monitor' },
  ];

  const itInfraCategories = [
    { value: 'SWITCH', label: 'Switch' },
    { value: 'FIREWALL', label: 'Firewall' },
    { value: 'ACCESS_POINT', label: 'Access Point' },
    { value: 'BIOMETRIC', label: 'Biometric Device' },
    { value: 'TELEPHONE_MATRIX', label: 'Telephone Matrix' },
    { value: 'TELEPHONE_HANDSET', label: 'Telephone Handset' },
    { value: 'CCTV_CAMERA', label: 'CCTV Camera' },
    { value: 'NVR', label: 'NVR' },
    { value: 'INTERNET_LINE', label: 'Internet Line' },
  ];

  const categories = formData.assetType === 'USER_SIDE' ? userSideCategories : 
                     formData.assetType === 'IT_INFRASTRUCTURE' ? itInfraCategories : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        assetType: formData.assetType,
        category: formData.category,
        name: formData.name,
      };

      if (formData.description) payload.description = formData.description;
      if (formData.serialNumber) payload.serialNumber = formData.serialNumber;
      if (formData.model) payload.model = formData.model;
      if (formData.manufacturer) payload.manufacturer = formData.manufacturer;
      if (formData.location) payload.location = formData.location;
      if (formData.notes) payload.notes = formData.notes;

      // Laptop peripherals
      if (formData.category === 'LAPTOP') {
        if (formData.monitorName) payload.monitorName = formData.monitorName;
        if (formData.monitorCount) payload.monitorCount = parseInt(formData.monitorCount);
        if (formData.keyboardName) payload.keyboardName = formData.keyboardName;
        if (formData.mouseName) payload.mouseName = formData.mouseName;
        if (formData.headphoneName) payload.headphoneName = formData.headphoneName;
      }

      // Assignment
      if (formData.assignToUserId) payload.assignToUserId = formData.assignToUserId;

      await authFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, '/assets/login');

      toast.success('Asset created successfully');
      router.push('/assets');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AssetsLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/assets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            Add New {formData.assetType === 'IT_INFRASTRUCTURE' ? 'IT Infrastructure' : 'User Side'} Asset
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
            <CardDescription>Enter the information for the new asset</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Asset Type (Hidden, set via URL) */}
                <input type="hidden" value={formData.assetType} />

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Asset Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Dell Latitude 5420"
                    required
                  />
                </div>

                {/* Serial Number */}
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="e.g., SN123456789"
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., Latitude 5420"
                  />
                </div>

                {/* Manufacturer */}
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g., Dell"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Office Floor 2"
                  />
                </div>
              </div>

              {/* Laptop Peripherals Section */}
              {formData.category === 'LAPTOP' && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <h3 className="text-lg font-semibold">Peripherals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Monitor */}
                    <div className="space-y-2">
                      <Label htmlFor="monitorName">Monitor Name</Label>
                      <Input
                        id="monitorName"
                        value={formData.monitorName}
                        onChange={(e) => setFormData({ ...formData, monitorName: e.target.value })}
                        placeholder="e.g., Dell P2419H"
                      />
                    </div>

                    {/* Number of Monitors */}
                    <div className="space-y-2">
                      <Label htmlFor="monitorCount">Number of Monitors</Label>
                      <Input
                        id="monitorCount"
                        type="number"
                        min="0"
                        max="10"
                        value={formData.monitorCount}
                        onChange={(e) => setFormData({ ...formData, monitorCount: e.target.value })}
                        placeholder="1"
                      />
                    </div>

                    {/* Keyboard */}
                    <div className="space-y-2">
                      <Label htmlFor="keyboardName">Keyboard Name</Label>
                      <Input
                        id="keyboardName"
                        value={formData.keyboardName}
                        onChange={(e) => setFormData({ ...formData, keyboardName: e.target.value })}
                        placeholder="e.g., Logitech K380"
                      />
                    </div>

                    {/* Mouse */}
                    <div className="space-y-2">
                      <Label htmlFor="mouseName">Mouse Name</Label>
                      <Input
                        id="mouseName"
                        value={formData.mouseName}
                        onChange={(e) => setFormData({ ...formData, mouseName: e.target.value })}
                        placeholder="e.g., Logitech M185"
                      />
                    </div>

                    {/* Headphone */}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="headphoneName">Headphone Name</Label>
                      <Input
                        id="headphoneName"
                        value={formData.headphoneName}
                        onChange={(e) => setFormData({ ...formData, headphoneName: e.target.value })}
                        placeholder="e.g., Sony WH-1000XM4"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Assign to User Section (User Side only) */}
              {formData.assetType === 'USER_SIDE' && (
                <div className="space-y-2">
                  <Label htmlFor="assignToUserId">Assign to User (Optional)</Label>
                  <Select
                    value={formData.assignToUserId || undefined}
                    onValueChange={(value) => setFormData({ ...formData, assignToUserId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user to assign (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(users) && users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about the asset"
                  rows={3}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal notes"
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Creating...' : 'Create Asset'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/assets')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AssetsLayout>
  );
}

export default function NewAssetPage() {
  return (
    <Suspense fallback={
      <AssetsLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AssetsLayout>
    }>
      <NewAssetForm />
    </Suspense>
  );
}
