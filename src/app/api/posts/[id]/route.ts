import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// GET - 특정 글 상세 조회
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data, error } = await getSupabase()
            .from("posts")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.error("글 조회 에러:", error);
            return NextResponse.json({ success: false, error: "글을 찾을 수 없습니다." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error("글 조회 오류:", error);
        return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
