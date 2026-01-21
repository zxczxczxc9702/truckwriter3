import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// POST: 사용량 기록 및 확인
export async function POST(req: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { success: false, error: "서버 설정 오류" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { licenseId, action = 'publish' } = await req.json();

        if (!licenseId) {
            return NextResponse.json(
                { success: false, error: "라이센스 ID가 필요합니다." },
                { status: 400 }
            );
        }

        // 라이센스 조회
        const { data: license, error: licenseError } = await supabase
            .from('licenses')
            .select('*')
            .eq('id', licenseId)
            .single();

        if (licenseError || !license) {
            return NextResponse.json(
                { success: false, error: "라이센스를 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        // 만료 확인
        if (license.expires_at && new Date(license.expires_at) < new Date()) {
            return NextResponse.json(
                { success: false, error: "만료된 라이센스입니다.", expired: true },
                { status: 403 }
            );
        }

        // 사용량 확인
        const now = new Date();
        let usageCount = 0;
        let limit = 0;

        if (license.plan === 'free') {
            // 무료: 월간 사용량 확인
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const { count } = await supabase
                .from('license_usage')
                .select('*', { count: 'exact', head: true })
                .eq('license_id', licenseId)
                .gte('used_at', startOfMonth.toISOString());

            usageCount = count || 0;
            limit = license.monthly_limit;
        } else {
            // 유료: 일일 사용량 확인
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const { count } = await supabase
                .from('license_usage')
                .select('*', { count: 'exact', head: true })
                .eq('license_id', licenseId)
                .gte('used_at', startOfDay.toISOString());

            usageCount = count || 0;
            limit = license.daily_limit;
        }

        // 제한 확인
        if (usageCount >= limit) {
            return NextResponse.json({
                success: false,
                error: license.plan === 'free'
                    ? `월간 사용 한도(${limit}회)를 초과했습니다.`
                    : `일일 사용 한도(${limit}회)를 초과했습니다.`,
                usage: {
                    used: usageCount,
                    limit,
                    remaining: 0,
                },
            }, { status: 429 });
        }

        // 사용량 기록
        const { error: usageError } = await supabase
            .from('license_usage')
            .insert({
                license_id: licenseId,
                action_type: action,
            });

        if (usageError) {
            console.error('사용량 기록 오류:', usageError);
        }

        return NextResponse.json({
            success: true,
            usage: {
                used: usageCount + 1,
                limit,
                remaining: limit - usageCount - 1,
            },
            message: "사용량이 기록되었습니다.",
        });

    } catch (error) {
        console.error('사용량 처리 오류:', error);
        return NextResponse.json(
            { success: false, error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}

// GET: 사용량 조회
export async function GET(req: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { success: false, error: "서버 설정 오류" },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(req.url);
        const licenseId = searchParams.get('licenseId');

        if (!licenseId) {
            return NextResponse.json(
                { success: false, error: "라이센스 ID가 필요합니다." },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 라이센스 정보
        const { data: license } = await supabase
            .from('licenses')
            .select('*')
            .eq('id', licenseId)
            .single();

        if (!license) {
            return NextResponse.json(
                { success: false, error: "라이센스를 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        const now = new Date();
        let usageCount = 0;
        let limit = 0;
        let period = '';

        if (license.plan === 'free') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const { count } = await supabase
                .from('license_usage')
                .select('*', { count: 'exact', head: true })
                .eq('license_id', licenseId)
                .gte('used_at', startOfMonth.toISOString());

            usageCount = count || 0;
            limit = license.monthly_limit;
            period = 'monthly';
        } else {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const { count } = await supabase
                .from('license_usage')
                .select('*', { count: 'exact', head: true })
                .eq('license_id', licenseId)
                .gte('used_at', startOfDay.toISOString());

            usageCount = count || 0;
            limit = license.daily_limit;
            period = 'daily';
        }

        return NextResponse.json({
            success: true,
            plan: license.plan,
            usage: {
                used: usageCount,
                limit,
                remaining: Math.max(0, limit - usageCount),
                period,
            },
            expires_at: license.expires_at,
        });

    } catch (error) {
        console.error('사용량 조회 오류:', error);
        return NextResponse.json(
            { success: false, error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
