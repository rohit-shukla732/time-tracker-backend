"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, Ticket } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const SSO_ERRORS: Record<string, string> = {
  access_denied: 'Sign-in was cancelled or denied.',
  no_account: 'No ACE Healthcare account is linked to this Microsoft login. Please contact your administrator.',
  account_disabled: 'Your account is disabled. Please contact your administrator.',
  not_admin: 'Access denied. Admin privileges required for this portal.',
  session_expired: 'Your sign-in session expired. Please try again.',
  sso_error: 'Sign-in failed. Please try again.',
};

function HelpdeskAdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(SSO_ERRORS[searchParams.get('error') || ''] || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      router.replace('/helpdesk/admin');
    }
  }, [router]);

  const handleSso = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/sso/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ portal: 'admin' }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        setError(data.error || 'Failed to start sign in');
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 selection:bg-zinc-200 dark:selection:bg-zinc-800">
      {/* Left Pane - Branding & Visuals */}
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
            Oversee the helpdesk ecosystem to track and manage your IT support requests seamlessly.
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
              Sign in with your ACE admin account to continue.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-[20px] bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 shrink-0" strokeWidth={2} />
              <p className="text-[14px] font-medium">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSso}
            disabled={loading}
            className="group relative w-full h-[56px] flex items-center justify-center gap-3 rounded-[20px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[16px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
                <path fill="#f25022" d="M1 1h10v10H1z" />
                <path fill="#7fba00" d="M12 1h10v10H12z" />
                <path fill="#00a4ef" d="M1 12h10v10H1z" />
                <path fill="#ffb900" d="M12 12h10v10H12z" />
              </svg>
              {loading ? 'Redirecting to Microsoft...' : 'Sign in with Microsoft'}
              {!loading && (
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" strokeWidth={2} />
              )}
            </span>
            {loading && (
              <div className="absolute inset-0 bg-white/20 dark:bg-black/10 animate-pulse" />
            )}
          </button>

          {/* Footer links */}
          <div className="text-center pt-8 border-t border-black/[0.04] dark:border-white/[0.04]">
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-light">
              Are you an employee?{' '}
              <Link href="/helpdesk/employee/login" className="font-medium text-zinc-900 dark:text-white hover:underline underline-offset-4">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HelpdeskAdminLogin() {
  return (
    <Suspense fallback={null}>
      <HelpdeskAdminLoginContent />
    </Suspense>
  );
}