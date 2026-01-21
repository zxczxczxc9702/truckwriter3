const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

/**
 * 네이버 블로그에 글 발행
 */
async function publishToBlog(post, credentials, blogId) {
    let driver = null;

    try {
        console.log('Chrome 드라이버 시작...');

        // Chrome 옵션 설정
        const options = new chrome.Options();
        options.addArguments('--start-maximized');
        options.addArguments('--disable-blink-features=AutomationControlled');
        options.setUserPreferences({
            'credentials_enable_service': false,
            'profile.password_manager_enabled': false
        });

        // 드라이버 생성
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
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

        // 본문 입력
        console.log('본문 입력...');
        try {
            const contentArea = await driver.wait(
                until.elementLocated(By.css('.se-text-paragraph, .se-component-content, [contenteditable="true"]')),
                10000
            );
            await contentArea.click();

            // 본문 내용 정리 (HTML 태그 제거)
            const cleanContent = post.content
                .replace(/<[^>]*>/g, '')
                .replace(/<<[^>]+>>/g, ''); // 이미지 플레이스홀더 제거

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

        // 발행 버튼 클릭
        console.log('발행 버튼 클릭...');
        await driver.sleep(1000);

        try {
            // 메인 프레임으로 복귀
            await driver.switchTo().defaultContent();

            const publishBtn = await driver.wait(
                until.elementLocated(By.css('button.publish_btn__, button[class*="publish"], .btn_publish')),
                10000
            );
            await publishBtn.click();

            await driver.sleep(2000);

            // 확인 버튼 클릭 (있으면)
            try {
                const confirmBtn = await driver.findElement(By.css('.btn_ok, button[class*="confirm"]'));
                await confirmBtn.click();
            } catch (e) {
                // 확인 버튼 없음
            }

            await driver.sleep(3000);

            console.log('발행 완료!');
            return { success: true, message: '블로그에 발행되었습니다.' };

        } catch (e) {
            console.log('발행 버튼 클릭 실패:', e.message);
            throw new Error('PUBLISH_FAILED: 발행 버튼을 찾을 수 없습니다.');
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
