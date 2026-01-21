const { install } = require('@puppeteer/browsers');
const path = require('path');

async function downloadChromeDriver() {
    const cacheDir = path.join(__dirname, '.cache');

    console.log('ChromeDriver 다운로드 중...');

    try {
        const result = await install({
            browser: 'chromedriver',
            buildId: '131.0.6778.87', // 최신 안정 버전
            cacheDir,
        });

        console.log('✅ ChromeDriver 다운로드 완료!');
        console.log('경로:', result.executablePath);

        // 경로를 파일에 저장
        const fs = require('fs');
        fs.writeFileSync(
            path.join(__dirname, 'chromedriver-path.txt'),
            result.executablePath
        );
    } catch (error) {
        console.error('❌ 다운로드 실패:', error);
        process.exit(1);
    }
}

downloadChromeDriver();
