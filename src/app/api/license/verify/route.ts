import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// POST: 라이센스 검증 및 등록
export async function POST(req: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { success: false, error: "서버 설정 오류" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { licenseKey, email } = await req.json();

        if (!licenseKey) {
            return NextResponse.json(
                { success: false, error: "라이센스 키를 입력해주세요." },
                { status: 400 }
            );
        }

        // 라이센스 조회
        const { data: license, error } = await supabase
            .from('licenses')
            .select('*')
            .eq('license_key', licenseKey.trim().toUpperCase())
            .single();

        if (error || !license) {
            return NextResponse.json(
                { success: false, error: "유효하지 않은 라이센스 키입니다." },
                { status: 404 }
            );
        }

        // 활성화 여부 확인
        if (!license.is_active) {
            return NextResponse.json(
                { success: false, error: "비활성화된 라이센스입니다." },
                { status: 403 }
            );
        }

        // 만료일 확인
        if (license.expires_at && new Date(license.expires_at) < new Date()) {
            return NextResponse.json(
                { success: false, error: "만료된 라이센스입니다.", expired: true },
                { status: 403 }
            );
        }

        // 이미 다른 사용자가 등록한 경우
        if (license.user_email && license.user_email !== email) {
            return NextResponse.json(
                { success: false, error: "이 라이센스는 다른 사용자가 사용 중입니다." },
                { status: 403 }
            );
        }

        // 첫 등록인 경우 이메일 등록
        if (!license.user_email && email) {
            await supabase
                .from('licenses')
                .update({
                    user_email: email,
                    registered_at: new Date().toISOString()
                })
                .eq('id', license.id);
        }

        // 사용량 조회
        const usage = await getUsage(supabase, license.id, license.plan);

        return NextResponse.json({
            success: true,
            license: {
                id: license.id,
                plan: license.plan,
                expires_at: license.expires_at,
                monthly_limit: license.monthly_limit,
                daily_limit: license.daily_limit,
            },
            usage,
            message: "라이센스 인증 성공!",
        });

    } catch (error) {
        console.error('라이센스 검증 오류:', error);
        return NextResponse.json(
            { success: false, error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}

async function getUsage(supabase: any, licenseId: string, plan: string) {
    const now = new Date();

    if (plan === 'free') {
        // 무료: 이번 달 사용량
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const { count } = await supabase
            .from('license_usage')
            .select('*', { count: 'exact', head: true })
            .eq('license_id', licenseId)
            .gte('used_at', startOfMonth.toISOString());

        return {
            used: count || 0,
            period: 'monthly',
        };
    } else {
        // 유료: 오늘 사용량
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const { count } = await supabase
            .from('license_usage')
            .select('*', { count: 'exact', head: true })
            .eq('license_id', licenseId)
            .gte('used_at', startOfDay.toISOString());

        return {
            used: count || 0,
            period: 'daily',
        };
    }
}
