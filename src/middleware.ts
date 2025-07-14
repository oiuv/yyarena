import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-default-secret-key');

const protectedRoutes: { [key: string]: string[] } = {
  '/api/tournaments': ['organizer'], // POST for creating tournaments
  '/api/matches/winner': ['organizer'], // POST for updating match winner
  '/api/tournaments/register': ['player'], // POST for player registration
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;
  const method = request.method;

  // Allow access to login/register and public routes without token
  if (path.startsWith('/api/auth') || path === '/' || path.startsWith('/_next') || path.startsWith('/login') || path.startsWith('/register')) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;

    // Check for authorization based on route and method
    if (protectedRoutes[path] && method === 'POST') {
      if (!protectedRoutes[path].includes(userRole)) {
        return NextResponse.json({ message: 'Forbidden: Insufficient role' }, { status: 403 });
      }
    }

    // For GET requests to /api/tournaments and /api/tournaments/matches, allow both organizer and player
    if ((path === '/api/tournaments' || path === '/api/tournaments/matches') && method === 'GET') {
      if (!['organizer', 'player'].includes(userRole)) {
        return NextResponse.json({ message: 'Forbidden: Insufficient role' }, { status: 403 });
      }
    }

    return NextResponse.next();
  } catch (err) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|register|$).*)',
  ],
};
