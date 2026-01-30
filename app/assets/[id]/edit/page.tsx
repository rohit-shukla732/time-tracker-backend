'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AssetsLayout } from '@/components/assets/AssetsLayout';
import { authFetch } from '@/lib/authFetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    assetType: '',
    category: '',
    name: '',
    description: '',
    serialNumber: '',
    model: '',
    manufacturer: '',
    purchaseDate: '',
    warrantyExpiry: '',
    purchaseCost: '',
    currentValue: '',
    status: '',
    location: '',
    notes: '',
  });

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

  useEffect(() => {
    fetchAsset();
  }, [assetId]);

  const fetchAsset = async () => {
    try {
      const data = await authFetch(`/api/assets/${assetId}`, {}, '/assets/login');
      setFormData({
        assetType: data.assetType || '',
        category: data.category || '',
        name: data.name || '',
        description: data.description || '',
        serialNumber: data.serialNumber || '',
        model: data.model || '',
        manufacturer: data.manufacturer || '',
        purchaseDate: data.purchaseDate ? data.purchaseDate.split('T')[0] : '',
        warrantyExpiry: data.warrantyExpiry ? data.warrantyExpiry.split('T')[0] : '',
        purchaseCost: data.purchaseCost?.toString() || '',
        currentValue: data.currentValue?.toString() || '',
        status: data.status || '',
        location: data.location || '',
        notes: data.notes || '',
      });
    } catch (error: any) {
      toast.error('Failed to load asset');
      router.push('/assets');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        assetType: formData.assetType,
        category: formData.category,
        name: formData.name,
        status: formData.status,
      };

      if (formData.description) payload.description = formData.description;
      if (formData.serialNumber) payload.serialNumber = formData.serialNumber;
      if (formData.model) payload.model = formData.model;
      if (formData.manufacturer) payload.manufacturer = formData.manufacturer;
      if (formData.purchaseDate) payload.purchaseDate = formData.purchaseDate;
      if (formData.warrantyExpiry) payload.warrantyExpiry = formData.warrantyExpiry;
      if (formData.purchaseCost) payload.purchaseCost = parseFloat(formData.purchaseCost);
      if (formData.currentValue) payload.currentValue = parseFloat(formData.currentValue);
      if (formData.location) payload.location = formData.location;
      if (formData.notes) payload.notes = formData.notes;

      await authFetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, '/assets/login');

      toast.success('Asset updated successfully');
      router.push('/assets');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update asset');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <AssetsLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AssetsLayout>
    );
  }

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
          <h1 className="text-3xl font-bold">Edit Asset</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
            <CardDescription>Update the asset information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Asset Type */}
                <div className="space-y-2">
                  <Label htmlFor="assetType">Asset Type *</Label>
                  <Select
                    value={formData.assetType}
                    onValueChange={(value) => {
                      setFormData({ ...formData, assetType: value, category: '' });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER_SIDE">User Side</SelectItem>
                      <SelectItem value="IT_INFRASTRUCTURE">IT Infrastructure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                    required
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="ASSIGNED">Assigned</SelectItem>
                      <SelectItem value="IN_MAINTENANCE">In Maintenance</SelectItem>
                      <SelectItem value="RETIRED">Retired</SelectItem>
                      <SelectItem value="DAMAGED">Damaged</SelectItem>
                      <SelectItem value="LOST">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Serial Number */}
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>

                {/* Manufacturer */}
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>

                {/* Purchase Date */}
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>

                {/* Warranty Expiry */}
                <div className="space-y-2">
                  <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                  <Input
                    id="warrantyExpiry"
                    type="date"
                    value={formData.warrantyExpiry}
                    onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                  />
                </div>

                {/* Purchase Cost */}
                <div className="space-y-2">
                  <Label htmlFor="purchaseCost">Purchase Cost</Label>
                  <Input
                    id="purchaseCost"
                    type="number"
                    step="0.01"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                  />
                </div>

                {/* Current Value */}
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Current Value</Label>
                  <Input
                    id="currentValue"
                    type="number"
                    step="0.01"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Updating...' : 'Update Asset'}
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
