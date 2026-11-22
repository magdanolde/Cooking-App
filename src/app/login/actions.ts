'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, SESSION_MAX_AGE, safeEqual, sessionToken } from '@/lib/auth';

function safeNext(next: string): string {
  // Only allow paths inside this app (no "//evil.com" or full URLs)
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export async function loginAction(formData: FormData): Promise<void> {
  const typed = String(formData.get('password') ?? '');
  const next = safeNext(String(formData.get('next') ?? '/'));
  const password = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET ?? '';

  if (!password) redirect('/login?error=config');

  const [a, b] = await Promise.all([sessionToken(typed, secret), sessionToken(password, secret)]);
  if (!safeEqual(a, b)) {
    redirect(`/login?error=wrong&next=${encodeURIComponent(next)}`);
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, b, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  redirect(next);
}
