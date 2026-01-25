import { NextResponse } from 'next/server';

export function middleware(request) {
    const path = request.nextUrl.pathname;

    // 1. Admin Protection
    if (path.startsWith('/admin') && path !== '/admin/login') {
        const adminSession = request.cookies.get('auth_admin_session');
        if (!adminSession) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    // 2. User Protection (Root Dashboard)
    // Protect root '/' but allow specific public paths if any (e.g., login, api)
    // We strictly protect '/' and maybe others? User requested "User side screen ... requires password".
    // I'll protect '/' specifically.
    if (path === '/') {
        const userSession = request.cookies.get('auth_user_session');
        if (!userSession) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // 3. Redirect if already logged in
    if (path === '/login') {
        if (request.cookies.get('auth_user_session')) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    if (path === '/admin/login') {
        // Note: Admin session is transient, so this might not persist as robustly, but good to have
        if (request.cookies.get('auth_admin_session')) {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/login', '/admin/:path*'],
};
