import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

const protectedRoutes: { [key: string]: { methods: string[], roles: string[] } } = {
  '/api/tournaments': { methods: ['POST'], roles: ['organizer'] },
  '/api/registrations': { methods: ['POST'], roles: ['player', 'organizer'] },
  '/api/users/me/registrations': { methods: ['GET'], roles: ['player'] },
};

// 动态路由匹配函数
function matchProtectedRoute(path: string, method: string): { roles: string[] } | null {
  // Matches /api/matches/:id/winner
  const match = path.match(/^\/api\/matches\/(\d+)\/winner$/);
  if (match && method === 'POST') {
    return { roles: ['organizer'] };
  }
  return null;
}

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

    let routeRule = protectedRoutes[path];
    // Check for dynamic routes if static route not found
    if (!routeRule) {
      const dynamicRouteRule = matchProtectedRoute(path, method);
      if (dynamicRouteRule) {
        routeRule = { methods: [method], roles: dynamicRouteRule.roles };
      }
    }
    
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