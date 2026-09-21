import { NextResponse } from 'next/server';

export async function POST(request) {
    const response = NextResponse.json({ success: true });

    // Clear all session cookies
    response.cookies.delete('auth_user_session');
    response.cookies.delete('auth_admin_session');
    response.cookies.delete('auth_scores_session');
    response.cookies.delete('auth_edit_session');

    return response;
}
