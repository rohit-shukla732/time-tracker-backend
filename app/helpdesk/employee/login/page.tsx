"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Ticket, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

const SSO_ERRORS: Record<string, string> = {
  access_denied: 'Sign-in was cancelled or denied.',
  no_account: 'No ACE Healthcare account is linked to this Microsoft login. Please contact your administrator.',
  account_disabled: 'Your account is disabled. Please contact your administrator.',
  session_expired: 'Your sign-in session expired. Please try again.',
  sso_error: 'Sign-in failed. Please try again.',
};

function HelpdeskEmployeeLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(SSO_ERRORS[searchParams.get('error') || ''] || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      router.replace('/helpdesk/employee/dashboard');
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
        body: JSON.stringify({ portal: 'employee' }),
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
              Sign in with your ACE Microsoft account.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[15px] font-medium flex items-center gap-3 border border-red-100 dark:border-red-500/20">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <Button
            type="button"
            onClick={handleSso}
            disabled={loading}
            className="w-full h-14 rounded-2xl text-[16px] font-semibold tracking-wide bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all duration-200 gap-3"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin opacity-70" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 23 23" aria-hidden="true">
                <path fill="#f25022" d="M1 1h10v10H1z" />
                <path fill="#7fba00" d="M12 1h10v10H12z" />
                <path fill="#00a4ef" d="M1 12h10v10H1z" />
                <path fill="#ffb900" d="M12 12h10v10H12z" />
              </svg>
            )}
            {loading ? 'Redirecting to Microsoft...' : 'Sign in with Microsoft'}
          </Button>

          <p className="text-center text-[13px] text-zinc-400 dark:text-zinc-500">
            You will be redirected to Microsoft to sign in securely.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HelpdeskEmployeeLogin() {
  return (
    <Suspense fallback={null}>
      <HelpdeskEmployeeLoginContent />
    </Suspense>
  );
}