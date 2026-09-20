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

    // 4. Score Viewer Protection (read-only report page, separate password from user/admin)
    if (path.startsWith('/scores') && path !== '/scores/login') {
        const scoresSession = request.cookies.get('auth_scores_session');
        if (!scoresSession) {
            return NextResponse.redirect(new URL('/scores/login', request.url));
        }
    }

    if (path === '/scores/login') {
        if (request.cookies.get('auth_scores_session')) {
            return NextResponse.redirect(new URL('/scores', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/login', '/admin/:path*', '/scores/:path*'],
};
