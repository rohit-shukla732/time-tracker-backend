"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ticket, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function HelpdeskEmployeeLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Store tokens and user info
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Dispatch custom event to update UI immediately
      window.dispatchEvent(new Event('userUpdated'));

      // Redirect to helpdesk dashboard
      router.push('/helpdesk/employee/dashboard');
    } catch (err) {
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-zinc-950">
      {/* Left Pane - Editorial & Branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] max-w-[700px] bg-zinc-950 dark:bg-zinc-900 p-12 text-zinc-100 selection:bg-white/30 relative overflow-hidden">
        {/* Subtle mesh/glow effect in the background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 p-2.5 rounded-[14px] backdrop-blur-md border border-white/10 shadow-sm">
            <Ticket className="w-5 h-5 text-zinc-100" strokeWidth={2} />
          </div>
          <span className="font-semibold text-[13px] tracking-[0.15em] uppercase text-zinc-300">
            Internal Operations
          </span>
        </div>

        <div className="relative z-10">
          <div className="w-30 h-30 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                      <Image src="/assets/email_dp.jpg" alt="ACE Logo" width={64} height={64} className="h-full w-full object-cover rounded-3xl" />
                    </div>
          <h1 className="text-[56px] font-medium tracking-tight leading-[1.05] mb-6 text-white">
            Resolve issues. <br />
            <span className="text-zinc-500">Restore flow.</span>
          </h1>
          <p className="text-zinc-400 text-[19px] leading-relaxed max-w-[420px] font-light">
            Access the helpdesk ecosystem to report, track, and manage your IT support requests seamlessly.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[13px] font-medium text-zinc-500">
          <span>© {new Date().getFullYear()} ACE Healthcare Solutions</span>
          <span>Octaract</span>
        </div>
      </div>

      {/* Right Pane - Minimalist Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-zinc-50 dark:bg-black">
        <div className="w-full max-w-[380px] space-y-10">
          
          <div className="space-y-3">
            <div className="lg:hidden flex justify-center mb-8">
              <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
                <Ticket className="w-6 h-6 text-primary" strokeWidth={2} />
              </div>
            </div>
            <h2 className="text-4xl font-semibold tracking-[-0.04em] text-zinc-900 dark:text-zinc-100 text-center lg:text-left">
              Welcome
            </h2>
            <p className="text-[17px] text-zinc-500 dark:text-zinc-400 font-medium text-center lg:text-left">
              Sign in to your employee account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[15px] font-medium flex items-center gap-3 border border-red-100 dark:border-red-500/20">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400 ml-1">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-14 px-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl text-[17px] shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 transition-all placeholder:text-zinc-400"
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400">
                    Password
                  </Label>
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-[14px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-14 px-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl text-[17px] shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 transition-all placeholder:text-zinc-400 tracking-widest"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl text-[17px] font-semibold tracking-wide bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all duration-200 mt-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin opacity-70" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}



