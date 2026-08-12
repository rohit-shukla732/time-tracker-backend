'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function HrEmployeeLogin() {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('userUpdated'));

      router.push('/hr/employee');
    } catch (err) {
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 selection:bg-zinc-200 dark:selection:bg-zinc-800">
      {/* Left Pane - Branding & Visuals */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] max-w-[700px] bg-zinc-950 dark:bg-zinc-900 p-12 text-zinc-100 selection:bg-white/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/20 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 p-2.5 rounded-[14px] backdrop-blur-md border border-white/10 shadow-sm">
            <CalendarDays className="w-5 h-5 text-zinc-100" strokeWidth={2} />
          </div>
          <span className="font-semibold text-[13px] tracking-[0.15em] uppercase text-zinc-300">
            People Operations
          </span>
        </div>

        <div className="relative z-10">
          <div className="w-30 h-30 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <Image src="/assets/email_dp.jpg" alt="ACE Logo" width={64} height={64} className="h-full w-full object-cover rounded-3xl" />
          </div>
          <h1 className="text-[56px] font-medium tracking-tight leading-[1.05] mb-6 text-white">
            Take a break. <br />
            <span className="text-zinc-500">We've got it covered.</span>
          </h1>
          <p className="text-zinc-400 text-[19px] leading-relaxed max-w-[420px] font-light">
            Plan your time off, track your leave balance and follow every request — all in one place.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[13px] font-medium text-zinc-500">
          <span>© {new Date().getFullYear()} ACE Healthcare Solutions</span>
          <span>Octaract</span>
        </div>
      </div>

      {/* Right Pane - Interaction & Form */}
      <div className="flex-1 flex flex-col justify-center relative bg-white dark:bg-zinc-950 px-6 sm:px-12 lg:px-24 py-12">
        <div className="w-full max-w-[400px] mx-auto space-y-10">
          <div className="space-y-3">
            <h2 className="text-[32px] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-white">
              Welcome back
            </h2>
            <p className="text-[16px] text-zinc-500 dark:text-zinc-400 font-light">
              Sign in with your employee credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-[20px] bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0" strokeWidth={2} />
                <p className="text-[14px] font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2 relative">
                <label htmlFor="email" className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@acehcs.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-[56px] px-5 rounded-[20px] bg-zinc-100/50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-300 dark:focus:border-zinc-700 transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label htmlFor="password" className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-[56px] px-5 rounded-[20px] bg-zinc-100/50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-300 dark:focus:border-zinc-700 transition-all font-mono disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full h-[56px] mt-2 flex items-center justify-center gap-2 rounded-[20px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[16px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && (
                  <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" strokeWidth={2} />
                )}
              </span>
              {loading && <div className="absolute inset-0 bg-white/20 dark:bg-black/10 animate-pulse" />}
            </button>
          </form>

          <div className="text-center pt-8 border-t border-black/[0.04] dark:border-white/[0.04]">
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-light">
              Are you from HR?{' '}
              <Link href="/hr/admin/login" className="font-medium text-zinc-900 dark:text-white hover:underline underline-offset-4">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
