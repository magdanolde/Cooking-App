import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, safeEqual, sessionToken } from '@/lib/auth';

/** Every page needs the password cookie, except the login page and static files. */
export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return new NextResponse('APP_PASSWORD is not set. Add it in Vercel → Settings → Environment Variables.', {
      status: 500,
    });
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie) {
    const expected = await sessionToken(password, process.env.AUTH_SECRET ?? '');
    if (safeEqual(cookie, expected)) return NextResponse.next();
  }

  const login = req.nextUrl.clone();
  login.pathname = '/login';
  login.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|icons/).*)'],
};
