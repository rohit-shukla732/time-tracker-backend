'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { AssetsLayout } from '@/components/assets/AssetsLayout';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Laptop,
  Keyboard,
  Mouse,
  Headphones,
  Monitor,
  Router,
  Shield,
  Wifi,
  Fingerprint,
  Phone,
  Video,
  Globe,
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

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
  _count?: {
    maintenanceRecords: number;
  };
}

interface AssetStats {
  overview: {
    totalAssets: number;
    availableAssets: number;
    assignedAssets: number;
    inMaintenanceAssets: number;
    damagedAssets: number;
    userSideAssets: number;
    itInfrastructureAssets: number;
    activeAssignments: number;
    pendingMaintenance: number;
  };
  assetsByCategory: Array<{ category: string; count: number }>;
  recentAssignments: any[];
  upcomingMaintenance: any[];
}

const categoryIcons: Record<string, any> = {
  LAPTOP: Laptop,
  KEYBOARD: Keyboard,
  MOUSE: Mouse,
  HEADSET: Headphones,
  MONITOR: Monitor,
  SWITCH: Router,
  FIREWALL: Shield,
  ACCESS_POINT: Wifi,
  BIOMETRIC: Fingerprint,
  TELEPHONE_MATRIX: Phone,
  TELEPHONE_HANDSET: Phone,
  CCTV_CAMERA: Video,
  NVR: Video,
  INTERNET_LINE: Globe,
};

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-500',
  ASSIGNED: 'bg-blue-500',
  IN_MAINTENANCE: 'bg-yellow-500',
  RETIRED: 'bg-gray-500',
  DAMAGED: 'bg-red-500',
  LOST: 'bg-red-700',
};

export default function AssetManagementPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAssets();
    fetchStats();
  }, [assetTypeFilter, statusFilter, searchTerm]);

  const fetchAssets = async () => {
    try {
      const params = new URLSearchParams();
      if (assetTypeFilter !== 'all') params.append('assetType', assetTypeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const data = await authFetch(`/api/assets?${params.toString()}`, {}, '/assets/login');
      setAssets(data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await authFetch('/api/assets/stats', {}, '/assets/login');
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    const Icon = categoryIcons[category] || Laptop;
    return <Icon className="h-6 w-6" />;
  };

  const formatCategoryName = (category: string) => {
    return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <AssetsLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Asset Management</h1>
          <div className="flex gap-2">
            <Link href="/assets/new?type=user">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User Asset
              </Button>
            </Link>
            <Link href="/assets/new?type=it">
              <Button variant="secondary">
                <Plus className="h-4 w-4 mr-2" />
                Add IT Infrastructure
              </Button>
            </Link>
          </div>
        </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalAssets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.overview.availableAssets}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.overview.assignedAssets}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.overview.inMaintenanceAssets}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, serial number, model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="USER_SIDE">User Side</SelectItem>
                <SelectItem value="IT_INFRASTRUCTURE">IT Infrastructure</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_MAINTENANCE">In Maintenance</SelectItem>
                <SelectItem value="DAMAGED">Damaged</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Asset List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Assets</TabsTrigger>
          <TabsTrigger value="user-side">User Side</TabsTrigger>
          <TabsTrigger value="it-infrastructure">IT Infrastructure</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                <Link href={`/assets/${asset.id}`}>
                  <CardHeader className="cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{asset.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {formatCategoryName(asset.category)}
                          </p>
                        </div>
                      </div>
                      <Badge className={statusColors[asset.status]}>
                        {asset.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                </Link>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {asset.serialNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Serial:</span>
                        <span className="font-medium">{asset.serialNumber}</span>
                      </div>
                    )}
                    {asset.model && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium">{asset.model}</span>
                      </div>
                    )}
                    {asset.location && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{asset.location}</span>
                      </div>
                    )}
                    {asset.assignments && asset.assignments.length > 0 && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">Assigned to:</span>
                        <p className="font-medium">{asset.assignments[0].user.name}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link href={`/assets/${asset.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    {asset.status === 'AVAILABLE' && (
                      <Button size="sm" className="flex-1">
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    )}
                    {asset.status === 'ASSIGNED' && (
                      <Link href={`/assets/${asset.id}`} className="flex-1">
                        <Button size="sm" variant="secondary" className="w-full">
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          Return
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="user-side">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets
              .filter((asset) => asset.assetType === 'USER_SIDE')
              .map((asset) => (
                <Card key={asset.id}>
                  <CardHeader>
                    <CardTitle>{asset.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {formatCategoryName(asset.category)}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="it-infrastructure">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets
              .filter((asset) => asset.assetType === 'IT_INFRASTRUCTURE')
              .map((asset) => (
                <Card key={asset.id}>
                  <CardHeader>
                    <CardTitle>{asset.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {formatCategoryName(asset.category)}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AssetsLayout>
  );
}
