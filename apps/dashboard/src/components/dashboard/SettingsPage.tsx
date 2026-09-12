import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User, Check, Loader2 } from 'lucide-react';
import { useGetAdminProfile, usePatchAdminProfile } from '@manhaj/api-client';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Heading } from './Heading';

interface ProfileFormData {
  name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

import { toast } from '@/components/ui/sonner';

export function SettingsPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: session } = authClient.useSession();
  const profileQuery = useGetAdminProfile();
  const updateMutation = usePatchAdminProfile();

  const user = ((profileQuery.data as any)?.data ?? {}) as {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  useEffect(() => {
    if (user.name || user.email) {
      reset({
        name: user.name || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [user.name, user.email, reset]);

  const onSubmit = async (values: ProfileFormData) => {
    try {
      const payload: { name?: string; email?: string; password?: string } = {
        name: values.name,
        email: values.email,
      };
      if (values.password && values.password.trim()) {
        payload.password = values.password.trim();
      }

      await updateMutation.mutateAsync({
        data: payload,
      });

      toast.success('Profile updated successfully!');
      profileQuery.refetch();
      reset({
        name: values.name,
        email: values.email,
        password: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Failed to update profile';
      toast.error(errMsg);
    }
  };


  return (
    <>
      <Heading
        eyebrow="Account & Security"
        title="Settings"
        description="Manage your admin profile, personal details, and account credentials."
      />

      <div className="max-w-2xl">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Admin Profile
                </CardTitle>
                <CardDescription className="text-sm text-slate-500">
                  Update your display name, email, or change your login password.
                </CardDescription>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                <ShieldCheck size={14} />
                {user.role ? String(user.role).toUpperCase() : 'ADMIN'}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {(session?.user?.image || (user as any)?.image) && (
              <div className="mb-6 flex items-center gap-4 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
                <img
                  src={session?.user?.image || (user as any)?.image}
                  alt={user.name || session?.user?.name || 'Admin'}
                  className="size-14 rounded-full object-cover ring-2 ring-teal-600/30"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">{user.name || session?.user?.name}</h4>
                  <p className="text-xs text-slate-500">{user.email || session?.user?.email}</p>
                  <span className="mt-1 inline-block text-[11px] text-teal-700 font-medium">Synced from Google Account</span>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User size={16} />
                  </div>
                  <Input
                    {...register('name', { required: 'Name is required' })}
                    placeholder="e.g. Dr. Ahmed"
                    className="pl-9 h-10 bg-white border-slate-200 focus:border-teal-600 focus:ring-teal-600"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail size={16} />
                  </div>
                  <Input
                    type="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                    placeholder="admin@example.com"
                    className="pl-9 h-10 bg-white border-slate-200 focus:border-teal-600 focus:ring-teal-600"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  Change Password
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Leave blank if you do not want to change your current password.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock size={15} />
                      </div>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password', {
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters',
                          },
                        })}
                        placeholder="••••••••"
                        className="pl-9 pr-9 h-10 bg-white border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock size={15} />
                      </div>
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...register('confirmPassword', {
                          validate: (val) => {
                            if (passwordValue && val !== passwordValue) {
                              return 'Passwords do not match';
                            }
                            return true;
                          },
                        })}
                        placeholder="••••••••"
                        className="pl-9 pr-9 h-10 bg-white border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  type="submit"
                  disabled={isSubmitting || updateMutation.isPending}
                  className="bg-teal-700 hover:bg-teal-800 text-white min-w-[140px]"
                >
                  {isSubmitting || updateMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-1.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

