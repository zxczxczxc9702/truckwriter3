import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 라이센스 키 생성 함수
function generateLicenseKey(plan: string): string {
    const prefix = plan === 'paid' ? 'PAID' : 'FREE';
    const randomPart = crypto.randomBytes(12).toString('hex').toUpperCase();
    return `${prefix}-${randomPart.slice(0, 4)}-${randomPart.slice(4, 8)}-${randomPart.slice(8, 12)}`;
}

// POST: 라이센스 생성 (관리자 전용)
export async function POST(req: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { success: false, error: "서버 설정 오류" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { plan, count = 1 } = await req.json();

        if (!plan || !['free', 'paid'].includes(plan)) {
            return NextResponse.json(
                { success: false, error: "유효하지 않은 플랜입니다. 'free' 또는 'paid'를 선택하세요." },
                { status: 400 }
            );
        }

        const licenses = [];
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30일 후 만료

        for (let i = 0; i < Math.min(count, 100); i++) {
            const licenseKey = generateLicenseKey(plan);

            const licenseData = {
                license_key: licenseKey,
                plan,
                monthly_limit: plan === 'free' ? 3 : 0,
                daily_limit: plan === 'paid' ? 5 : 0,
                expires_at: expiresAt.toISOString(),
                is_active: true,
            };

            const { data, error } = await supabase
                .from('licenses')
                .insert(licenseData)
                .select()
                .single();

            if (error) {
                console.error('라이센스 생성 오류:', error);
                continue;
            }

            licenses.push(data);
        }

        return NextResponse.json({
            success: true,
            message: `${licenses.length}개의 라이센스가 생성되었습니다.`,
            licenses: licenses.map(l => ({
                license_key: l.license_key,
                plan: l.plan,
                expires_at: l.expires_at,
            })),
        });

    } catch (error) {
        console.error('라이센스 생성 처리 오류:', error);
        return NextResponse.json(
            { success: false, error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}

// GET: 모든 라이센스 조회 (관리자 전용)
export async function GET(req: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { success: false, error: "서버 설정 오류" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('licenses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
        });

    } catch (error) {
        console.error('라이센스 조회 오류:', error);
        return NextResponse.json(
            { success: false, error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}

// PATCH: 라이센스 수정 (활성화 토글, 만료일 연장)
export async function PATCH(req: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { success: false, error: "서버 설정 오류" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { id, action, days } = await req.json();

        if (!id) {
            return NextResponse.json(
                { success: false, error: "라이센스 ID가 필요합니다." },
                { status: 400 }
            );
        }

        // 현재 라이센스 조회
        const { data: license, error: fetchError } = await supabase
            .from('licenses')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !license) {
            return NextResponse.json(
                { success: false, error: "라이센스를 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        let updateData: Record<string, unknown> = {};

        if (action === 'toggle') {
            // 활성화/비활성화 토글
            updateData.is_active = !license.is_active;
        } else if (action === 'extend') {
            // 만료일 연장
            const extendDays = days || 30;
            const currentExpiry = new Date(license.expires_at);
            const now = new Date();
            const baseDate = currentExpiry > now ? currentExpiry : now;
            baseDate.setDate(baseDate.getDate() + extendDays);
            updateData.expires_at = baseDate.toISOString();
        } else {
            return NextResponse.json(
                { success: false, error: "유효하지 않은 action입니다. (toggle 또는 extend)" },
                { status: 400 }
            );
        }

        const { error: updateError } = await supabase
            .from('licenses')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            return NextResponse.json(
                { success: false, error: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: action === 'toggle'
                ? `라이센스가 ${license.is_active ? '비활성화' : '활성화'}되었습니다.`
                : `만료일이 ${days || 30}일 연장되었습니다.`,
        });

    } catch (error) {
        console.error('라이센스 수정 오류:', error);
        return NextResponse.json(
            { success: false, error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}

// DELETE: 라이센스 삭제 (관리자 전용)
export async function DELETE(req: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { success: false, error: "서버 설정 오류" },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(req.url);
        const licenseId = searchParams.get('id');

        if (!licenseId) {
            return NextResponse.json(
                { success: false, error: "라이센스 ID가 필요합니다." },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
            .from('licenses')
            .delete()
            .eq('id', licenseId);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "라이센스가 삭제되었습니다.",
        });

    } catch (error) {
        console.error('라이센스 삭제 오류:', error);
        return NextResponse.json(
            { success: false, error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
