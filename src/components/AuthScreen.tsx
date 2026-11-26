import React, { useState } from 'react';
import { ArrowRight, AlertCircle, HardDrive, ShieldCheck } from 'lucide-react';
import { AssuredLogo } from './AssuredLogo';

interface AuthScreenProps {
  onOpenDemo: () => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onOpenDemo }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenDemo = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await onOpenDemo();
    } catch (err) {
      console.error('Could not open the sample workspace:', err);
      setError('The sample workspace could not be prepared. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      id="auth_screen"
      className="field-cover"
    >
      <section className="app-card field-cover-card">
        <div className="field-cover-intro">
          <div className="flex items-baseline gap-2 select-none">
            <AssuredLogo className="h-7 sm:h-8" />
            <span className="font-sans font-extrabold tracking-[0.18em] text-xs sm:text-sm text-[#6990FF] uppercase">
              CAPTURE
            </span>
          </div>
          <p className="mt-5 text-[11px] font-mono font-bold uppercase tracking-[0.17em] text-[#152128]/50">
            Interactive portfolio demo
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[#152128]">
            From site visit to finished report.
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#152128]/65">
            Explore five fictional inspections. Open an issue, mark up the evidence, and preview the finished report.
          </p>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-9 sm:py-8">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-950">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            id="auth_btn_open_demo"
            onClick={handleOpenDemo}
            disabled={isLoading}
            className="field-primary w-full"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                <span>Preparing sample workspace…</span>
              </>
            ) : (
              <>
                <span>Open sample workspace</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-lg bg-[#F4F6F8] p-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#39745D]" />
              <p className="text-xs leading-relaxed text-[#152128]/70">
                No account or sign-in is needed. All names, properties, and records are fictional.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-[#F4F6F8] p-3.5">
              <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-[#6990FF]" />
              <p className="text-xs leading-relaxed text-[#152128]/70">
                Demo changes stay in this browser. Cloud sync and account features are disabled.
              </p>
            </div>
          </div>

          <p className="border-t border-[#152128]/10 pt-4 text-center text-[11px] leading-relaxed text-[#152128]/45">
            Your previous demo work will be here when you return.
          </p>
        </div>
      </section>
    </main>
  );
};
