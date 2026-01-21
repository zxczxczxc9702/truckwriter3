const { install } = require('@puppeteer/browsers');
const path = require('path');

async function downloadChromeDriver() {
    const cacheDir = path.join(__dirname, '.cache');

    console.log('ChromeDriver 142 다운로드 시도 중...');

    try {
        // 142 버전 시도
        const buildId = '142.0.7444.164';
        console.log(`버전 ${buildId} 다운로드 중...`);

        const result = await install({
            browser: 'chromedriver',
            buildId: buildId,
            cacheDir,
        });

        console.log('✅ ChromeDriver 다운로드 완료!');
        console.log('경로:', result.executablePath);

        const fs = require('fs');
        fs.writeFileSync(
            path.join(__dirname, 'chromedriver-path.txt'),
            result.executablePath
        );
    } catch (error) {
        console.error('❌ 정확한 버전 다운로드 실패. Canary 최신 버전 시도...');
        try {
            // 실패시 최신 Canary 시도 (혹시 142가 Canary라면)
            const result = await install({
                browser: 'chromedriver',
                buildId: 'latest',
                cacheDir,
            });
            console.log('✅ 최신 ChromeDriver 다운로드 완료!');
            console.log('경로:', result.executablePath);
            const fs = require('fs');
            fs.writeFileSync(
                path.join(__dirname, 'chromedriver-path.txt'),
                result.executablePath
            );
        } catch (e) {
            console.error('❌ 다운로드 최종 실패:', e);
            process.exit(1);
        }
    }
}

downloadChromeDriver();
