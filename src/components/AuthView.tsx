import React, { useState } from 'react';
import {
  BookOpen,
  Gamepad2,
  Lock,
  Mail,
  Network,
  ShieldCheck,
  Trophy,
  UserCheck
} from 'lucide-react';
import type { PublicUser } from '../../shared/types.ts';
import { api } from '../lib/api.ts';

interface AuthViewProps {
  onAuthenticated: (user: PublicUser) => void;
  onAuthPendingChange?: (pending: boolean) => void;
}

type AuthTab = 'login' | 'signup' | 'admin' | 'recovery';

export function AuthView({ onAuthenticated, onAuthPendingChange }: AuthViewProps) {
  const [tab, setTab] = useState<AuthTab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login / Admin Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<'student' | 'teacher'>('student');
  const [signupClass, setSignupClass] = useState('');
  const [signupTeacherCode, setSignupTeacherCode] = useState('');

  // Email Recovery state
  const [recEmail, setRecEmail] = useState('');

  function switchTab(next: AuthTab) {
    setTab(next);
    setError(null);
    setSuccessMsg(null);
  }

  async function handleLogin(e: React.FormEvent, isAdminMode: boolean) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    onAuthPendingChange?.(true);
    try {
      const res = await api.login({
        email: loginEmail,
        password: loginPassword,
        adminOnly: isAdminMode,
        teacherCode: isAdminMode ? adminCode : undefined
      });
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
    } finally {
      onAuthPendingChange?.(false);
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    onAuthPendingChange?.(true);
    try {
      const res = await api.signup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: signupRole,
        className: signupRole === 'student' ? signupClass : undefined,
        teacherCode: signupRole === 'teacher' ? signupTeacherCode : undefined
      });
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign up. Please try again.');
    } finally {
      onAuthPendingChange?.(false);
      setLoading(false);
    }
  }

  async function handleRequestRecovery(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword({ email: recEmail });
      setSuccessMsg(res.message);
      setLoginEmail(recEmail.trim());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to send password reset email.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#071716] flex flex-col text-[#E9F5F2]">
      <header className="border-b border-[#1E4D48] bg-[#0B2220]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect width="32" height="32" rx="8" fill="#14B8A6" />
              <circle cx="16" cy="16" r="4.5" fill="#06201E" />
              <path
                d="M16 6V11.5M16 20.5V26M6 16H11.5M20.5 16H26"
                stroke="#06201E"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-display text-lg font-bold tracking-tight text-[#E9F5F2]">
              BelajarBuddy ICT
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#98BEB6]">
            <span className="whitespace-nowrap shrink-0">Cambridge IGCSE 0417</span>
            <span aria-hidden="true" className="text-[#255A54]">
              /
            </span>
            <span className="whitespace-nowrap shrink-0">Topics 1–11</span>
          </nav>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => switchTab(tab === 'signup' ? 'login' : 'signup')}
              className="px-4 py-2 text-sm font-semibold text-[#051B19] bg-[#14B8A6] hover:bg-[#0D9488] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {tab === 'signup' ? 'Log In' : 'Create Account'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        {/* Left Editorial Overview */}
        <section className="lg:col-span-7 flex flex-col justify-between bg-[#0C2523] border border-[#1E4D48] text-[#E9F5F2] rounded-2xl p-8 lg:p-10">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5EEAD4]">
              <span>Cambridge IGCSE ICT 0417</span>
              <span aria-hidden="true">·</span>
              <span>2029 Syllabus Edition</span>
              <span aria-hidden="true">·</span>
              <span>Topics 1 to 11</span>
            </div>

            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-[#E9F5F2] [text-wrap:balance]">
              Master ICT with interactive mind maps, unique quizzes, and heart-life arcade games
            </h1>

            <p className="text-base text-[#B5D5CE] leading-relaxed max-w-2xl">
              Explore structured visual mind maps for every syllabus topic before unlocking
              customisable 10–55 question quizzes and survival games. Every student receives a
              freshly randomised, non-overlapping question set.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#133633] border border-[#235852]">
                <div className="flex items-center gap-2.5 text-[#E9F5F2] font-semibold text-sm mb-1.5">
                  <Network className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                  <span>Mind Map Notes Gate</span>
                </div>
                <p className="text-sm text-[#98BEB6] leading-relaxed">
                  Click through every subtopic branch in the visual mind map to review key points
                  and exam tips before answering.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#133633] border border-[#235852]">
                <div className="flex items-center gap-2.5 text-[#E9F5F2] font-semibold text-sm mb-1.5">
                  <Gamepad2 className="w-4 h-4 text-[#FB7185] shrink-0" />
                  <span>Heart-Life & Arcade Modes</span>
                </div>
                <p className="text-sm text-[#98BEB6] leading-relaxed">
                  Play Heart Quest (5 hearts), Cyber Boss Battle (3 hearts), ByteBlaster, Circuit
                  Grid, Data Tower Climb, or Classic Quiz.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#133633] border border-[#235852]">
                <div className="flex items-center gap-2.5 text-[#E9F5F2] font-semibold text-sm mb-1.5">
                  <BookOpen className="w-4 h-4 text-[#38BDF8] shrink-0" />
                  <span>10–55 Unique Questions</span>
                </div>
                <p className="text-sm text-[#98BEB6] leading-relaxed">
                  Over 1,270 syllabus questions distributed so classmates receive non-identical sets
                  with a 5-min-per-10-question timer.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#133633] border border-[#235852]">
                <div className="flex items-center gap-2.5 text-[#E9F5F2] font-semibold text-sm mb-1.5">
                  <Trophy className="w-4 h-4 text-[#FBBF24] shrink-0" />
                  <span>Topic Rankings & Admin</span>
                </div>
                <p className="text-sm text-[#98BEB6] leading-relaxed">
                  Compare class rankings across Topic 1–11 tabs while teachers track completion and
                  manage the question bank.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-[#1E4D48] flex flex-wrap items-center justify-between gap-4 text-xs text-[#98BEB6]">
            <span>Topics 1–11: Hardware, I/O, Storage, Networks, IT Effects, Apps, SLC, Safety, Audience, Comms & Files</span>
            <span className="font-mono tabular-nums text-[#5EEAD4]">5:00 / 10 Questions</span>
          </div>
        </section>

        {/* Right Auth Panel — Rich Verdigris Jade Interior (No White) */}
        <section className="lg:col-span-5 bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-6 lg:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-1 p-1 bg-[#091E1C] border border-[#1A433F] rounded-lg mb-6">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === 'login'
                  ? 'bg-[#16423E] text-[#5EEAD4]'
                  : 'text-[#98BEB6] hover:text-[#E9F5F2]'
              }`}
            >
              Student / User Login
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#16423E] text-[#5EEAD4]'
                  : 'text-[#98BEB6] hover:text-[#E9F5F2]'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => switchTab('admin')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === 'admin'
                  ? 'bg-[#16423E] text-[#5EEAD4]'
                  : 'text-[#98BEB6] hover:text-[#E9F5F2]'
              }`}
            >
              Teacher Admin
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 px-4 py-3 rounded-lg bg-[#2D101B] border border-[#881337] text-[#FECDD3] text-sm"
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[#0D3833] border border-[#1F6B62] text-[#99F6E4] text-sm">
              {successMsg}
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={(e) => handleLogin(e, false)} className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#E9F5F2]">
                  Welcome back
                </h2>
                <p className="text-sm text-[#98BEB6] mt-0.5">
                  Log in with your registered email address and password.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E9F5F2] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@school.edu"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-[#E9F5F2]">Password</label>
                  <button
                    type="button"
                    onClick={() => switchTab('recovery')}
                    className="text-xs font-medium text-[#5EEAD4] hover:text-[#99F6E4] cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#14B8A6] hover:bg-[#0D9488] disabled:opacity-60 text-[#051B19] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>{loading ? 'Signing in...' : 'Log In'}</span>
              </button>
            </form>
          )}

          {tab === 'admin' && (
            <form onSubmit={(e) => handleLogin(e, true)} className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#E9F5F2]">
                  Teacher & Admin Login
                </h2>
                <p className="text-sm text-[#98BEB6] mt-0.5">
                  Strictly for teachers to control topics, edit questions, and inspect student
                  progress.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E9F5F2] mb-1.5">
                  Teacher Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="teacher@school.edu"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-[#E9F5F2]">Password</label>
                  <button
                    type="button"
                    onClick={() => switchTab('recovery')}
                    className="text-xs font-medium text-[#5EEAD4] hover:text-[#99F6E4] cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E9F5F2] mb-1.5">
                  Teacher Access Code
                </label>
                <input
                  type="password"
                  required
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Enter teacher admin code"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-60 text-[#1F1303] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Verifying...' : 'Log In as Admin'}</span>
              </button>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#E9F5F2]">
                  Create your account
                </h2>
                <p className="text-sm text-[#98BEB6] mt-0.5">
                  Choose Student or Teacher role to get started.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSignupRole('student')}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                    signupRole === 'student'
                      ? 'border-[#14B8A6] bg-[#133C38] text-[#5EEAD4]'
                      : 'border-[#255A54] bg-[#091E1C] text-[#98BEB6] hover:bg-[#133633]'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setSignupRole('teacher')}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                    signupRole === 'teacher'
                      ? 'border-[#14B8A6] bg-[#133C38] text-[#5EEAD4]'
                      : 'border-[#255A54] bg-[#091E1C] text-[#98BEB6] hover:bg-[#133633]'
                  }`}
                >
                  Teacher (Admin)
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E9F5F2] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Aisyah Rahman"
                  className="w-full px-3.5 py-2 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E9F5F2] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@school.edu"
                  className="w-full px-3.5 py-2 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>

              {signupRole === 'student' ? (
                <div>
                  <label className="block text-sm font-medium text-[#E9F5F2] mb-1">Class</label>
                  <input
                    type="text"
                    required
                    value={signupClass}
                    onChange={(e) => setSignupClass(e.target.value)}
                    placeholder="e.g. 10A or 4 Science"
                    className="w-full px-3.5 py-2 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-[#E9F5F2] mb-1">
                    Teacher Verification Code
                  </label>
                  <input
                    type="password"
                    required
                    value={signupTeacherCode}
                    onChange={(e) => setSignupTeacherCode(e.target.value)}
                    placeholder="Enter school teacher code"
                    className="w-full px-3.5 py-2 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                  />
                  <p className="text-xs text-[#98BEB6] mt-1">
                    Teachers do not need a class and gain full Admin controls.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#E9F5F2] mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#14B8A6] hover:bg-[#0D9488] disabled:opacity-60 text-[#051B19] font-semibold text-sm rounded-lg transition-colors cursor-pointer"
              >
                {loading
                  ? 'Creating Account...'
                  : signupRole === 'teacher'
                    ? 'Register as Teacher Admin'
                    : 'Register as Student'}
              </button>
            </form>
          )}

          {tab === 'recovery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#E9F5F2]">
                    Password Recovery
                  </h2>
                  <p className="text-sm text-[#98BEB6] mt-0.5">
                    Enter your registered email to receive a password reset link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="text-xs font-medium text-[#98BEB6] hover:text-[#E9F5F2] cursor-pointer"
                >
                  Back to Login
                </button>
              </div>

              <form onSubmit={handleRequestRecovery} className="space-y-3.5">
                <div>
                  <label className="block text-sm font-medium text-[#E9F5F2] mb-1">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={recEmail}
                    onChange={(e) => setRecEmail(e.target.value)}
                    placeholder="you@school.edu"
                    className="w-full px-3.5 py-2 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#14B8A6] hover:bg-[#0D9488] disabled:opacity-60 text-[#051B19] font-semibold text-sm rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>{loading ? 'Sending Reset Link...' : 'Send Reset Email'}</span>
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#1E4D48] flex items-center gap-2 text-xs text-[#98BEB6]">
            <Lock className="w-3.5 h-3.5 shrink-0 text-[#5EEAD4]" />
            <span>Secured with Firebase Authentication and every student gets unique randomised questions.</span>
          </div>
        </section>
      </main>
    </div>
  );
}
