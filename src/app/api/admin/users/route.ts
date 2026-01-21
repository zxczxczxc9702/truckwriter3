import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 관리자 이메일 목록 (환경변수로 설정 권장)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['sinyongro@naver.com'];

// GET - 사용자 목록 조회
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession();

        // 관리자 권한 확인
        if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
            return NextResponse.json({
                success: false,
                error: "관리자 권한이 필요합니다."
            }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        // 사용자 목록 조회
        const { data: users, error, count } = await supabase
            .from("users")
            .select("id, email, name, plan, blog_id, created_at", { count: 'exact' })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("사용자 목록 조회 에러:", error);
            return NextResponse.json({
                success: false,
                error: "사용자 목록 조회에 실패했습니다."
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error("사용자 목록 조회 오류:", error);
        return NextResponse.json({
            success: false,
            error: "서버 오류가 발생했습니다."
        }, { status: 500 });
    }
}

// DELETE - 사용자 삭제
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
            return NextResponse.json({
                success: false,
                error: "관리자 권한이 필요합니다."
            }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("id");

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: "사용자 ID가 필요합니다."
            }, { status: 400 });
        }

        const { error } = await supabase
            .from("users")
            .delete()
            .eq("id", userId);

        if (error) {
            console.error("사용자 삭제 에러:", error);
            return NextResponse.json({
                success: false,
                error: "삭제에 실패했습니다."
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "사용자가 삭제되었습니다."
        });

    } catch (error) {
        console.error("사용자 삭제 오류:", error);
        return NextResponse.json({
            success: false,
            error: "서버 오류가 발생했습니다."
        }, { status: 500 });
    }
}

// PATCH - 사용자 플랜 변경
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
            return NextResponse.json({
                success: false,
                error: "관리자 권한이 필요합니다."
            }, { status: 403 });
        }

        const body = await req.json();
        const { userId, plan } = body;

        if (!userId || !plan) {
            return NextResponse.json({
                success: false,
                error: "사용자 ID와 플랜이 필요합니다."
            }, { status: 400 });
        }

        const { error } = await supabase
            .from("users")
            .update({ plan })
            .eq("id", userId);

        if (error) {
            console.error("플랜 변경 에러:", error);
            return NextResponse.json({
                success: false,
                error: "플랜 변경에 실패했습니다."
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "플랜이 변경되었습니다."
        });

    } catch (error) {
        console.error("플랜 변경 오류:", error);
        return NextResponse.json({
            success: false,
            error: "서버 오류가 발생했습니다."
        }, { status: 500 });
    }
}
