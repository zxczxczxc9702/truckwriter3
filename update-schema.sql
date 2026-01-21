-- TruckWriter 추가 기능을 위한 스키마 업데이트
-- Supabase SQL Editor에서 실행하세요

-- 1. posts 테이블에 상태 및 예약 필드 추가
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS vehicle_data JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS images JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 2. 상태 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at) WHERE status = 'scheduled';

-- 3. 상태 체크 제약조건
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check 
    CHECK (status IN ('draft', 'scheduled', 'published', 'failed'));

-- 완료 확인
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'posts' ORDER BY ordinal_position;
