# Selenium ChromeDriver 설치 가이드

## 네이버 블로그 자동 발행을 위한 설정

TruckWriter는 Selenium을 사용하여 네이버 블로그에 자동으로 글을 발행합니다. 이를 위해 Chrome브라우저와 ChromeDriver가 필요합니다.

## 1. Chrome 브라우저 확인

Chrome 브라우저가 설치되어 있는지 확인하세요. 없다면 설치해주세요:
- https://www.google.com/chrome/

## 2. ChromeDriver 설치 방법

### 방법 A: 자동 설치 (권장)

Selenium Manager가 자동으로 ChromeDriver를 관리하므로 별도 설치가 필요 없습니다!

Selenium WebDriver 4.6.0 이상에서는 자동으로 드라이버를 다운로드하고 관리합니다.

### 방법 B: 수동 설치

수동으로 설치하려면 다음 단계를 따르세요:

#### Windows:

1. Chrome 버전 확인
   - Chrome 열기 → 우측 상단 메뉴 → 도움말 → Chrome 정보
   - 버전 확인 (예: 120.0.6099.130)

2. ChromeDriver 다운로드
   - https://chromedriver.chromium.org/downloads
   - 또는 https://googlechromelabs.github.io/chrome-for-testing/
   - Chrome 버전과 일치하는 ChromeDriver 다운로드

3. 압축 해제 및 PATH 추가
   ```powershell
   # 원하는 위치에 압축 해제 (예: C:\chromedriver)
   # 시스템 환경 변수에 PATH 추가:
   # 제어판 → 시스템 → 고급 시스템 설정 → 환경 변수
   # Path에 chromedriver.exe 경로 추가
   ```

4. 확인
   ```powershell
   chromedriver --version
   ```

## 3. 사용 방법

### 네이버 블로그 자동 발행

1. **차량 정보 입력**
   - `/create` 페이지에서 차량 정보 입력

2. **네이버 계정 정보 입력**
   - 네이버 아이디
   - 비밀번호
   - 블로그 ID (blog.naver.com/**여기**)

3. **블로그 글 생성**
   - "블로그 글 생성하기" 버튼 클릭
   - AI가 제목, 내용, 태그 자동 생성

4. **미리보기 확인**
   - 생성된 글 미리보기
   - 필요시 수정 후 다시 생성

5. **네이버 블로그에 발행**
   - "네이버 블로그에 발행" 버튼 클릭
   - Chrome 브라우저가 자동으로 실행됩니다
   - 로그인 및 글 발행이 자동으로 진행됩니다

## 4. 주의사항

### 보안
- **네이버 계정 정보는 저장되지 않습니다**
- 매번 입력해야 합니다 (보안을 위함)
- HTTPS를 통해 안전하게 전송됩니다

### 2단계 인증
- 네이버 2단계 인증이 활성화되어 있으면:
  - 자동 발행 중 인증 요청이 나타날 수 있습니다
  - 첫 로그인 시 수동으로 인증을 완료해주세요
  - 이후에는 세션이 유지되어 자동으로 진행됩니다

### CAPTCHA
- 네이버에서 CAPTCHA가 나타나면:
  - 브라우저 창에서 직접 해결해주세요
  - 해결 후 자동으로 계속 진행됩니다

### 헤드리스 모드
- 기본적으로 브라우저 창이 보입니다 (headless: false)
- 이는 디버깅과 CAPTCHA 처리를 위함입니다
- 필요시 코드에서 변경 가능:
  ```typescript
  await automation.initialize(true); // headless mode
  ```

## 5. 문제 해결

### ChromeDriver 버전 불일치
```
Error: SessionNotCreatedException: session not created: This version of ChromeDriver only supports Chrome version XX
```
**해결:** Chrome 브라우저 업데이트 또는 ChromeDriver 버전 변경

### ChromeDriver를 찾을 수 없음
```
Error: WebDriverError: chromedriver not found
```
**해결:** PATH 환경 변수 확인 또는 ChromeDriver 재설치

### 네이버 로그인 실패
```
로그인 실패 또는 추가 인증 필요
```
**해결:** 
- 아이디/비밀번호 확인
- 2단계 인증 완료
- CAPTCHA 수동 해결

### 글 발행 실패
```
블로그 글 발행에 실패했습니다
```
**해결:**
- 네이버 블로그가 활성화되어 있는지 확인
- 블로그 ID가 정확한지 확인
- error-screenshot.png 파일 확인 (자동 생성)

## 6. 고급 설정

### 타임아웃 조정
네트워크가 느린 경우 타임아웃을 늘려야 할 수 있습니다:

```typescript
// src/lib/naver-blog-automation.ts
await this.driver.sleep(5000); // 2000에서 5000으로 증가
```

### 스크린샷 디버깅
오류 발생 시 스크린샷이 자동으로 저장됩니다:
- 저장 위치: 프로젝트 루트/error-screenshot.png
- 수동 스크린샷: 
  ```typescript
  await automation.takeScreenshot('debug.png');
  ```

## 7. API 엔드포인트

### POST /api/publish

**Request:**
```json
{
  "post": {
    "title": "2018년식 메가트럭 서울 급매",
    "content": "차량 기본 정보...",
    "tags": ["#메가트럭", "#서울트럭"]
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
  "error": "네이버 로그인에 실패했습니다..."
}
```

## 8. 성능 최적화

- **병렬 처리 금지**: 한 번에 하나의 발행만 실행
- **브라우저 재사용**: 여러 글을 발행할 경우 브라우저를 재사용하도록 개선 가능
- **세션 유지**: 로그인 세션을 유지하여 반복 로그인 방지

## 참고 자료

- [Selenium WebDriver Documentation](https://www.selenium.dev/documentation/webdriver/)
- [ChromeDriver Downloads](https://chromedriver.chromium.org/downloads)
- [Selenium Manager](https://www.selenium.dev/blog/2022/selenium-manager/)
