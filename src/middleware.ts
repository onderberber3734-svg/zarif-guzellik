import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
    // Session'ı günceller ve güncel supabase client/response döndürür
    const { response, user } = await updateSession(request);

    // Yönlendirme mantığı:
    // Eğer kullanıcı giriş yapmamışsa ve auth dışı bir sayfadaysa /login'e yönlendir
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
    const isPublicRoute = request.nextUrl.pathname.startsWith('/api/') || request.nextUrl.pathname.startsWith('/_next/') || request.nextUrl.pathname === '/favicon.ico' || request.nextUrl.pathname.startsWith('/public/');

    if (!isPublicRoute) {
        if (!user && !isAuthRoute) {
            // Kullanıcı yok ve giriş/kayıt sayfasında değilse Logine at
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }

        if (user && isAuthRoute) {
            // Kullanıcı zaten giriş yapmış ama login/register a geldiyse ana sayfaya at
            const url = request.nextUrl.clone();
            url.pathname = '/';
            return NextResponse.redirect(url);
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
