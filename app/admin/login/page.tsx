'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' },
    });
    setSubmitting(false);
    if (res.ok) {
      router.push('/admin');
    } else {
      setError('Password incorreta.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-bold text-gray-900 dark:text-gray-100">
          Administração
        </h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-ctt-red focus:outline-none focus:ring-2 focus:ring-ctt-red/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'A entrar...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
