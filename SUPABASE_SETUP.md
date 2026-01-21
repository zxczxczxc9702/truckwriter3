# TruckWriter 환경변수 설정 가이드

## 필수 환경변수

`.env.local` 파일에 다음 변수들을 설정하세요:

```env
# OpenAI API (기존)
OPENAI_API_KEY=sk-...your-openai-key

# NextAuth.js 설정
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-here-minimum-32-chars

# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR...
```

---

## Supabase 설정 방법

### 1. Supabase 프로젝트 생성
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인
4. "New Project" 생성
   - Project name: `truckwriter`
   - Database Password: 안전한 비밀번호 설정
   - Region: `Northeast Asia (Seoul)` 선택

### 2. API 키 가져오기
1. Project Settings > API 메뉴
2. `Project URL` 복사 → `NEXT_PUBLIC_SUPABASE_URL`
3. `service_role` secret 복사 → `SUPABASE_SERVICE_ROLE_KEY`

### 3. 데이터베이스 테이블 생성
SQL Editor에서 다음 쿼리 실행:

```sql
-- users 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    plan TEXT DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- usage 테이블 (월별 사용량 추적)
CREATE TABLE usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- posts 테이블 (생성된 글 저장)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    tags TEXT[],
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_usage_user_month ON usage(user_id, month);
CREATE INDEX idx_posts_user ON posts(user_id);
```

### 4. NextAuth Secret 생성
터미널에서 실행:
```bash
openssl rand -base64 32
```
생성된 값을 `NEXTAUTH_SECRET`에 설정

---

## 프로덕션 배포 시 주의사항

### Vercel 배포
1. Environment Variables에 모든 키 추가
2. `NEXTAUTH_URL`을 실제 도메인으로 변경
   ```
   NEXTAUTH_URL=https://your-domain.com
   ```

### 보안
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 노출 금지
- `NEXTAUTH_SECRET`은 최소 32자 이상 사용
- `.env.local`은 절대 Git에 커밋하지 않음

---

## 테스트 체크리스트

- [ ] Supabase 프로젝트 생성 완료
- [ ] 테이블 생성 SQL 실행 완료
- [ ] `.env.local`에 모든 변수 설정
- [ ] `npm run dev` 실행 후 `/signup` 접속
- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 보호된 페이지 접근 테스트 (`/dashboard`)
