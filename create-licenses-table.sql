-- TruckWriter 라이센스 시스템 테이블

-- 라이센스 테이블
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255),
    plan VARCHAR(50) NOT NULL DEFAULT 'free', -- 'free' or 'paid'
    monthly_limit INT DEFAULT 3,  -- 무료: 월 3회
    daily_limit INT DEFAULT 0,    -- 무료는 일일 제한 없음, 유료: 일 5회
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    registered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용량 추적 테이블
CREATE TABLE IF NOT EXISTS license_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_type VARCHAR(50) DEFAULT 'publish' -- 'publish', 'generate'
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(user_email);
CREATE INDEX IF NOT EXISTS idx_usage_license_id ON license_usage(license_id);
CREATE INDEX IF NOT EXISTS idx_usage_used_at ON license_usage(used_at);

-- 라이센스 키 생성 예시 (관리자가 수동 생성)
-- INSERT INTO licenses (license_key, plan, monthly_limit, daily_limit, expires_at)
-- VALUES ('FREE-XXXX-XXXX-XXXX', 'free', 3, 0, NOW() + INTERVAL '30 days');
-- 
-- INSERT INTO licenses (license_key, plan, monthly_limit, daily_limit, expires_at)
-- VALUES ('PAID-XXXX-XXXX-XXXX', 'paid', 0, 5, NOW() + INTERVAL '30 days');
