import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';
import { authApi } from '../../services/api';
import { getErrorMessage } from '../../types';
import { Spinner } from '../../components/common/Spinner';

const schema = z
  .object({
    new_password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[a-z]/, 'Must contain lowercase letter')
      .regex(/\d/, 'Must contain a digit'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type FormData = z.infer<typeof schema>;

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await authApi.resetPassword(token, data.new_password, data.confirm_password);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle="Enter your new password below">
      {done ? (
        <div className="text-center space-y-4">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm text-slate-600">
            Password reset successfully! You can now sign in with your new password.
          </p>
          <Link to="/login" className="btn-primary inline-flex w-full justify-center">
            Go to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!token && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              Invalid or missing reset token. Please request a new reset link.
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="label" htmlFor="new_password">New Password</label>
            <div className="relative">
              <input
                id="new_password"
                type={showPw ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="At least 8 characters"
                {...register('new_password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.new_password && (
              <p className="mt-1 text-xs text-red-600">{errors.new_password.message}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="confirm_password">Confirm Password</label>
            <input
              id="confirm_password"
              type={showPw ? 'text' : 'password'}
              className="input-field"
              placeholder="Repeat new password"
              {...register('confirm_password')}
            />
            {errors.confirm_password && (
              <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message}</p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isLoading || !token}>
            {isLoading ? <Spinner size="sm" /> : null}
            {isLoading ? 'Resetting…' : 'Reset password'}
          </button>

          <Link
            to="/login"
            className="flex items-center justify-center text-sm text-slate-500 hover:text-slate-700"
          >
            Back to login
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
