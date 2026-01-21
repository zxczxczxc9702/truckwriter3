# 🚀 TruckWriter Render 배포 가이드

## 📋 준비물

1. **GitHub 계정** - 코드 저장용
2. **Render 계정** - https://render.com (무료 가입)
3. **환경변수 값들** - 아래 목록 참고

---

## 1️⃣ GitHub에 코드 업로드

```bash
# 프로젝트 폴더에서 실행
cd c:\Users\USER\.gemini\antigravity\scratch

# Git 초기화 (이미 했으면 스킵)
git init

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit - TruckWriter"

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/truckwriter.git
git branch -M main
git push -u origin main
```

---

## 2️⃣ Render에서 배포

### 단계 1: Render 회원가입
1. https://render.com 접속
2. **GitHub 계정으로 로그인** (권장)

### 단계 2: 새 웹 서비스 생성
1. 대시보드에서 **"New +"** 클릭
2. **"Web Service"** 선택
3. **"Connect a repository"** 클릭
4. GitHub 저장소 선택 (truckwriter)
5. **"Connect"** 클릭

### 단계 3: 서비스 설정
| 설정 | 값 |
|-----|-----|
| Name | truckwriter |
| Region | Singapore (가까운 곳) |
| Branch | main |
| Runtime | **Docker** |
| Instance Type | **Free** |

### 단계 4: 환경변수 설정
**"Environment"** 섹션에서 **"Add Environment Variable"** 클릭:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (Supabase에서 복사) |
| `PERPLEXITY_API_KEY` | `pplx-...` (Perplexity에서 복사) |
| `NEXTAUTH_SECRET` | `아무32자이상문자열입력` |
| `NEXTAUTH_URL` | `https://truckwriter.onrender.com` |

### 단계 5: 배포
1. **"Create Web Service"** 클릭
2. 빌드 시작 (5-10분 소요)
3. 완료 후 URL 제공됨

---

## 3️⃣ 배포 확인

배포 완료 후:
- URL: `https://truckwriter.onrender.com` (또는 설정한 이름)
- 처음 접속 시 30초 대기 (무료 플랜은 슬립 후 깨어나는 시간)

---

## ⚠️ 주의사항

### 무료 플랜 제한
- 15분 비활동 시 슬립 → 재접속 시 30초 대기
- 월 750시간 한도

### 문제 해결
- **빌드 실패**: Logs 탭에서 에러 확인
- **환경변수 누락**: Dashboard → Environment 확인

---

## 🔧 환경변수 얻는 방법

### NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY
1. https://supabase.com 로그인
2. 프로젝트 선택
3. Settings → API
4. URL과 `service_role` 키 복사

### PERPLEXITY_API_KEY
1. https://www.perplexity.ai 로그인
2. Settings → API
3. API Key 생성 및 복사

### NEXTAUTH_SECRET
```bash
# 터미널에서 랜덤 문자열 생성
openssl rand -base64 32
```
또는 아무 긴 문자열 입력 (예: `my-super-secret-key-for-nextauth-2024`)

### NEXTAUTH_URL
Render에서 배포 후 받은 URL (예: `https://truckwriter.onrender.com`)

---

배포 완료! 🎉
