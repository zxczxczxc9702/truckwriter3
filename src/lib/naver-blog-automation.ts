import { Builder, By, until, WebDriver, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import * as path from 'path';

export interface BlogPost {
    title: string;
    content: string;
    tags: string[];
    category?: string;
    images?: string[];
    scheduledAt?: string;  // ISO 8601 형식 예: "2024-01-09T10:00:00"
}

export interface NaverCredentials {
    username: string;
    password: string;
}

export class NaverBlogAutomation {
    private driver: WebDriver | null = null;
    private isLoggedIn = false;

    /**
     * 브라우저 초기화
     */
    async initialize(headless: boolean = false): Promise<void> {
        const options = new chrome.Options();

        // 프로덕션 환경에서는 항상 headless
        const isProduction = process.env.NODE_ENV === 'production';
        if (headless || isProduction) {
            options.addArguments('--headless=new');
        }

        // 봇 탐지 회피를 위한 옵션
        options.addArguments('--disable-blink-features=AutomationControlled');
        options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        options.excludeSwitches('enable-automation');
        options.addArguments('--disable-web-security');
        options.addArguments('--allow-running-insecure-content');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        options.addArguments('--disable-gpu');
        options.addArguments('--window-size=1920,1080');

        // 비밀번호 저장 팝업 및 크레덴셜 관련 팝업 비활성화
        options.addArguments('--disable-save-password-bubble');
        options.addArguments('--disable-translate');
        options.addArguments('--disable-popup-blocking');
        options.setUserPreferences({
            'credentials_enable_service': false,
            'profile.password_manager_enabled': false,
            'autofill.profile_enabled': false
        });

        // 환경변수에서 Chrome 경로 설정 (프로덕션 Linux 환경)
        if (process.env.CHROME_PATH) {
            options.setChromeBinaryPath(process.env.CHROME_PATH);
            console.log(`Chrome 경로 (환경변수): ${process.env.CHROME_PATH}`);
        }

        // ChromeDriver 경로 결정
        let chromedriverPath: string;
        const fs = require('fs');

        // 1. 환경변수에서 ChromeDriver 경로 확인
        if (process.env.CHROMEDRIVER_PATH && fs.existsSync(process.env.CHROMEDRIVER_PATH)) {
            chromedriverPath = process.env.CHROMEDRIVER_PATH;
            console.log(`ChromeDriver 경로 (환경변수): ${chromedriverPath}`);
        }
        // 2. Linux 기본 경로 확인
        else if (fs.existsSync('/usr/bin/chromedriver')) {
            chromedriverPath = '/usr/bin/chromedriver';
            console.log(`ChromeDriver 경로 (시스템): ${chromedriverPath}`);
        }
        // 3. Windows 로컬 경로 확인
        else {
            const localChromedriver = path.join(
                process.cwd(),
                'chromedriver-win64',
                'chromedriver.exe'
            );

            if (fs.existsSync(localChromedriver)) {
                chromedriverPath = localChromedriver;
                console.log(`ChromeDriver 경로 (로컬): ${chromedriverPath}`);
            } else {
                // fallback: npm 패키지 사용
                try {
                    chromedriverPath = require('chromedriver').path;
                    console.log(`ChromeDriver 경로 (npm): ${chromedriverPath}`);
                } catch (e) {
                    throw new Error('ChromeDriver를 찾을 수 없습니다.');
                }
            }
        }

        const service = new chrome.ServiceBuilder(chromedriverPath);

        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .setChromeService(service)
            .build();

        if (!isProduction) {
            await this.driver.manage().window().maximize();
        }
    }

    async login(credentials: NaverCredentials): Promise<boolean> {
        if (!this.driver) {
            throw new Error('Driver not initialized. Call initialize() first.');
        }

        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 2000;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`🔐 로그인 시도 ${attempt}/${MAX_RETRIES}...`);

                await this.driver.get('https://nid.naver.com/nidlogin.login');
                await this.driver.sleep(2000);

                await this.driver.executeScript(`
                document.getElementById('id').value = '${credentials.username}';
                document.getElementById('pw').value = '${credentials.password}';
            `);

                await this.driver.sleep(1000);

                const loginButton = await this.driver.findElement(By.css('.btn_login'));
                await loginButton.click();

                await this.driver.sleep(3000);

                const currentUrl = await this.driver.getCurrentUrl();

                // 캡차 감지
                if (currentUrl.includes('captcha') || currentUrl.includes('security')) {
                    const hasCaptcha = await this.driver.executeScript(`
                    return document.querySelector('#captcha') !== null || 
                           document.querySelector('.captcha_wrapper') !== null ||
                           document.body.innerText.includes('자동입력 방지');
                `);

                    if (hasCaptcha) {
                        console.error('❌ 캡차(보안문자) 감지됨');
                        throw new Error('CAPTCHA_DETECTED: 네이버에서 캡차(보안문자)가 발생했습니다. 웹 브라우저에서 네이버에 직접 로그인하신 후 다시 시도해주세요.');
                    }
                }

                // 2단계 인증 감지
                if (currentUrl.includes('otp') || currentUrl.includes('secondauth') || currentUrl.includes('2step')) {
                    console.error('❌ 2단계 인증 감지됨');
                    throw new Error('TWO_FACTOR_DETECTED: 2단계 인증이 필요한 계정입니다. 네이버 설정에서 2단계 인증을 해제하거나, 다른 계정을 사용해주세요.');
                }

                // OTP 입력 필드 감지
                const hasOtpField = await this.driver.executeScript(`
                return document.querySelector('input[name="otp"]') !== null ||
                       document.querySelector('.otp_input') !== null ||
                       document.body.innerText.includes('일회용 비밀번호');
            `);

                if (hasOtpField) {
                    console.error('❌ 2단계 인증 입력 필드 감지됨');
                    throw new Error('TWO_FACTOR_DETECTED: 2단계 인증이 필요한 계정입니다. 네이버 설정에서 2단계 인증을 해제하거나, 다른 계정을 사용해주세요.');
                }

                // 로그인 성공 여부 확인
                this.isLoggedIn = !currentUrl.includes('nidlogin');

                if (this.isLoggedIn) {
                    console.log('✅ 로그인 성공!');
                    return true;
                }

                // 로그인 실패 - 다음 시도 전 대기
                console.warn(`⚠️ 로그인 실패 (시도 ${attempt}/${MAX_RETRIES})`);

                if (attempt < MAX_RETRIES) {
                    console.log(`⏳ ${RETRY_DELAY_MS / 1000}초 후 재시도...`);
                    await this.driver.sleep(RETRY_DELAY_MS);
                }

            } catch (error) {
                // 캡차나 2FA 에러는 그대로 전달
                if (error instanceof Error &&
                    (error.message.includes('CAPTCHA_DETECTED') || error.message.includes('TWO_FACTOR_DETECTED'))) {
                    throw error;
                }

                console.error(`로그인 시도 ${attempt} 중 오류:`, error);

                if (attempt < MAX_RETRIES) {
                    await this.driver.sleep(RETRY_DELAY_MS);
                }
            }
        }

        console.error('❌ 로그인 최대 재시도 횟수 초과');
        throw new Error('LOGIN_FAILED: 네이버 로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
    }
    async publishPost(blogId: string, post: BlogPost): Promise<boolean> {
        if (!this.driver) {
            throw new Error('Driver not initialized');
        }

        if (!this.isLoggedIn) {
            throw new Error('Not logged in. Call login() first.');
        }

        try {
            await this.driver.get(`https://blog.naver.com/${blogId}/postwrite`);
            await this.driver.sleep(5000);

            console.log('네이버 스마트 에디터 페이지 로딩 완료');

            // "작성 중인 글이 있습니다" 팝업 처리
            try {
                const cancelDraftBtn = await this.driver.wait(
                    until.elementLocated(By.css('.se-popup-button-cancel')),
                    3000
                );
                if (cancelDraftBtn) {
                    console.log('작성 중인 글 팝업 감지 - 취소 클릭');
                    await cancelDraftBtn.click();
                    await this.driver.sleep(1000);
                }
            } catch (e) {
                console.log('팝업 없음 또는 처리 완료');
            }

            // 제목 입력
            console.log('제목 입력 시도...');
            await this.inputTitle(post.title);
            await this.driver.sleep(1000);

            // 본문 영역으로 이동 (Tab 키 또는 클릭)
            console.log('본문 영역으로 이동...');
            await this.focusContentArea();
            await this.driver.sleep(500);

            // 본문 및 이미지/인용구 입력
            console.log('본문 텍스트, 이미지, 인용구 삽입 시작...');

            // 콘텐츠를 청크로 분리 (이미지, 인용구 포함)
            const chunks = this.parseContentChunks(post.content);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                console.log(`청크 ${i + 1}/${chunks.length} 처리 중: ${chunk.type}`);

                if (chunk.type === 'image') {
                    // 이미지 삽입
                    const imageIndex = chunk.imageIndex!;
                    if (post.images && post.images[imageIndex]) {
                        await this.insertImage(post.images[imageIndex], imageIndex);
                    }
                } else if (chunk.type === 'quote') {
                    // 인용구 삽입
                    await this.insertQuote(chunk.content);
                } else {
                    // 일반 텍스트 입력 - 이전 청크가 있었다면 새 줄에서 시작
                    if (i > 0) {
                        await this.driver.actions().sendKeys(Key.ENTER).perform();
                        await this.driver.sleep(200);
                    }
                    await this.inputText(chunk.content);
                }
            }

            console.log('본문 및 이미지 입력 완료');
            await this.driver.sleep(2000);

            // 저장 버튼 클릭 (예약 발행인 경우 예약 시간 전달)
            return await this.clickSaveButton(post.scheduledAt);

        } catch (error) {
            console.error('글 발행 중 오류:', error);
            try {
                await this.takeScreenshot('error-screenshot.png');
            } catch (e) { }
            return false;
        }
    }

    /**
     * 콘텐츠를 청크로 파싱 (텍스트, 이미지, 인용구 분리)
     */
    private parseContentChunks(content: string): Array<{ type: 'text' | 'image' | 'quote', content: string, imageIndex?: number }> {
        const chunks: Array<{ type: 'text' | 'image' | 'quote', content: string, imageIndex?: number }> = [];

        console.log('콘텐츠 파싱 시작...');
        console.log(`원본 콘텐츠 길이: ${content.length}자`);

        // 이미지와 인용구 패턴 - << >> 매칭
        // <<IMAGE_0>>, <<IMAGE_1>>, <<QUOTE>>텍스트<</QUOTE>>
        const pattern = /(<<IMAGE_(\d+)>>|<<QUOTE>>([\s\S]*?)<<\/QUOTE>>)/g;

        let lastIndex = 0;
        let match;
        let matchCount = 0;

        while ((match = pattern.exec(content)) !== null) {
            matchCount++;
            // 매치 이전의 텍스트 추가
            if (match.index > lastIndex) {
                const textBefore = content.slice(lastIndex, match.index).trim();
                if (textBefore) {
                    chunks.push({ type: 'text', content: textBefore });
                    console.log(`텍스트 청크 추가: ${textBefore.slice(0, 50)}...`);
                }
            }

            if (match[1].startsWith('<<IMAGE_')) {
                // 이미지
                const imageIndex = parseInt(match[2]);
                chunks.push({ type: 'image', content: match[1], imageIndex });
                console.log(`이미지 청크 추가: IMAGE_${imageIndex}`);
            } else if (match[1].startsWith('<<QUOTE>>')) {
                // 인용구
                const quoteContent = match[3].trim();
                chunks.push({ type: 'quote', content: quoteContent });
                console.log(`인용구 청크 추가: ${quoteContent.slice(0, 50)}...`);
            }

            lastIndex = match.index + match[0].length;
        }

        // 마지막 텍스트 추가
        if (lastIndex < content.length) {
            const remaining = content.slice(lastIndex).trim();
            if (remaining) {
                chunks.push({ type: 'text', content: remaining });
                console.log(`마지막 텍스트 청크 추가: ${remaining.slice(0, 50)}...`);
            }
        }

        console.log(`총 ${chunks.length}개 청크 생성됨 (매치: ${matchCount}개)`);
        return chunks;
    }

    /**
     * 제목 입력
     */
    private async inputTitle(title: string): Promise<void> {
        try {
            await this.driver!.sleep(2000);

            const titleSelectors = [
                'div.se-title-text',
                'div.se-module-title',
                'input.se-title-input',
                'div[contenteditable="true"]'
            ];

            let titleClicked = false;
            for (const selector of titleSelectors) {
                try {
                    const titleElement = await this.driver!.findElement(By.css(selector));
                    await titleElement.click();
                    console.log(`제목 영역 클릭 성공: ${selector}`);
                    titleClicked = true;
                    break;
                } catch (e) {
                    continue;
                }
            }

            if (!titleClicked) {
                console.warn('제목 영역을 찾을 수 없어 Tab으로 이동 시도');
            }

            await this.driver!.sleep(500);
            await this.driver!.actions().sendKeys(title).perform();
            console.log('제목 입력 완료');
        } catch (e) {
            console.error('제목 입력 실패:', e);
        }
    }

    /**
     * 본문 영역에 포커스
     */
    private async focusContentArea(): Promise<void> {
        const contentSelectors = [
            'div.se-component.se-text.se-l-default p[id^="SE-"]',
            'div.se-component.se-text p',
            'div.se-text-paragraph',
            'p.se-text-paragraph'
        ];

        for (const selector of contentSelectors) {
            try {
                const contentElement = await this.driver!.findElement(By.css(selector));
                await contentElement.click();
                console.log(`본문 영역 포커스 성공: ${selector}`);
                return;
            } catch (e) {
                continue;
            }
        }

        // 못 찾으면 Tab으로 이동
        console.log('본문 영역을 찾지 못해 Tab으로 이동');
        await this.driver!.actions().sendKeys(Key.TAB).perform();
    }

    /**
     * 텍스트 입력 (줄바꿈 처리)
     */
    private async inputText(text: string): Promise<void> {
        try {
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim()) {
                    await this.driver!.actions().sendKeys(line).perform();
                    await this.driver!.sleep(50);
                }
                // 마지막 줄이 아니면 Enter
                if (i < lines.length - 1) {
                    await this.driver!.actions().sendKeys(Key.ENTER).perform();
                    await this.driver!.sleep(50);
                }
            }
        } catch (e) {
            console.error('텍스트 입력 실패:', e);
        }
    }

    /**
     * 이미지 삽입
     */
    private async insertImage(imagePath: string, imageIndex: number): Promise<void> {
        console.log(`이미지 ${imageIndex} 삽입 시도: ${imagePath}`);

        try {
            // 현재 커서 위치에 새 문단 생성 (이미지가 정확한 위치에 삽입되도록)
            await this.driver!.actions().sendKeys(Key.ENTER).perform();
            await this.driver!.sleep(300);

            // 이미지 버튼 클릭
            const imageButtonSelectors = [
                'button.se_photo',
                'button[aria-label*="사진"]',
                'button[data-name="image"]',
                'button.se-toolbar-button-image',
                '.se-toolbar-more-button-image'
            ];

            let imageBtn = null;
            for (const selector of imageButtonSelectors) {
                try {
                    imageBtn = await this.driver!.wait(
                        until.elementLocated(By.css(selector)),
                        3000
                    );
                    console.log(`이미지 버튼 발견: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }

            if (!imageBtn) {
                console.error('이미지 버튼을 찾을 수 없습니다');
                return;
            }

            await imageBtn.click();
            console.log('이미지 버튼 클릭 완료');
            await this.driver!.sleep(3000);

            // 파일 input 찾기
            const fileInputSelectors = [
                'input[type="file"][accept*="image"]',
                'input[type="file"]',
                'input.se-image-input'
            ];

            let fileInput = null;
            for (const selector of fileInputSelectors) {
                try {
                    fileInput = await this.driver!.findElement(By.css(selector));
                    console.log(`파일 input 발견: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }

            if (!fileInput) {
                console.error('파일 input을 찾을 수 없습니다');
                return;
            }

            const absPath = path.resolve(imagePath);
            console.log(`파일 경로: ${absPath}`);
            await fileInput.sendKeys(absPath);

            // 이미지 업로드 완료 대기
            console.log('이미지 업로드 대기 중...');
            await this.driver!.sleep(8000);

            console.log(`이미지 ${imageIndex} 업로드 완료`);

            // 이미지 다이얼로그 닫기 (ESC 키)
            await this.driver!.actions().sendKeys(Key.ESCAPE).perform();
            await this.driver!.sleep(500);

            // 에디터 영역 끝으로 이동하여 이미지 다음에 커서 위치시키기
            // Ctrl+End로 문서 끝으로 이동
            await this.driver!.actions()
                .keyDown(Key.CONTROL)
                .sendKeys(Key.END)
                .keyUp(Key.CONTROL)
                .perform();
            await this.driver!.sleep(300);

            // 새 문단 시작
            await this.driver!.actions().sendKeys(Key.ENTER).perform();
            await this.driver!.sleep(200);

            console.log(`이미지 ${imageIndex} 다음 위치로 커서 이동 완료`);

        } catch (e) {
            console.error(`이미지 ${imageIndex} 업로드 실패:`, e);
        }
    }

    /**
     * 인용구 삽입 (네이버 블로그 인용구 스타일)
     */
    private async insertQuote(quoteText: string): Promise<void> {
        console.log('인용구 삽입 시도...');

        try {
            // 현재 위치에서 새 줄 시작
            await this.driver!.actions().sendKeys(Key.ENTER).perform();
            await this.driver!.sleep(300);

            // 인용구 버튼 찾기
            const quoteButtonSelectors = [
                'button[data-name="quotation"]',
                'button.se-toolbar-button-quotation',
                'button[aria-label*="인용"]',
                'button.se_quote'
            ];

            let quoteBtn = null;
            for (const selector of quoteButtonSelectors) {
                try {
                    quoteBtn = await this.driver!.wait(
                        until.elementLocated(By.css(selector)),
                        3000
                    );
                    console.log(`인용구 버튼 발견: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }

            if (quoteBtn) {
                // 인용구 버튼 클릭
                await quoteBtn.click();
                console.log('인용구 버튼 클릭 완료');
                await this.driver!.sleep(1000);

                // 인용구 스타일 선택 (첫 번째 스타일)
                try {
                    const quoteStyleSelectors = [
                        '.se-quotation-style-item:first-child',
                        '.se-quotation-item:first-child',
                        'button[data-style="style1"]'
                    ];

                    for (const selector of quoteStyleSelectors) {
                        try {
                            const styleBtn = await this.driver!.findElement(By.css(selector));
                            await styleBtn.click();
                            console.log('인용구 스타일 선택 완료');
                            await this.driver!.sleep(500);
                            break;
                        } catch (e) {
                            continue;
                        }
                    }
                } catch (e) {
                    console.log('인용구 스타일 선택 불필요 (기본 스타일 사용)');
                }

                // 인용구 텍스트 입력
                await this.inputText(quoteText);
                console.log('인용구 텍스트 입력 완료');

                // 인용구 모드 종료 - 인용구 블록 밖으로 나가기 (문서 끝 이동 제거)
                await this.driver!.sleep(500);

                // 방법 1: ESC 키로 인용구 편집 모드 나가기
                await this.driver!.actions().sendKeys(Key.ESCAPE).perform();
                await this.driver!.sleep(300);

                // 방법 2: 아래 화살표로 인용구 블록 다음 줄로 이동 (Ctrl+End 대신)
                await this.driver!.actions().sendKeys(Key.ARROW_DOWN).perform();
                await this.driver!.sleep(200);
                await this.driver!.actions().sendKeys(Key.ARROW_DOWN).perform();
                await this.driver!.sleep(200);

                // 방법 3: Enter로 새 문단 시작
                await this.driver!.actions().sendKeys(Key.ENTER).perform();
                await this.driver!.sleep(200);

                console.log('인용구 모드 종료 완료 (인용구 다음 위치로 이동)');

            } else {
                // 인용구 버튼을 못 찾으면 일반 텍스트로 대체 (따옴표로 감싸기)
                console.warn('인용구 버튼을 찾을 수 없어 일반 텍스트로 삽입');
                await this.inputText(`「${quoteText}」`);
            }

        } catch (e) {
            console.error('인용구 삽입 실패:', e);
            // 실패 시 일반 텍스트로 대체
            await this.inputText(`「${quoteText}」`);
        }
    }

    /**
     * 저장 버튼 클릭 (일반 발행 또는 예약 발행)
     */
    private async clickSaveButton(scheduledAt?: string): Promise<boolean> {
        console.log('저장 버튼 클릭 시도...');

        try {
            // 도움말 팝업 닫기
            console.log('도움말 팝업 닫기 시도...');
            try {
                await this.driver!.actions().sendKeys(Key.ESCAPE).perform();
                await this.driver!.sleep(500);

                const helpCloseSelectors = [
                    '.se-help-close',
                    'button[class*="close"]',
                    '.se-popup-close',
                    '[aria-label="닫기"]'
                ];
                for (const selector of helpCloseSelectors) {
                    try {
                        const closeBtn = await this.driver!.findElement(By.css(selector));
                        await closeBtn.click();
                        console.log(`도움말 팝업 닫기 성공: ${selector}`);
                        await this.driver!.sleep(300);
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            } catch (e) {
                console.log('도움말 팝업 없음 또는 닫기 완료');
            }

            // 예약 발행 처리
            if (scheduledAt) {
                console.log(`예약 발행 시간: ${scheduledAt}`);
                console.log('네이버 예약 발행 UI를 통해 예약 설정을 시도합니다.');
                return await this.clickScheduleButton(scheduledAt);
            }

            // 일반 발행 - 저장 버튼 찾기
            const saveButtonSelectors = [
                'button[data-click-area="tpb.save"]',
                'button[class*="save_btn"]',
                'button.save_btn__bzc5B',
            ];

            let publishBtn = null;
            for (const selector of saveButtonSelectors) {
                try {
                    publishBtn = await this.driver!.wait(
                        until.elementLocated(By.css(selector)),
                        5000
                    );
                    console.log(`저장 버튼 발견: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }

            if (!publishBtn) {
                console.error('저장 버튼을 찾을 수 없습니다');
                return false;
            }

            // 버튼이 보이도록 스크롤
            await this.driver!.executeScript('arguments[0].scrollIntoView({block: "center"});', publishBtn);
            await this.driver!.sleep(500);

            // 클릭 시도
            try {
                await publishBtn.click();
                console.log('저장 버튼 클릭 완료 (일반 클릭)');
            } catch (clickError) {
                console.log('일반 클릭 실패, JavaScript 클릭 시도...');
                await this.driver!.executeScript('arguments[0].click();', publishBtn);
                console.log('저장 버튼 클릭 완료 (JavaScript 클릭)');
            }

            await this.driver!.sleep(2000);

            // 발행 확인 버튼
            try {
                const confirmBtn = await this.driver!.wait(
                    until.elementLocated(By.css('.confirm_btn__btn, button.confirm')),
                    3000
                );
                await confirmBtn.click();
            } catch (e) {
                console.log('발행 확인 버튼 없음 (바로 발행됨)');
            }

            console.log('발행 완료!');
            await this.driver!.sleep(3000);
            return true;

        } catch (e) {
            console.error('발행 버튼 클릭 실패:', e);
            return false;
        }
    }

    /**
     * 예약 발행 버튼 클릭
     * 네이버 블로그 에디터의 예약 발행 UI:
     * 1. "발행" 버튼 클릭 (data-click-area="tpb.publish") - 발행 옵션 패널 열기
     * 2. "예약" 라디오 버튼 클릭 (발행 시간 > 예약)
     * 3. 시간/분 드롭다운 선택
     * 4. "발행" 확인 버튼 클릭
     */
    private async clickScheduleButton(scheduledAt: string): Promise<boolean> {
        console.log('예약 발행 시작...');
        console.log(`입력된 예약 시간 문자열: ${scheduledAt}`);

        try {
            // 날짜/시간 파싱 - "2026-01-14T10:30" 형식 직접 파싱
            // new Date()를 사용하면 시간대 문제 발생 가능
            const [datePart, timePart] = scheduledAt.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hours, minutes] = timePart.split(':').map(Number);

            // 분을 10분 단위로 반올림 (네이버는 10분 단위만 지원)
            const roundedMinutes = Math.round(minutes / 10) * 10;
            const finalMinutes = roundedMinutes === 60 ? 50 : roundedMinutes;

            console.log(`파싱된 예약 시간: ${year}년 ${month}월 ${day}일 ${hours}시 ${finalMinutes}분`);

            // 1. 먼저 발행 버튼을 클릭하여 발행 옵션 패널 열기
            console.log('발행 버튼 클릭하여 발행 옵션 패널 열기...');
            const publishButtonSelectors = [
                'button[data-click-area="tpb.publish"]',
                'button.publish_btn__m9KHH',
                'button[class*="publish_btn"]',
                '.publish_btn_area button',
            ];

            let publishBtn = null;
            for (const selector of publishButtonSelectors) {
                try {
                    publishBtn = await this.driver!.wait(
                        until.elementLocated(By.css(selector)),
                        3000
                    );
                    console.log(`발행 버튼 발견: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }

            if (!publishBtn) {
                console.error('발행 버튼을 찾을 수 없습니다');
                return false;
            }

            await this.driver!.executeScript('arguments[0].scrollIntoView({block: "center"});', publishBtn);
            await this.driver!.sleep(500);

            try {
                await publishBtn.click();
            } catch (e) {
                await this.driver!.executeScript('arguments[0].click();', publishBtn);
            }
            console.log('발행 버튼 클릭 완료, 발행 옵션 패널 대기 중...');
            await this.driver!.sleep(2000);

            // 2. "예약" 라디오 버튼 클릭
            console.log('예약 라디오 버튼 클릭...');

            const radioClicked = await this.driver!.executeScript(`
                // 방법 1: data-click-area로 찾기
                let radioBtn = document.querySelector('input[data-click-area="tpb*i.schedule"]');
                if (radioBtn) {
                    radioBtn.click();
                    return 'data-click-area';
                }
                
                // 방법 2: data-testid로 찾기
                radioBtn = document.querySelector('input[data-testid="preTimeRadioBtn"]');
                if (radioBtn) {
                    radioBtn.click();
                    return 'data-testid';
                }
                
                // 방법 3: id로 찾기
                radioBtn = document.querySelector('#radio_time2');
                if (radioBtn) {
                    radioBtn.click();
                    return 'id';
                }
                
                // 방법 4: value로 찾기
                radioBtn = document.querySelector('input[value="pre"][name="radio_time"]');
                if (radioBtn) {
                    radioBtn.click();
                    return 'value';
                }
                
                return null;
            `);

            if (radioClicked) {
                console.log(`예약 라디오 버튼 클릭 완료 (방법: ${radioClicked})`);
            } else {
                console.log('예약 라디오 버튼을 찾을 수 없음');
                return await this.clickPublishConfirmButton();
            }

            await this.driver!.sleep(1500);

            // 3. 날짜 선택 (오늘과 다른 날짜인 경우)
            // jQuery UI Datepicker 사용 (네이버 블로그 에디터)
            const today = new Date();
            const todayDay = today.getDate();
            const todayMonth = today.getMonth() + 1;
            const todayYear = today.getFullYear();

            console.log(`현재 날짜: ${todayYear}년 ${todayMonth}월 ${todayDay}일`);
            console.log(`목표 날짜: ${year}년 ${month}월 ${day}일`);

            // 날짜가 다른 경우에만 날짜 선택 진행
            if (todayYear !== year || todayMonth !== month || todayDay !== day) {
                console.log('날짜 변경 필요, jQuery UI Datepicker로 날짜 선택 시도...');

                // 1. 날짜 입력 필드 클릭하여 달력 열기
                const dateFieldClicked = await this.driver!.executeScript(`
                    // 날짜 입력 필드 셀렉터들
                    const dateInputSelectors = [
                        'input.input_date__QmA0s',
                        '.date__Lkn7S input',
                        'input[readonly][value*="."]',
                        '.hasDatepicker',
                        'input[class*="date"]'
                    ];
                    
                    for (const sel of dateInputSelectors) {
                        const input = document.querySelector(sel);
                        if (input) {
                            input.click();
                            console.log('날짜 입력 필드 클릭:', sel);
                            return { clicked: true, selector: sel, value: input.value };
                        }
                    }
                    return { clicked: false };
                `);

                console.log('날짜 필드 클릭 결과:', dateFieldClicked);
                await this.driver!.sleep(1500);

                // 2. jQuery UI Datepicker에서 월 이동 및 날짜 선택
                const dateClickResult = await this.driver!.executeScript(`
                    const targetYear = ${year};
                    const targetMonth = ${month};
                    const targetDay = ${day};
                    
                    console.log('jQuery UI Datepicker에서 날짜 찾기:', targetYear, targetMonth, targetDay);
                    
                    // jQuery UI Datepicker 확인
                    const datepickerHeader = document.querySelector('.ui-datepicker-header');
                    if (!datepickerHeader) {
                        console.log('jQuery UI Datepicker를 찾을 수 없음');
                        return { success: false, error: 'datepicker not found' };
                    }
                    
                    console.log('jQuery UI Datepicker 발견!');
                    
                    // 현재 달력의 년/월 확인
                    const yearSpan = document.querySelector('.ui-datepicker-year');
                    const monthSpan = document.querySelector('.ui-datepicker-month');
                    
                    let currentYear = yearSpan ? parseInt(yearSpan.textContent) : new Date().getFullYear();
                    let currentMonth = 0;
                    
                    if (monthSpan) {
                        const monthText = monthSpan.textContent.trim();
                        // "1월", "2월" 등에서 숫자 추출
                        const monthMatch = monthText.match(/(\\d+)/);
                        if (monthMatch) {
                            currentMonth = parseInt(monthMatch[1]);
                        }
                    }
                    
                    console.log('현재 달력:', currentYear, '년', currentMonth, '월');
                    console.log('목표:', targetYear, '년', targetMonth, '월', targetDay, '일');
                    
                    // 월 이동 필요 횟수 계산
                    const monthDiff = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
                    console.log('월 이동 필요:', monthDiff, '개월');
                    
                    return { 
                        success: true, 
                        currentYear, 
                        currentMonth, 
                        monthDiff,
                        datepickerFound: true 
                    };
                `);

                console.log('Datepicker 분석 결과:', dateClickResult);

                // 월 이동이 필요한 경우
                const result = dateClickResult as any;
                if (result.success && result.monthDiff !== 0) {
                    const monthDiff = result.monthDiff;
                    console.log(`월 이동 ${monthDiff}회 필요`);

                    for (let i = 0; i < Math.abs(monthDiff); i++) {
                        if (monthDiff > 0) {
                            // 다음 달로 이동
                            await this.driver!.executeScript(`
                                const nextBtn = document.querySelector('.ui-datepicker-next');
                                if (nextBtn && !nextBtn.classList.contains('ui-state-disabled')) {
                                    nextBtn.click();
                                    console.log('다음 달 버튼 클릭');
                                }
                            `);
                        } else {
                            // 이전 달로 이동 (보통 과거 날짜는 disabled)
                            await this.driver!.executeScript(`
                                const prevBtn = document.querySelector('.ui-datepicker-prev');
                                if (prevBtn && !prevBtn.classList.contains('ui-state-disabled')) {
                                    prevBtn.click();
                                    console.log('이전 달 버튼 클릭');
                                }
                            `);
                        }
                        await this.driver!.sleep(500);
                    }
                }

                await this.driver!.sleep(500);

                // 3. 날짜 버튼 클릭 (jQuery UI Datepicker)
                const dayClickResult = await this.driver!.executeScript(`
                    const targetDay = ${day};
                    
                    // jQuery UI Datepicker의 날짜 버튼들
                    // 활성화된 날짜: td 안의 button.ui-state-default (ui-state-disabled가 없는 것)
                    const allDayButtons = document.querySelectorAll('.ui-datepicker-calendar td:not(.ui-state-disabled) button.ui-state-default');
                    
                    console.log('클릭 가능한 날짜 버튼 수:', allDayButtons.length);
                    
                    for (const btn of allDayButtons) {
                        const dayText = btn.textContent.trim();
                        if (dayText === String(targetDay)) {
                            console.log('목표 날짜 버튼 발견:', dayText);
                            btn.click();
                            return { success: true, clickedDay: dayText };
                        }
                    }
                    
                    // 만약 위에서 못 찾았다면, 모든 button.ui-state-default에서 시도
                    const allButtons = document.querySelectorAll('button.ui-state-default');
                    for (const btn of allButtons) {
                        const dayText = btn.textContent.trim();
                        const parentTd = btn.closest('td');
                        // disabled가 아닌 셀의 버튼만
                        if (dayText === String(targetDay) && parentTd && !parentTd.classList.contains('ui-state-disabled')) {
                            console.log('대체 방법으로 날짜 버튼 발견:', dayText);
                            btn.click();
                            return { success: true, clickedDay: dayText, method: 'fallback' };
                        }
                    }
                    
                    return { success: false, error: 'day button not found', targetDay: targetDay };
                `);

                console.log('날짜 클릭 결과:', dayClickResult);
                await this.driver!.sleep(1000);

                // 달력이 닫히지 않았다면 ESC로 닫기
                await this.driver!.actions().sendKeys(Key.ESCAPE).perform();
                await this.driver!.sleep(500);

                // 최종 날짜 값 확인
                const finalDateValue = await this.driver!.executeScript(`
                    const dateInputSelectors = [
                        'input.input_date__QmA0s',
                        '.date__Lkn7S input',
                        'input[readonly][value*="."]'
                    ];
                    for (const sel of dateInputSelectors) {
                        const input = document.querySelector(sel);
                        if (input) return input.value;
                    }
                    return null;
                `);
                console.log('최종 설정된 날짜:', finalDateValue);
            } else {
                console.log('오늘 날짜로 예약, 날짜 변경 불필요');
            }

            // 날짜 선택 후 발행 패널이 닫혔을 수 있으므로 확인
            const panelCheckBeforeTime = await this.driver!.executeScript(`
                const hourSelect = document.querySelector('select.hour_option__J_heO');
                const publishPanel = document.querySelector('button[data-testid="seOnePublishBtn"]');
                return { 
                    hourSelectExists: hourSelect !== null,
                    hourSelectVisible: hourSelect && hourSelect.offsetParent !== null,
                    panelVisible: publishPanel && publishPanel.offsetParent !== null
                };
            `);
            console.log('시간 선택 전 패널 상태:', panelCheckBeforeTime);

            // 패널이 닫혀있으면 다시 열기
            if (!(panelCheckBeforeTime as any).hourSelectVisible) {
                console.log('⚠️ 시간 select가 보이지 않음. 발행 패널 다시 열기...');

                await this.driver!.executeScript(`
                    const publishBtn = document.querySelector('button[data-click-area="tpb.publish"]');
                    if (publishBtn) publishBtn.click();
                `);
                await this.driver!.sleep(2000);

                await this.driver!.executeScript(`
                    const radioBtn = document.querySelector('input[data-click-area="tpb*i.schedule"]');
                    if (radioBtn) radioBtn.click();
                `);
                await this.driver!.sleep(1500);
            }

            // 4. 시간 드롭다운 선택 - 정확한 셀렉터 사용
            const hourValue = String(hours).padStart(2, '0');
            console.log(`시간 선택 시도: ${hourValue}시`);

            const hourSelected = await this.driver!.executeScript(`
                // 정확한 셀렉터로 시간 select 찾기
                const select = document.querySelector('select.hour_option__J_heO') ||
                               document.querySelector('.hour__ckNMb select') ||
                               document.querySelector('select[title*="시간"]');
                
                if (select) {
                    console.log('시간 select 발견:', select.className);
                    
                    // 타겟 시간
                    const targetValue = "${hourValue}";
                    
                    // selectedIndex로 직접 설정
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === targetValue) {
                            select.selectedIndex = i;
                            
                            // React 호환 방식으로도 값 설정
                            const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
                                window.HTMLSelectElement.prototype, 'value'
                            ).set;
                            nativeSelectValueSetter.call(select, targetValue);
                            
                            // 이벤트 트리거
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                            select.dispatchEvent(new Event('input', { bubbles: true }));
                            
                            console.log('시간 설정 완료:', select.value);
                            return { success: true, value: select.value };
                        }
                    }
                    return { success: false, error: 'option not found', target: targetValue };
                }
                return { success: false, error: '시간 select를 찾을 수 없음' };
            `);

            console.log('시간 선택 결과:', hourSelected);
            await this.driver!.sleep(500);

            // 5. 분 드롭다운 선택 - 정확한 셀렉터 사용
            const minuteValue = String(finalMinutes).padStart(2, '0');
            console.log(`분 선택 시도: ${minuteValue}분`);

            const minuteSelected = await this.driver!.executeScript(`
                // 정확한 셀렉터로 분 select 찾기
                const select = document.querySelector('select.minute_option__Vb3xB') ||
                               document.querySelector('.minute__KXXvZ select') ||
                               document.querySelector('select[title*="분"]');
                
                if (select) {
                    console.log('분 select 발견:', select.className);
                    
                    // 타겟 분
                    const targetValue = "${minuteValue}";
                    
                    // selectedIndex로 직접 설정
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === targetValue) {
                            select.selectedIndex = i;
                            
                            // React 호환 방식으로도 값 설정
                            const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
                                window.HTMLSelectElement.prototype, 'value'
                            ).set;
                            nativeSelectValueSetter.call(select, targetValue);
                            
                            // 이벤트 트리거
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                            select.dispatchEvent(new Event('input', { bubbles: true }));
                            
                            console.log('분 설정 완료:', select.value);
                            return { success: true, value: select.value };
                        }
                    }
                    return { success: false, error: 'option not found', target: targetValue };
                }
                return { success: false, error: '분 select를 찾을 수 없음' };
            `);

            console.log('분 선택 결과:', minuteSelected);
            await this.driver!.sleep(500);

            // 최종 확인 - 실제 설정된 값 검증
            const verifyResult = await this.driver!.executeScript(`
const allSelects = document.querySelectorAll('select');
const values = {};
allSelects.forEach((s, i) => {
    values['select_' + i] = {
        className: s.className,
        value: s.value,
        optionsCount: s.options.length
    };
});
return values;
`);
            console.log('설정된 select 값들:', verifyResult);
            console.log(`✅ 예약 시간 설정 완료: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${hourValue}:${minuteValue}`);

            // 발행 전 스크린샷 저장 (디버깅용)
            try {
                await this.takeScreenshot('before-schedule-publish.png');
                console.log('📸 발행 전 스크린샷 저장됨: before-schedule-publish.png');
            } catch (e) {
                console.log('발행 전 스크린샷 저장 실패');
            }

            // 발행 패널이 닫혔는지 확인하고, 닫혔으면 다시 열기
            const panelCheck = await this.driver!.executeScript(`
// 발행 확인 버튼이 화면에 있는지 확인
const confirmBtn = document.querySelector('button[data-testid="seOnePublishBtn"]');
const confirmBtnByClass = document.querySelector('button[class*="confirm_btn"]');
const panelOpen = (confirmBtn && confirmBtn.offsetParent !== null) ||
    (confirmBtnByClass && confirmBtnByClass.offsetParent !== null);

// 예약 라디오가 선택되어 있는지도 확인
const scheduleRadio = document.querySelector('input[data-click-area="tpb*i.schedule"]');
const scheduleSelected = scheduleRadio && scheduleRadio.checked;

return { panelOpen, scheduleSelected };
`);

            console.log('패널 상태 확인:', panelCheck);

            // 패널이 닫혀있으면 다시 열기
            if (!(panelCheck as any).panelOpen) {
                console.log('⚠️ 발행 패널이 닫혔습니다. 다시 열기 시도...');

                // 발행 버튼 다시 클릭해서 패널 열기
                const panelReopened = await this.driver!.executeScript(`
const publishBtn = document.querySelector('button[data-click-area="tpb.publish"]');
if (publishBtn) {
    publishBtn.click();
    return true;
}
return false;
`);

                if (panelReopened) {
                    console.log('발행 버튼 다시 클릭 완료, 패널 대기 중...');
                    await this.driver!.sleep(2000);

                    // 예약 라디오 다시 선택
                    const radioClicked = await this.driver!.executeScript(`
const radioBtn = document.querySelector('input[data-click-area="tpb*i.schedule"]');
if (radioBtn) {
    radioBtn.click();
    return true;
}
return false;
`);

                    if (radioClicked) {
                        console.log('예약 라디오 다시 선택 완료');
                        await this.driver!.sleep(1000);
                    }
                }
            }

            await this.driver!.sleep(500);

            // 6. 발행 확인 버튼 클릭
            const publishResult = await this.clickPublishConfirmButton();

            // 7. 발행 후 확인 - 스크린샷 저장
            if (publishResult) {
                try {
                    await this.driver!.sleep(2000);
                    await this.takeScreenshot('scheduled-publish-result.png');
                    console.log('📸 발행 결과 스크린샷 저장됨: scheduled-publish-result.png');
                } catch (e) {
                    console.log('스크린샷 저장 실패');
                }
            }

            return publishResult;

        } catch (e) {
            console.error('예약 발행 실패:', e);
            console.log('일반 발행으로 대체합니다...');
            return await this.clickSaveButton();
        }
    }

    /**
     * 발행 확인 버튼 클릭 (예약/즉시 발행 공통)
     * 네이버 블로그 에디터의 예약 발행 확인 버튼을 찾아 클릭
     */
    private async clickPublishConfirmButton(): Promise<boolean> {
        console.log('발행 확인 버튼 클릭 시도...');

        // 버튼이 활성화될 때까지 충분히 대기
        await this.driver!.sleep(2000);

        // 스크린샷 저장
        try {
            await this.takeScreenshot('before-confirm-click.png');
            console.log('📸 확인 버튼 클릭 전 스크린샷: before-confirm-click.png');
        } catch (e) { }

        // JavaScript로 정확한 셀렉터로 직접 버튼 클릭
        // 사용자가 제공한 HTML 구조:
        // <div class="btn_area__fO7mp">
        //   <button class="confirm_btn__WEaBq" data-testid="seOnePublishBtn" data-click-area="tpb*i.publish">
        //     <span class="text__sraQE">발행</span>
        //   </button>
        // </div>
        try {
            const result = await this.driver!.executeScript(`
console.log('정확한 셀렉터로 발행 버튼 검색...');

// 1. data-testid로 정확히 찾기 (가장 확실)
let btn = document.querySelector('button[data-testid="seOnePublishBtn"]');
if (btn && btn.offsetParent !== null) {
    console.log('data-testid로 발행 버튼 발견!');
    btn.click();
    return { success: true, method: 'data-testid', className: btn.className };
}

// 2. data-click-area로 찾기
btn = document.querySelector('button[data-click-area="tpb*i.publish"]');
if (btn && btn.offsetParent !== null) {
    console.log('data-click-area로 발행 버튼 발견!');
    btn.click();
    return { success: true, method: 'data-click-area', className: btn.className };
}

// 3. 정확한 클래스명으로 찾기
btn = document.querySelector('button.confirm_btn__WEaBq');
if (btn && btn.offsetParent !== null) {
    console.log('confirm_btn 클래스로 발행 버튼 발견!');
    btn.click();
    return { success: true, method: 'confirm_btn class', className: btn.className };
}

// 4. btn_area 내의 버튼 찾기 (텍스트 확인)
const btnArea = document.querySelector('.btn_area__fO7mp');
if (btnArea) {
    const buttons = btnArea.querySelectorAll('button');
    for (const b of buttons) {
        const textSpan = b.querySelector('.text__sraQE');
        const text = textSpan ? textSpan.textContent.trim() : b.textContent.trim();
        if (text === '발행' && b.offsetParent !== null) {
            console.log('btn_area 내 발행 버튼 발견!');
            b.click();
            return { success: true, method: 'btn_area', text: text };
        }
    }
}

// 5. 부분 클래스명으로 찾기 (해시가 다를 수 있음)
btn = document.querySelector('button[class*="confirm_btn"]');
if (btn && btn.offsetParent !== null) {
    // 텍스트가 "발행"인지 확인
    const text = btn.textContent.trim();
    if (text === '발행' || text.includes('발행')) {
        console.log('부분 클래스로 발행 버튼 발견!');
        btn.click();
        return { success: true, method: 'partial class', text: text };
    }
}

// 6. 화면의 모든 버튼 중 발행 패널 내 버튼 찾기
const allBtns = document.querySelectorAll('button');
const publishBtns = [];

for (const b of allBtns) {
    const text = b.textContent.trim();
    if (text === '발행' && b.offsetParent !== null && !b.disabled) {
        publishBtns.push({ el: b, className: b.className });
    }
}

console.log('화면의 발행 버튼 수:', publishBtns.length);

// confirm_btn 클래스를 가진 버튼 우선
for (const p of publishBtns) {
    if (p.className.includes('confirm')) {
        p.el.click();
        return { success: true, method: 'confirm class priority', className: p.className };
    }
}

// 두 번째 발행 버튼 (첫 번째는 상단 툴바)
if (publishBtns.length >= 2) {
    publishBtns[1].el.click();
    return { success: true, method: 'second button', className: publishBtns[1].className };
}

return { success: false, error: '발행 확인 버튼을 찾을 수 없음', buttonCount: publishBtns.length };
`);

            console.log('발행 버튼 클릭 결과:', result);

            if (result && (result as any).success) {
                console.log(`✅ 발행 확인 버튼 클릭 성공!(방법: ${(result as any).method})`);
                await this.driver!.sleep(3000);
                await this.takeScreenshot('after-confirm-click.png');
                console.log('✅ 예약 발행 완료!');
                return true;
            }
        } catch (e) {
            console.error('JavaScript 발행 버튼 검색 실패:', e);
        }

        // 최종 스크린샷 (실패 시)
        try {
            await this.takeScreenshot('publish-button-not-found.png');
            console.log('📸 실패 스크린샷: publish-button-not-found.png');
        } catch (e) { }

        console.log('❌ 발행 확인 버튼을 찾을 수 없음');
        return false;
    }

    async takeScreenshot(filename: string = 'screenshot.png'): Promise<void> {
        if (!this.driver) {
            throw new Error('Driver not initialized');
        }

        const screenshot = await this.driver.takeScreenshot();
        const fs = require('fs');
        fs.writeFileSync(filename, screenshot, 'base64');
        console.log(`스크린샷 저장됨: ${filename} `);
    }

    /**
     * 브라우저 종료
     */
    async close(): Promise<void> {
        if (this.driver) {
            await this.driver.quit();
            this.driver = null;
            this.isLoggedIn = false;
            console.log('브라우저 종료됨');
        }
    }
}
