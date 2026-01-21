/**
 * ChromeDriver 테스트 스크립트
 * Chrome 브라우저가 Selenium과 함께 정상 동작하는지 확인합니다.
 */
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');

async function testChromeDriver() {
    let driver;

    console.log('=== ChromeDriver 테스트 시작 ===\n');

    try {
        // Chrome 옵션 설정
        const options = new chrome.Options();
        options.addArguments('--disable-blink-features=AutomationControlled');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');

        // 로컬 ChromeDriver 경로 설정
        const chromedriverPath = path.join(process.cwd(), 'chromedriver-win64', 'chromedriver.exe');
        console.log(`ChromeDriver 경로: ${chromedriverPath}`);

        const service = new chrome.ServiceBuilder(chromedriverPath);

        // 브라우저 시작
        console.log('Chrome 브라우저 시작 중...');
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .setChromeService(service)
            .build();

        console.log('✅ Chrome 브라우저 시작 성공!');

        // 테스트 페이지 열기
        console.log('Google 페이지 로딩 중...');
        await driver.get('https://www.google.com');
        await driver.sleep(2000);

        // 페이지 타이틀 확인
        const title = await driver.getTitle();
        console.log(`✅ 페이지 타이틀: ${title}`);

        // 현재 URL 확인
        const currentUrl = await driver.getCurrentUrl();
        console.log(`✅ 현재 URL: ${currentUrl}`);

        console.log('\n=== ChromeDriver 테스트 성공! ===');
        console.log('Selenium과 ChromeDriver가 정상적으로 동작합니다.');

    } catch (error) {
        console.error('\n❌ ChromeDriver 테스트 실패!');
        console.error('에러 메시지:', error.message);

        if (error.message.includes('session not created')) {
            console.error('\n💡 해결 방법:');
            console.error('   - Chrome 브라우저와 ChromeDriver 버전이 일치하는지 확인하세요.');
            console.error('   - Chrome 브라우저를 최신 버전으로 업데이트해보세요.');
        }

        process.exit(1);
    } finally {
        // 브라우저 종료
        if (driver) {
            console.log('\nChrome 브라우저 종료 중...');
            await driver.quit();
            console.log('브라우저 종료 완료');
        }
    }
}

testChromeDriver();
