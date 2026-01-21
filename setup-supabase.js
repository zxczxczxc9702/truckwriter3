// Supabase 테이블 생성 스크립트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vumjtbwsbtkdhxtwglkw.supabase.co';
const supabaseKey = 'sb_secret_PLKNIGW_CWUwrd8HvZH_1w_8QweZPXg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
    console.log('🚀 Supabase 테이블 생성 시작...');

    // SQL 쿼리 - PostgreSQL RPC 호출 사용
    const queries = [
        {
            name: 'users',
            sql: `
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    name TEXT,
                    plan TEXT DEFAULT 'free',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            `
        },
        {
            name: 'usage',
            sql: `
                CREATE TABLE IF NOT EXISTS usage (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    month TEXT NOT NULL,
                    count INTEGER DEFAULT 0,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(user_id, month)
                )
            `
        },
        {
            name: 'posts',
            sql: `
                CREATE TABLE IF NOT EXISTS posts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    title TEXT,
                    content TEXT,
                    tags TEXT[],
                    published BOOLEAN DEFAULT false,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `
        }
    ];

    for (const query of queries) {
        console.log(`📦 ${query.name} 테이블 생성 중...`);

        const { error } = await supabase.rpc('exec_sql', { sql: query.sql });

        if (error) {
            console.log(`⚠️ ${query.name}: RPC 방식 실패, 대체 방식 시도...`);
            // RPC가 없으면 직접 fetch로 시도
            try {
                const response = await fetch(`${supabaseUrl}/rest/v1/`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    }
                });
                console.log(`ℹ️ ${query.name}: 응답 상태: ${response.status}`);
            } catch (e) {
                console.log(`❌ ${query.name}: ${e.message}`);
            }
        } else {
            console.log(`✅ ${query.name} 테이블 생성 완료!`);
        }
    }

    // 테이블 존재 여부 확인
    console.log('\n📊 테이블 확인 중...');

    const { data: usersCheck, error: usersError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

    if (!usersError) {
        console.log('✅ users 테이블 접근 가능!');
    } else {
        console.log('❌ users 테이블 접근 불가:', usersError.message);
    }

    console.log('\n🎉 스크립트 완료!');
}

createTables().catch(console.error);
