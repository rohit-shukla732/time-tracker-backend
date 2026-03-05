'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Download,
  Search,
  Globe,
  FileText,
  Video,
  Wrench,
  MessageSquare,
  Package,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Software {
  id: string;
  name: string;
  description: string;
  category: string;
  filename: string;
  version: string;
  sizeLabel: string;
}

const CATEGORY_META: Record<string, { icon: React.ElementType; badge: string }> = {
  Browser:       { icon: Globe,         badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  Productivity:  { icon: FileText,      badge: 'bg-green-100 text-green-700 border-green-200' },
  Utilities:     { icon: Wrench,        badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  Media:         { icon: Video,         badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  Communication: { icon: MessageSquare, badge: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
};

const DEFAULT_META = { icon: Package, badge: 'bg-gray-100 text-gray-600 border-gray-200' };

export default function DownloadsPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/ticketing/employee/login');
      return;
    }

    fetch('/api/downloads/catalog')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setCatalog(data))
      .catch((err) => {
        console.error('Catalog load error:', err);
        toast.error('Failed to load software catalog');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const categories = Array.from(new Set(catalog.map((s) => s.category)));

  const filtered = catalog.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    const matchesCategory = activeCategory ? s.category === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleDownload = (software: Software) => {
    const a = document.createElement('a');
    a.href = `/api/downloads/file?name=${encodeURIComponent(software.filename)}`;
    a.download = software.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${software.name}…`);
  };

  return (
    <TicketsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" />
            Software Downloads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Essential software approved for company use. Click Download to get the installer.
          </p>
        </div>

        {/* Search + category filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search software…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                activeCategory === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const meta = CATEGORY_META[cat] ?? DEFAULT_META;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(isActive ? null : cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    isActive
                      ? meta.badge
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  <meta.icon className="h-3.5 w-3.5" />
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No software matches your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((software) => {
              const meta = CATEGORY_META[software.category] ?? DEFAULT_META;
              const Icon = meta.icon;
              return (
                <Card key={software.id} className="flex flex-col hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <Badge variant="outline" className={`text-xs ${meta.badge}`}>
                        {software.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{software.name}</CardTitle>
                    <CardDescription className="text-xs leading-snug">
                      {software.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="mt-auto pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>v{software.version}</span>
                      <span>{software.sizeLabel}</span>
                    </div>
                    <Button
                      className="w-full h-8 text-xs"
                      onClick={() => handleDownload(software)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Need software that&apos;s not listed? Raise a ticket under IT Support → Software Request.
          </p>
        )}
      </div>
    </TicketsLayout>
  );
}
