import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  BrainCircuit,
  FileText,
  Compass,
  ArrowRight,
  CheckCircle,
  Database,
  KeyRound,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onGoogleSignIn: () => Promise<void>;
  onGuestSignIn: () => Promise<void>;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoogleSignIn,
  onGuestSignIn,
  isLoading,
  errorMessage,
}) => {
  const [authMethod, setAuthMethod] = useState<'google' | 'guest' | null>(null);

  const handleGoogle = async () => {
    setAuthMethod('google');
    try {
      await onGoogleSignIn();
    } finally {
      setAuthMethod(null);
    }
  };

  const handleGuest = async () => {
    setAuthMethod('guest');
    try {
      await onGuestSignIn();
    } finally {
      setAuthMethod(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Hero Section */}
      <div className="max-w-4xl mx-auto text-center pt-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wide mb-6 shadow-md shadow-indigo-950/50"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Powered by Gemini 3.6 Flash & Cloud Firestore</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-serif text-slate-100 tracking-tight font-normal leading-[1.15]"
        >
          A quiet space to think, reflect, and converse with <span className="italic font-normal underline decoration-indigo-500 decoration-4 underline-offset-4">Gemini</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
        >
          Deepen your daily reflections with an intelligent thinking companion. Brainstorm ideas, reframe challenges, and preserve your personal journal in encrypted, user-isolated Firestore storage.
        </motion.p>

        {/* Authentication Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-10 p-6 sm:p-8 max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl shadow-black/40 text-left backdrop-blur-md"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Private & Secure Sign In
            </h3>
          </div>

          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Your journal entries are authenticated via Firebase Auth and isolated strictly to your user ID. No other user can access your data.
          </p>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
              <span className="font-semibold">Notice:</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              id="google-signin-btn"
              onClick={handleGoogle}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-semibold text-sm transition-all shadow-md shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {authMethod === 'google' && isLoading ? (
                <div className="w-4 h-4 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <button
              id="guest-signin-btn"
              onClick={handleGuest}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-slate-100 font-medium text-xs transition-colors cursor-pointer"
            >
              {authMethod === 'guest' && isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>Try Instant Guest Mode</span>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Zero Password Storage
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-indigo-400" /> Cloud Firestore
            </span>
          </div>
        </motion.div>
      </div>

      {/* Feature Pillar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full mt-4">
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between backdrop-blur-xs">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 text-indigo-300 flex items-center justify-center mb-4 border border-indigo-800/60">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-2">
              Multi-Turn Reflection Partner
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore your thoughts through deep reflection, creative brainstorming, cognitive reframing, or gratitude savoring with adaptive AI assistance.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center text-[11px] font-medium text-indigo-400">
            <span>Powered by Gemini 3.6 Flash</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between backdrop-blur-xs">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-300 flex items-center justify-center mb-4 border border-emerald-800/60">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-2">
              User-Isolated Storage
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every journal entry is stored in Firestore at <code className="text-[11px] bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-slate-300">/users/{`{uid}`}/interactions</code> with strict owner-only security rules.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center text-[11px] font-medium text-emerald-400">
            <span>Enforced by Firestore Security Rules</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between backdrop-blur-xs">
          <div>
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center mb-4 border border-slate-700">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-2">
              Automated Synthesis & Insights
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate structured executive summaries, extract actionable takeaways, track emotional sentiment, and categorize topics automatically.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center text-[11px] font-medium text-slate-300">
            <span>1-Click Structured Insights</span>
          </div>
        </div>
      </div>

      {/* Footer / Privacy note */}
      <div className="mt-12 text-center text-xs text-slate-500">
        <p>ReflectAI is private by design. Your journal entries are never shared with other users.</p>
      </div>
    </div>
  );
};
