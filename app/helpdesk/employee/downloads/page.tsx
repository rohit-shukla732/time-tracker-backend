'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
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
      router.push('/helpdesk/employee/login');
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-12">
        {/* Header - Apple Style Large Typography */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
            Software Downloads
          </h1>
          <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
            Essential software approved for company use. Click Download to get the installer.
          </p>
        </div>

        {/* Search + category filters */}
        <div className="space-y-6">
          <div className="relative w-full max-w-xl">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-zinc-400" strokeWidth={2} />
            </div>
            <Input
              placeholder="Search software…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-full pl-12 pr-4 bg-white/60 dark:bg-zinc-900/50 border-black/[0.04] dark:border-white/[0.04] rounded-full text-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-2 focus-visible:ring-primary/20 transition-all placeholder:font-light backdrop-blur-xl"
            />
          </div>

          <div className="overflow-x-auto pb-2 scrollbar-none">
            <div className="inline-flex h-12 p-1.5 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-full w-auto">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-6 py-2 rounded-full text-[14px] font-medium transition-all whitespace-nowrap ${
                  activeCategory === null
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                All
              </button>
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(isActive ? null : cat)}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full text-[14px] font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zinc-900 dark:border-white mb-6"></div>
            <p className="text-[15px] text-zinc-500">Loading catalog...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 dark:text-zinc-400">
            <Package className="h-12 w-12 mb-4 opacity-40" strokeWidth={1.5} />
            <p className="text-[17px] font-light tracking-tight">No software matches your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((software) => {
              const meta = CATEGORY_META[software.category] ?? DEFAULT_META;
              const Icon = meta.icon;
              return (
                <div 
                  key={software.id} 
                  className="group flex flex-col p-6 rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white">
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[13px] font-medium ${meta.badge} bg-opacity-50 dark:bg-opacity-20`}>
                      {software.category}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <h3 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                      {software.name}
                    </h3>
                    <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-light leading-relaxed line-clamp-2">
                      {software.description}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between text-[13px] text-zinc-400 dark:text-zinc-500 font-medium px-1">
                      <span>v{software.version}</span>
                      <span>{software.sizeLabel}</span>
                    </div>
                    <button
                      onClick={() => handleDownload(software)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-medium transition-transform group-active:scale-[0.98] group-hover:shadow-md"
                    >
                      <Download className="h-4 w-4" strokeWidth={2.5} />
                      Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="flex justify-center pt-8 border-t border-black/[0.04] dark:border-white/[0.04] mt-12">
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-light tracking-tight text-center max-w-md">
              Need software that isn't listed here? Raise a ticket under <span className="font-medium text-zinc-700 dark:text-zinc-300">IT Support → Software Request</span>.
            </p>
          </div>
        )}
      </div>
    </TicketsLayout>
  );
}
