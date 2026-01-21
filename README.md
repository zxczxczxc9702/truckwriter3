# TruckWriter

트럭 매매 전문가를 위한 AI 기반 블로그 자동 생성 도구

## 🚛 소개

TruckWriter는 트럭 매매 전문가들이 네이버 블로그에 게시할 SEO 최적화된 매물 글을 자동으로 생성할 수 있도록 돕는 웹 애플리케이션입니다. 차량 정보만 입력하면 5분 안에 전문적인 블로그 글이 자동으로 생성됩니다.

## ✨ 주요 기능

- **자동 콘텐츠 생성**: 차량 정보를 입력하면 AI가 전문적인 블로그 글을 자동 생성
- **네이버 블로그 자동 발행**: Selenium을 이용한 완전 자동화된 블로그 발행
- **SEO 최적화**: 네이버 검색 상위노출을 위한 키워드 자동 삽입
- **저품질 필터 방지**: 중복 검사 엔진으로 네이버 저품질 필터 회피
- **미리보기 기능**: 생성된 글을 발행 전에 미리 확인
- **게시글 관리**: 작성한 모든 게시글을 한눈에 관리
- **분석 대시보드**: 조회수, 전화 클릭, 검색 순위 등 실시간 통계

## 🛠️ 기술 스택

- **Frontend**: Next.js 16.0.3, React 19.2.0
- **Styling**: TailwindCSS 4
- **Icons**: Lucide React
- **Language**: TypeScript 5
- **Automation**: Selenium WebDriver 4 (네이버 블로그 자동 발행)

## 📦 설치 및 실행

### 필수 요구사항

- Node.js 20 이상
- npm 또는 yarn
- Google Chrome 브라우저 (Selenium 자동화용)
- ChromeDriver (자동 설치됨 - Selenium Manager)

### 설치

```bash
# 저장소 클론 (또는 다운로드)
git clone <repository-url>

# 프로젝트 디렉토리로 이동
cd truckwriter

# 의존성 설치
npm install
```

### Selenium 설정

네이버 블로그 자동 발행을 사용하려면 Chrome 브라우저가 필요합니다:

1. [Google Chrome](https://www.google.com/chrome/) 설치
2. ChromeDriver는 Selenium Manager가 자동으로 관리합니다

상세한 설정은 [SELENIUM_SETUP.md](./SELENIUM_SETUP.md) 참고

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 📋 페이지 구조

- **/** - 랜딩 페이지 (홈)
- **/dashboard** - 대시보드 (통계 및 최근 게시글)
- **/create** - 새 게시글 작성
- **/posts** - 게시글 관리
- **/settings** - 설정

## 🎨 주요 화면

### 홈 페이지
- 서비스 소개 및 주요 기능 설명
- 트렌디한 그라데이션 디자인
- 통계 정보 표시

### 대시보드
- 총 게시글, 조회수, 전화 클릭, 검색 유입 통계
- 최근 게시글 목록
- 인기 검색어 분석

### 새 글 작성
- 차량 기본 정보 입력 (종류, 지역, 가격, 연식, 주행거리, 전화번호)
- 상세 정보 입력 (옵션, 장점, 단점)
- 이미지 업로드 (썸네일 및 상세 이미지)
- AI 기반 블로그 글 자동 생성
- 실시간 미리보기 모달

### 게시글 관리
- 작성한 모든 게시글 목록
- 조회수, 전화 클릭, 검색 순위 표시
- 수정 및 삭제 기능

### 설정
- 프로필 설정 (회사명, 담당자명, 전화번호, 활동 지역)
- 알림 설정 (이메일, SMS)
- 자동화 설정 (자동 발행, SEO 최적화, 저품질 필터 방지)
- API 연동 (네이버 API, AI API)

## 🚀 API 엔드포인트

### POST /api/generate
차량 정보를 받아 블로그 글을 생성합니다.

**Request Body:**
```json
{
  "vehicleType": "메가트럭",
  "region": "서울",
  "price": "3,500만원",
  "year": "2018년식",
  "mileage": "18만km",
  "options": "냉동기 신품, 적재함 무사고",
  "pros": "차량 상태 최상급",
  "cons": "약간의 스크래치 있음",
  "phone": "010-XXXX-XXXX"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "2018년식 메가트럭 서울 급매 - 실주행 18만km",
    "content": "...",
    "tags": ["#메가트럭", "#서울트럭", "#트럭매매", ...]
  }
}
```

### POST /api/publish
생성된 블로그 글을 네이버 블로그에 자동 발행합니다 (Selenium 사용).

**Request Body:**
```json
{
  "post": {
    "title": "2018년식 메가트럭 서울 급매",
    "content": "차량 기본 정보...",
    "tags": ["#메가트럭", "#서울트럭", "#트럭매매"]
  },
  "credentials": {
    "username": "naver_id",
    "password": "password"
  },
  "blogId": "your_blog_id"
}
```

**Response (성공):**
```json
{
  "success": true,
  "message": "블로그 글이 성공적으로 발행되었습니다!",
  "data": {
    "title": "2018년식 메가트럭 서울 급매",
    "publishedAt": "2025-11-19T09:00:00.000Z"
  }
}
```

**Response (실패):**
```json
{
  "success": false,
  "error": "네이버 로그인에 실패했습니다. 아이디와 비밀번호를 확인하거나 2단계 인증을 완료해주세요."
}
```

## 🎯 향후 개선 사항

- [ ] OpenAI/Claude API 연동으로 실제 AI 콘텐츠 생성
- [ ] 네이버 블로그 API 연동으로 자동 발행 기능
- [ ] 이미지 업로드 및 ALT 태그 자동 생성
- [ ] 게시글 중복도 검사 기능
- [ ] 실시간 검색 순위 추적
- [ ] 사용자 인증 및 다중 계정 관리
- [ ] 댓글 및 문의 관리 기능
- [ ] 모바일 반응형 최적화

## 📝 라이센스

MIT License

## 👨‍💻 개발자

TruckWriter Development Team

---

**Made with ❤️ for truck dealers**
