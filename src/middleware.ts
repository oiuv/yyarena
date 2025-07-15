import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-default-secret-key');

const protectedRoutes: { [key: string]: string[] } = {
  '/api/tournaments': ['organizer'], // POST for creating tournaments
  '/api/matches/winner': ['organizer'], // POST for updating match winner
  '/api/registrations': ['player', 'organizer'], // POST for player registration (player and organizer can register)
  '/api/users/me/registrations': ['player'], // GET for player registrations
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.split(' ')[1];
  const path = request.nextUrl.pathname;
  const method = request.method;

  console.log(`Middleware: Path=${path}, Method=${method}, TokenExists=${!!token}`);

  // Allow access to login/register and public routes without token
  if (path.startsWith('/api/auth') || path === '/' || path.startsWith('/_next') || path.startsWith('/login') || path.startsWith('/register') || (path === '/api/tournaments' && method === 'GET') || (path.startsWith('/api/tournaments/') && path.endsWith('/matches') && method === 'GET')) {
    console.log('Middleware: Public route, allowing access.');
    return NextResponse.next();
  }

  if (!token) {
    console.log('Middleware: No token, redirecting to login.');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;
    console.log(`Middleware: Token decoded, UserRole=${userRole}`);

    // Check for authorization based on route and method
    if (protectedRoutes[path] && method === 'POST') {
      console.log(`Middleware: Protected POST route, checking role for path=${path}`);
      if (!protectedRoutes[path].includes(userRole)) {
        console.log('Middleware: Forbidden: Insufficient role for POST.');
        return NextResponse.json({ message: 'Forbidden: Insufficient role' }, { status: 403 });
      }
    }

    // For GET requests to /api/tournaments and /api/tournaments/matches, allow both organizer and player
    if (((path === '/api/tournaments' || path.startsWith('/api/tournaments/') && path.endsWith('/matches')) && method === 'GET') || (path === '/api/users/me/registrations' && method === 'GET')) {
      console.log(`Middleware: GET route for tournaments/registrations, checking role for path=${path}`);
      if (!['organizer', 'player'].includes(userRole)) {
        console.log('Middleware: Forbidden: Insufficient role for GET.');
        return NextResponse.json({ message: 'Forbidden: Insufficient role' }, { status: 403 });
      }
    }

    console.log('Middleware: All checks passed, allowing access.');
    return NextResponse.next();
  } catch (err) {
    console.error('Middleware: Token verification failed or other error:', err);
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
