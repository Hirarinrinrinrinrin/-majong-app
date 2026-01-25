import { NextResponse } from 'next/server';

export async function POST(request) {
    const response = NextResponse.json({ success: true });

    // Clear both cookies
    response.cookies.delete('auth_user_session');
    response.cookies.delete('auth_admin_session');

    return response;
}
