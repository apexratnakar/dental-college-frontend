import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Send } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';
import { authApi } from '../../services/api';
import { getErrorMessage } from '../../types';
import { Spinner } from '../../components/common/Spinner';

const schema = z.object({
  identifier: z.string().min(1, 'Email or mobile number is required'),
});
type FormData = z.infer<typeof schema>;

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data.identifier);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email or mobile to receive a reset link"
    >
      {sent ? (
        <div className="text-center space-y-4">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-100">
            <Send className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm text-slate-600">
            If an account exists for that identifier, a password reset link has been sent.
          </p>
          <Link to="/login" className="btn-primary inline-flex w-full justify-center">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="label" htmlFor="identifier">
              Email or Mobile Number
            </label>
            <input
              id="identifier"
              type="text"
              placeholder="you@example.com or 9876543210"
              className="input-field"
              {...register('identifier')}
            />
            {errors.identifier && (
              <p className="mt-1 text-xs text-red-600">{errors.identifier.message}</p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
            {isLoading ? 'Sending…' : 'Send reset link'}
          </button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
