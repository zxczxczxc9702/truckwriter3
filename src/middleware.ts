import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 보호할 경로들
const protectedPaths = ["/dashboard", "/create", "/posts", "/settings"];

// 인증된 사용자가 접근하면 안 되는 경로들 (로그인/회원가입)
const authPaths = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // JWT 토큰 확인
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const isAuthenticated = !!token;

    // 보호된 경로에 미인증 사용자가 접근하면 로그인으로 리다이렉트
    if (protectedPaths.some(path => pathname.startsWith(path))) {
        if (!isAuthenticated) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // 이미 로그인한 사용자가 로그인/회원가입 페이지 접근 시 대시보드로 리다이렉트
    if (authPaths.some(path => pathname.startsWith(path))) {
        if (isAuthenticated) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/create/:path*",
        "/posts/:path*",
        "/settings/:path*",
        "/login",
        "/signup",
    ],
};
