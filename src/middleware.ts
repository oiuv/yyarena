import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-default-secret-key');

const protectedRoutes: { [key: string]: { methods: string[], roles: string[] } } = {
  '/api/tournaments': { methods: ['POST'], roles: ['organizer'] },
  '/api/matches/winner': { methods: ['POST'], roles: ['organizer'] },
  '/api/registrations': { methods: ['POST'], roles: ['player', 'organizer'] },
  '/api/users/me/registrations': { methods: ['GET'], roles: ['player'] },
};

const publicPrefixes = [
    '/api/auth',
    '/',
    '/_next',
    '/login',
    '/register',
    '/tournaments/details'
];

const publicApiRoutes = [
    { path: '/api/tournaments', method: 'GET' },
    { path: '/api/tournaments/:id/matches', method: 'GET' },
    { path: '/api/tournaments/:id/registered-players-avatars', method: 'GET' },
    { path: '/api/tournaments/:id', method: 'GET' },
];

function isPublic(path: string, method: string): boolean {
    if (publicPrefixes.some(prefix => path.startsWith(prefix))) {
        return true;
    }

    for (const route of publicApiRoutes) {
        const regex = new RegExp(`^${route.path.replace(/:id/g, '[^/]+')}$`);
        if (regex.test(path) && route.method === method) {
            return true;
        }
    }

    return false;
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.split(' ')[1];
  const path = request.nextUrl.pathname;
  const method = request.method;

  console.log(`Middleware: Path=${path}, Method=${method}, TokenExists=${!!token}`);

  if (isPublic(path, method)) {
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

    const routeRule = protectedRoutes[path];
    if (routeRule && routeRule.methods.includes(method)) {
        console.log(`Middleware: Protected route, checking role for path=${path}`);
        if (!routeRule.roles.includes(userRole)) {
            console.log('Middleware: Forbidden: Insufficient role.');
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