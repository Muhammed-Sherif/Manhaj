import { useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';

interface LoginFormProps {
  onLogin: (token: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin,
      });
    } catch (err: any) {
      const msg =
        err?.message ||
        'Google sign-in could not be initiated. Make sure GOOGLE_CLIENT_ID is set in your server .env';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.error) {
        throw new Error(res.error.message || 'Invalid email or password');
      }

      const token =
        (res.data as any)?.token ||
        (res.data as any)?.session?.token ||
        'better-auth-session';

      localStorage.setItem('manhaj_access_token', token);
      toast.success('Signed in successfully');
      onLogin(token);
    } catch (requestError) {
      const msg =
        requestError instanceof Error
          ? requestError.message
          : 'Unable to sign in. Please check your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-6 py-6 sm:px-12">
      <div className="w-full max-w-sm">
        {/* Header / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/20">
            <img src="/logo.png" alt="Manhaj Logo" className="rounded" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-teal-800">
            Manhaj
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Medical Education Content Management
          </p>
          <p className="mt-5 text-sm font-medium text-slate-600">
            Sign in to your account
          </p>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          onClick={handleGoogleSignIn}
        >
          <img src="/google.webp" alt="Google" className="h-5 w-5" />
          Sign in with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Email & Password Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <Input
              className="mt-2 h-11 bg-white"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <div className="relative mt-2">
              <Input
                className="h-11 bg-white pr-11"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                className="accent-teal-700 rounded"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              className="font-semibold text-teal-700 hover:underline"
              onClick={() => {
                const msg = 'Password reset is not configured yet';
                setError(msg);
                toast.info(msg);
              }}
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="h-11 w-full bg-teal-700 hover:bg-teal-800 text-white font-medium"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <LockKeyhole size={13} />
          Secure administrator access
        </div>
      </div>
    </div>
  );
}
