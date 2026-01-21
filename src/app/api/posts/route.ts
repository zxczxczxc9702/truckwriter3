import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface PostData {
    id?: string;
    title: string;
    content: string;
    tags: string[];
    status: 'draft' | 'scheduled' | 'published' | 'failed';
    scheduled_at?: string;
    vehicle_data?: Record<string, string>;
    images?: {
        thumbnail: string | null;
        details: string[];
    };
}

// POST - 글 저장 (임시저장 또는 예약)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession();

        // 인증 확인 (선택적 - 비로그인 사용도 허용할 경우 주석 처리)
        // if (!session?.user?.email) {
        //     return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
        // }

        const body = await req.json();
        const { id, title, content, tags, status, scheduled_at, vehicle_data, images } = body;

        // 기존 글 업데이트 또는 새 글 생성
        if (id) {
            // 업데이트
            const { data, error } = await supabase
                .from("posts")
                .update({
                    title,
                    content,
                    tags,
                    status: status || 'draft',
                    scheduled_at: scheduled_at || null,
                    vehicle_data,
                    images,
                })
                .eq("id", id)
                .select()
                .single();

            if (error) {
                console.error("글 업데이트 에러:", error);
                return NextResponse.json({ success: false, error: "저장에 실패했습니다." }, { status: 500 });
            }

            return NextResponse.json({ success: true, data, message: "글이 업데이트되었습니다." });
        } else {
            // 새로 생성
            const { data, error } = await supabase
                .from("posts")
                .insert({
                    title,
                    content,
                    tags,
                    status: status || 'draft',
                    scheduled_at: scheduled_at || null,
                    vehicle_data,
                    images,
                    // user_id는 추후 인증 구현 시 추가
                })
                .select()
                .single();

            if (error) {
                console.error("글 저장 에러:", error);
                return NextResponse.json({ success: false, error: "저장에 실패했습니다." }, { status: 500 });
            }

            return NextResponse.json({ success: true, data, message: "글이 저장되었습니다." });
        }

    } catch (error) {
        console.error("글 저장 처리 오류:", error);
        return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}

// GET - 저장된 글 목록 조회
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status"); // draft, scheduled, published, all

        let query = supabase
            .from("posts")
            .select("id, title, status, scheduled_at, created_at")
            .order("created_at", { ascending: false })
            .limit(50);

        if (status && status !== "all") {
            query = query.eq("status", status);
        }

        const { data, error } = await query;

        if (error) {
            console.error("글 목록 조회 에러:", error);
            return NextResponse.json({ success: false, error: "목록 조회에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error("글 목록 조회 오류:", error);
        return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}

// DELETE - 글 삭제
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, error: "글 ID가 필요합니다." }, { status: 400 });
        }

        const { error } = await supabase
            .from("posts")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("글 삭제 에러:", error);
            return NextResponse.json({ success: false, error: "삭제에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "글이 삭제되었습니다." });

    } catch (error) {
        console.error("글 삭제 오류:", error);
        return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
