const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const fs = require('fs');

// ChromeDriver 경로 (프로젝트에 다운로드된 Chrome 144 호환 버전 사용)
const CHROMEDRIVER_PATH = path.join(__dirname, '..', 'chromedriver-win64', 'chromedriver.exe');

/**
 * 네이버 블로그에 글 발행 (이미지, 인용구, 예약 발행 지원)
 */
async function publishToBlog(post, credentials, blogId) {
    let driver = null;

    try {
        console.log('Chrome 드라이버 시작...');
        console.log('ChromeDriver 경로:', CHROMEDRIVER_PATH);

        // Chrome 옵션 설정
        const options = new chrome.Options();
        options.addArguments('--start-maximized');
        options.addArguments('--disable-blink-features=AutomationControlled');
        options.setUserPreferences({
            'credentials_enable_service': false,
            'profile.password_manager_enabled': false
        });

        // ChromeDriver 서비스 설정 (프로젝트 내 드라이버 사용)
        const service = new chrome.ServiceBuilder(CHROMEDRIVER_PATH);

        // 드라이버 생성
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .setChromeService(service)
            .build();

        console.log('네이버 로그인 페이지 이동...');
        await driver.get('https://nid.naver.com/nidlogin.login');
        await driver.sleep(2000);

        // 로그인
        console.log('로그인 중...');
        const idInput = await driver.findElement(By.id('id'));
        const pwInput = await driver.findElement(By.id('pw'));

        // JavaScript로 입력 (자동화 탐지 우회)
        await driver.executeScript(`arguments[0].value = '${credentials.username}'`, idInput);
        await driver.executeScript(`arguments[0].value = '${credentials.password}'`, pwInput);

        await driver.sleep(500);

        // 로그인 버튼 클릭
        const loginBtn = await driver.findElement(By.id('log.login'));
        await loginBtn.click();

        // 로그인 결과 확인
        await driver.sleep(3000);
        const currentUrl = await driver.getCurrentUrl();

        if (currentUrl.includes('nidlogin')) {
            throw new Error('LOGIN_FAILED: 네이버 로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
        }

        console.log('블로그 에디터 이동...');
        await driver.get(`https://blog.naver.com/${blogId}/postwrite`);
        await driver.sleep(3000);

        // 스마트에디터 iframe 찾기
        let editorFrame = null;
        try {
            editorFrame = await driver.wait(
                until.elementLocated(By.css('iframe#mainFrame')),
                10000
            );
            await driver.switchTo().frame(editorFrame);
        } catch (e) {
            console.log('메인 프레임 없음, 직접 에디터 접근');
        }

        // 제목 입력
        console.log('제목 입력...');
        try {
            const titleInput = await driver.wait(
                until.elementLocated(By.css('.se-title-input, input[placeholder*="제목"], .title input')),
                10000
            );
            await titleInput.clear();
            await titleInput.sendKeys(post.title);
        } catch (e) {
            console.log('제목 입력 실패:', e.message);
        }

        // 이미지 및 썸네일 처리 준비
        const imagesToUpload = [];
        if (post.thumbnail && post.thumbnail.path) {
            imagesToUpload.push(post.thumbnail.path);
        }
        if (post.images && post.images.length > 0) {
            post.images.forEach(img => {
                if (img.path) imagesToUpload.push(img.path);
            });
        }

        // 1. 이미지 삽입 (본문 입력 전에 수행)
        if (imagesToUpload.length > 0) {
            console.log(`총 ${imagesToUpload.length}장 이미지(썸네일 포함) 삽입 시도...`);
            try {
                // Main Frame으로 전환
                await driver.switchTo().defaultContent();
                try {
                    const mainFrame = await driver.findElement(By.css('iframe#mainFrame'));
                    await driver.switchTo().frame(mainFrame);
                } catch (e) {
                    console.log('mainFrame 전환 실패 (이미 해당 프레임일 수 있음)');
                }

                // 이미지 버튼 찾기
                const imageBtn = await driver.findElement(By.css('button.se-image-toolbar-button, button[data-name="image"], .se-image-button'));
                await imageBtn.click();
                await driver.sleep(1000);

                // 파일 업로드
                const fileInputs = await driver.findElements(By.css('input[type="file"]'));
                if (fileInputs.length > 0) {
                    const fileInput = fileInputs[0];
                    for (const imgPath of imagesToUpload) {
                        if (fs.existsSync(imgPath)) {
                            await fileInput.sendKeys(imgPath);
                            await driver.sleep(1500);
                        }
                    }
                }
                console.log('이미지 삽입 완료');
            } catch (e) {
                console.log('이미지 삽입 실패:', e.message);
            }
        }

        await driver.sleep(1000);

        // 2. 본문 입력 (이미지 삽입 후)
        console.log('본문 입력...');
        try {
            await driver.switchTo().defaultContent();
            try {
                const mainFrame = await driver.findElement(By.css('iframe#mainFrame'));
                await driver.switchTo().frame(mainFrame);
            } catch (e) { }

            // 본문 영역 찾기
            const contentArea = await driver.wait(
                until.elementLocated(By.css('.se-text-paragraph, .se-component-content, [contenteditable="true"]')),
                10000
            );
            await contentArea.click();

            // 맨 아래로 이동
            await contentArea.sendKeys(Key.CONTROL, Key.END);
            await contentArea.sendKeys(Key.ENTER);
            await driver.sleep(500);

            // 본문 내용 정리 (HTML 태그 제거)
            const cleanContent = post.content
                .replace(/<[^>]*>/g, '')
                .replace(/<<[^>]+>>/g, '');

            // 줄 단위로 입력
            const lines = cleanContent.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    await contentArea.sendKeys(line);
                }
                await contentArea.sendKeys(Key.ENTER);
            }
        } catch (e) {
            console.log('본문 입력 실패:', e.message);
        }

        // 발행 버튼 클릭 (상단 발행 버튼)
        console.log('발행 버튼 클릭 준비...');
        await driver.sleep(2000);

        try {
            // 팝업/딤 요소 제거 시도 (발행 버튼을 가리는 요소가 있다면)
            await driver.switchTo().defaultContent();
            try {
                await driver.executeScript(`
                    const dims = document.querySelectorAll('.se-popup-dim, .se-help-panel, .se-popup-button-close, .se-popup-dim-white');
                    dims.forEach(el => el.remove());
                `);
            } catch (e) { }

            let publishBtn = null;

            // 시도 1: Main Frame 내부에서 찾기
            console.log('발행 버튼 찾기: 시도 1 (iframe 내부)');
            try {
                await driver.switchTo().defaultContent();
                const mainFrame = await driver.findElement(By.css('iframe#mainFrame'));
                await driver.switchTo().frame(mainFrame);

                // iframe 내부에서도 딤 제거 시도
                try {
                    await driver.executeScript(`
                        const dims = document.querySelectorAll('.se-popup-dim, .se-help-panel, .se-popup-button-close, .se-popup-dim-white');
                        dims.forEach(el => el.remove());
                    `);
                } catch (e) { }

                const btn = await driver.findElement(By.css('button[data-click-area="tpb.publish"], button.publish_btn__m9KHH, button[class*="publish_btn"]'));
                if (btn) {
                    publishBtn = btn;
                    console.log('iframe 내부에서 발행 버튼 찾음');
                }
            } catch (e) {
                console.log('iframe 내부 찾기 실패:', e.message);
            }

            // 시도 2: Default Content에서 찾기
            if (!publishBtn) {
                console.log('발행 버튼 찾기: 시도 2 (Default Content)');
                try {
                    await driver.switchTo().defaultContent();
                    const btn = await driver.findElement(By.css('button[data-click-area="tpb.publish"], button.publish_btn__m9KHH, button[class*="publish_btn"]'));
                    if (btn) {
                        publishBtn = btn;
                        console.log('Default Content에서 발행 버튼 찾음');
                    }
                } catch (e) {
                    console.log('Default Content 찾기 실패:', e.message);
                }
            }

            if (!publishBtn) {
                // 한 번 더 mainFrame 시도 (시간차 로딩 고려)
                console.log('발행 버튼 찾기: 재시도 (iframe 내부)');
                await driver.sleep(2000);
                try {
                    await driver.switchTo().defaultContent();
                    const mainFrame = await driver.findElement(By.css('iframe#mainFrame'));
                    await driver.switchTo().frame(mainFrame);
                    const btn = await driver.findElement(By.css('button[class*="publish_btn"]'));
                    if (btn) publishBtn = btn;
                } catch (e) { }
            }

            if (!publishBtn) {
                throw new Error('발행 버튼을 찾을 수 없습니다.');
            }

            // JavaScript로 강제 클릭 (가려짐 방지)
            try {
                console.log('발행 버튼 JS 강제 클릭 시도...');
                await driver.executeScript("arguments[0].click();", publishBtn);
                console.log('발행 버튼 JS 강제 클릭 완료');
            } catch (e) {
                console.log('JS 클릭 실패, 일반 클릭 시도:', e.message);
                await publishBtn.click();
            }

            await driver.sleep(2000);

            // 예약 발행 설정
            if (post.schedule && post.schedule.date && post.schedule.time) {
                console.log(`예약 발행 설정: ${post.schedule.date} ${post.schedule.time}`);

                try {
                    // 예약 라디오 버튼 클릭
                    // 안전하게 다시 Main Frame으로 진입 시도
                    await driver.switchTo().defaultContent();
                    try {
                        const mainFrame = await driver.findElement(By.css('iframe#mainFrame'));
                        await driver.switchTo().frame(mainFrame);
                    } catch (e) { }

                    const scheduleRadio = await driver.wait(
                        until.elementLocated(By.css('label[for="radio_time2"], label.radio_label__mB6ia[for="radio_time2"]')),
                        5000
                    );
                    // 라디오 버튼도 JS로 클릭
                    await driver.executeScript("arguments[0].click();", scheduleRadio);
                    await driver.sleep(1000);

                    // 날짜 설정
                    const [year, month, day] = post.schedule.date.split('-');
                    await driver.executeScript(`
                        const input = document.querySelector('input.input_date__QmA0s, div.date__Lkn7S input');
                        if (input) input.value = '${year}. ${month}. ${day}';
                    `);
                    await driver.sleep(500);

                    // 시간 설정
                    const [hour, minute] = post.schedule.time.split(':');
                    const hourSelect = await driver.findElement(By.css('select.hour_option__J_heO, div.hour__ckNMb select'));
                    await hourSelect.sendKeys(hour);

                    const minuteSelect = await driver.findElement(By.css('select.minute_option__Vb3xB'));
                    const roundedMinute = Math.floor(parseInt(minute) / 10) * 10;
                    await minuteSelect.sendKeys(String(roundedMinute).padStart(2, '0'));

                    console.log('예약 설정 완료');
                } catch (e) {
                    console.log('예약 발행 설정 실패 (즉시 발행):', e.message);
                }
            }

            // 최종 발행 확인 버튼 클릭
            await driver.sleep(1000);
            try {
                // 안전하게 다시 Main Frame 확인
                await driver.switchTo().defaultContent();
                try {
                    const mainFrame = await driver.findElement(By.css('iframe#mainFrame'));
                    await driver.switchTo().frame(mainFrame);
                } catch (e) { }

                const confirmBtn = await driver.wait(
                    until.elementLocated(By.css('button.confirm_btn__WEaBq, button[data-testid="seOnePublishBtn"], button[data-click-area*="publish"]')),
                    5000
                );
                // 확인 버튼도 강제 클릭
                try {
                    await driver.executeScript("arguments[0].click();", confirmBtn);
                } catch (e) {
                    await confirmBtn.click();
                }
                console.log('최종 발행 버튼 클릭');
            } catch (e) {
                console.log('최종 발행 버튼 찾기 실패:', e.message);

                // Default content에서 재시도
                await driver.switchTo().defaultContent();
                try {
                    const confirmBtn = await driver.findElement(By.css('button.confirm_btn__WEaBq, button[class*="confirm_btn"]'));
                    await confirmBtn.click();
                    console.log('최종 발행 버튼 클릭 (Default Content)');
                } catch (e2) {
                    throw new Error('최종 발행 버튼을 찾을 수 없습니다.');
                }
            }

            await driver.sleep(3000);

            // 발행 성공 여부 검증
            console.log('발행 성공 여부 검증...');
            await driver.switchTo().defaultContent();

            // 5초간 발행 완료 확인 시도
            let publishSuccess = false;
            let attempts = 0;
            const maxAttempts = 10;

            while (!publishSuccess && attempts < maxAttempts) {
                attempts++;
                await driver.sleep(500);

                const currentUrl = await driver.getCurrentUrl();
                console.log(`검증 시도 ${attempts}: URL = ${currentUrl}`);

                // 발행 성공 시 URL이 블로그 글 페이지로 변경됨
                // 예: https://blog.naver.com/blogId/223xxxxx 형태
                if (currentUrl.includes(`blog.naver.com/${blogId}/`) &&
                    !currentUrl.includes('postwrite') &&
                    !currentUrl.includes('PostWrite')) {
                    publishSuccess = true;
                    console.log('발행 성공 확인: URL이 블로그 글 페이지로 변경됨');
                    break;
                }

                // 다른 성공 지표: "발행되었습니다" 또는 성공 모달
                try {
                    await driver.switchTo().defaultContent();
                    try {
                        const mainFrame = await driver.findElement(By.css('iframe#mainFrame'));
                        await driver.switchTo().frame(mainFrame);
                    } catch (e) { }

                    const successMessage = await driver.findElements(By.xpath("//*[contains(text(), '발행되었습니다') or contains(text(), '예약발행')]"));
                    if (successMessage.length > 0) {
                        publishSuccess = true;
                        console.log('발행 성공 확인: 성공 메시지 발견');
                        break;
                    }
                } catch (e) { }
            }

            if (!publishSuccess) {
                // 마지막으로 에디터 페이지에 여전히 있는지 확인
                const finalUrl = await driver.getCurrentUrl();
                if (finalUrl.includes('postwrite') || finalUrl.includes('PostWrite')) {
                    throw new Error('발행이 완료되지 않았습니다. 에디터 페이지에 머물러 있습니다. 네이버 제한(로봇 방지) 또는 입력 오류일 수 있습니다.');
                }
            }

            console.log('발행 완료!');
            return { success: true, message: '블로그에 발행되었습니다.' };

        } catch (e) {
            console.log('발행 프로세스 실패:', e.message);
            throw new Error(`PUBLISH_FAILED: ${e.message}`);
        }

    } catch (error) {
        console.error('발행 오류:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

module.exports = { publishToBlog };
