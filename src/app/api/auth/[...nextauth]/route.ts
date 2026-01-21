import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "이메일",
            credentials: {
                email: { label: "이메일", type: "email", placeholder: "email@example.com" },
                password: { label: "비밀번호", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("이메일과 비밀번호를 입력해주세요.");
                }

                // Supabase에서 사용자 조회
                const { data: user, error } = await supabase
                    .from("users")
                    .select("*")
                    .eq("email", credentials.email)
                    .single();

                if (error || !user) {
                    throw new Error("등록되지 않은 이메일입니다.");
                }

                // 비밀번호 검증
                const isValid = await bcrypt.compare(credentials.password, user.password);
                if (!isValid) {
                    throw new Error("비밀번호가 일치하지 않습니다.");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    plan: user.plan || "free",
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.plan = (user as { plan?: string }).plan || "free";
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as { id?: string }).id = token.id as string;
                (session.user as { plan?: string }).plan = token.plan as string;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7일
    },
    jwt: {
        maxAge: 7 * 24 * 60 * 60, // 7일
    },
    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
