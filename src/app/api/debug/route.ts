import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // 1. 환경변수 체크
        const envCheck = {
            hasUrl: !!supabaseUrl,
            urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "MISSING",
            hasKey: !!supabaseKey,
            keyPrefix: supabaseKey ? supabaseKey.substring(0, 10) + "..." : "MISSING",
        };

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({
                status: "ENV_MISSING",
                envCheck,
            });
        }

        // 2. Supabase 연결 테스트
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 3. users 테이블 스키마 확인
        const { data: users, error: selectError } = await supabase
            .from("users")
            .select("*")
            .limit(1);

        if (selectError) {
            return NextResponse.json({
                status: "SELECT_ERROR",
                envCheck,
                error: {
                    message: selectError.message,
                    code: selectError.code,
                    details: selectError.details,
                    hint: selectError.hint,
                },
            });
        }

        // 4. 테이블 컬럼 확인 (첫 번째 행의 키)
        const columns = users && users.length > 0 ? Object.keys(users[0]) : "NO_ROWS";

        // 5. INSERT 테스트 (바로 삭제)
        const testEmail = `debug_test_${Date.now()}@test.com`;
        const { data: insertData, error: insertError } = await supabase
            .from("users")
            .insert({
                email: testEmail,
                password: "test_hash",
                name: "DebugTest",
                plan: "free",
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({
                status: "INSERT_ERROR",
                envCheck,
                columns,
                userCount: users?.length,
                insertError: {
                    message: insertError.message,
                    code: insertError.code,
                    details: insertError.details,
                    hint: insertError.hint,
                },
            });
        }

        // 삭제
        if (insertData) {
            await supabase.from("users").delete().eq("id", insertData.id);
        }

        return NextResponse.json({
            status: "ALL_OK",
            envCheck,
            columns,
            userCount: users?.length,
            insertTest: "SUCCESS (inserted and deleted)",
        });

    } catch (err) {
        return NextResponse.json({
            status: "EXCEPTION",
            error: String(err),
        });
    }
}
