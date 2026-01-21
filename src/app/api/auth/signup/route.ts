import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
    try {
        // 환경변수 확인
        if (!supabaseUrl || !supabaseKey) {
            console.error("❌ Supabase 환경변수 누락:", {
                hasUrl: !!supabaseUrl,
                hasKey: !!supabaseKey
            });
            return NextResponse.json(
                { success: false, error: "서버 설정 오류입니다. 관리자에게 문의하세요." },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { email, password, name } = await req.json();

        // 입력 검증
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "이메일과 비밀번호를 입력해주세요." },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, error: "비밀번호는 6자 이상이어야 합니다." },
                { status: 400 }
            );
        }

        // 이메일 중복 확인
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: "이미 등록된 이메일입니다." },
                { status: 400 }
            );
        }

        // 비밀번호 해시
        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 생성
        const { data: newUser, error } = await supabase
            .from("users")
            .insert({
                email,
                password: hashedPassword,
                name: name || email.split("@")[0],
                plan: "free",
            })
            .select()
            .single();

        if (error) {
            console.error("회원가입 에러:", error);
            return NextResponse.json(
                { success: false, error: "회원가입 중 오류가 발생했습니다." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "회원가입이 완료되었습니다!",
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
            }
        });

    } catch (error) {
        console.error("회원가입 처리 오류:", error);
        return NextResponse.json(
            { success: false, error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
