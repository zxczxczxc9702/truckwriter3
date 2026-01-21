/**
 * 네이버 블로그 예약 발행 테스트 스크립트
 * 
 * 사용법:
 *   node test-scheduled-publish.js
 * 
 * 실행 전에 아래 설정값을 수정하세요!
 */

const { NaverBlogAutomation } = require('./src/lib/naver-blog-automation');

// ============================================
// 🔧 설정값 - 아래 값들을 수정하세요!
// ============================================

const CONFIG = {
    // 네이버 로그인 정보
    credentials: {
        username: 'YOUR_NAVER_ID',      // ← 네이버 아이디 입력
        password: 'YOUR_NAVER_PASSWORD' // ← 네이버 비밀번호 입력
    },

    // 블로그 ID (네이버 블로그 URL에서 확인)
    // 예: https://blog.naver.com/myBlogId 에서 myBlogId
    blogId: 'YOUR_BLOG_ID',  // ← 블로그 ID 입력

    // 테스트 글 내용
    post: {
        title: '[테스트] 예약 발행 테스트 글',
        content: '이 글은 예약 발행 테스트를 위해 작성되었습니다.\n\n자동화 시스템이 정상적으로 동작하는지 확인합니다.',
        tags: ['테스트', '예약발행'],

        // 예약 시간 (ISO 8601 형식)
        // 현재 시간 + 1시간으로 자동 설정됨
        // 직접 지정하려면: scheduledAt: '2026-01-14T10:30:00'
        scheduledAt: getScheduledTime(1) // 1시간 후로 예약
    }
};

// ============================================
// 예약 시간 계산 함수
// ============================================
function getScheduledTime(hoursFromNow) {
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);

    // 분을 10분 단위로 반올림 (네이버는 10분 단위만 지원)
    const minutes = Math.ceil(date.getMinutes() / 10) * 10;
    if (minutes === 60) {
        date.setHours(date.getHours() + 1);
        date.setMinutes(0);
    } else {
        date.setMinutes(minutes);
    }
    date.setSeconds(0);

    return date.toISOString().slice(0, 19); // 예: 2026-01-14T10:30:00
}

// ============================================
// 메인 실행 함수
// ============================================
async function testScheduledPublish() {
    console.log('='.repeat(50));
    console.log('🚀 네이버 블로그 예약 발행 테스트');
    console.log('='.repeat(50));

    // 설정값 확인
    if (CONFIG.credentials.username === 'YOUR_NAVER_ID' ||
        CONFIG.credentials.password === 'YOUR_NAVER_PASSWORD' ||
        CONFIG.blogId === 'YOUR_BLOG_ID') {
        console.error('\n❌ 오류: 설정값을 수정하지 않았습니다!');
        console.error('\ntest-scheduled-publish.js 파일을 열어서 다음 값들을 수정하세요:');
        console.error('  - credentials.username: 네이버 아이디');
        console.error('  - credentials.password: 네이버 비밀번호');
        console.error('  - blogId: 블로그 ID');
        process.exit(1);
    }

    console.log(`\n📋 발행 설정:`);
    console.log(`  - 블로그 ID: ${CONFIG.blogId}`);
    console.log(`  - 제목: ${CONFIG.post.title}`);
    console.log(`  - 예약 시간: ${new Date(CONFIG.post.scheduledAt).toLocaleString('ko-KR')}`);
    console.log('');

    const automation = new NaverBlogAutomation();

    try {
        // 1. 브라우저 초기화
        console.log('📌 [1/4] 브라우저 초기화 중...');
        await automation.initialize(false); // headless=false로 브라우저 창 표시
        console.log('   ✅ 브라우저 초기화 완료\n');

        // 2. 네이버 로그인
        console.log('📌 [2/4] 네이버 로그인 중...');
        console.log('   ⚠️ 캡챠나 2단계 인증이 필요할 수 있습니다. 브라우저 창을 확인하세요.');
        const loginSuccess = await automation.login(CONFIG.credentials);

        if (!loginSuccess) {
            console.error('   ❌ 로그인 실패!');
            console.error('   - 아이디/비밀번호를 확인하세요.');
            console.error('   - 캡챠 또는 2단계 인증이 필요할 수 있습니다.');
            throw new Error('로그인 실패');
        }
        console.log('   ✅ 로그인 성공\n');

        // 3. 글 발행 (예약)
        console.log('📌 [3/4] 예약 발행 진행 중...');
        console.log(`   예약 시간: ${new Date(CONFIG.post.scheduledAt).toLocaleString('ko-KR')}`);

        const publishSuccess = await automation.publishPost(CONFIG.blogId, CONFIG.post);

        if (!publishSuccess) {
            console.error('   ❌ 발행 실패!');
            await automation.takeScreenshot('error-scheduled-publish.png');
            console.error('   스크린샷 저장됨: error-scheduled-publish.png');
            throw new Error('발행 실패');
        }
        console.log('   ✅ 예약 발행 성공!\n');

        // 4. 완료
        console.log('📌 [4/4] 브라우저 종료 중...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        await automation.close();
        console.log('   ✅ 브라우저 종료 완료\n');

        console.log('='.repeat(50));
        console.log('🎉 예약 발행 테스트 완료!');
        console.log(`   예약 시간: ${new Date(CONFIG.post.scheduledAt).toLocaleString('ko-KR')}`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('\n❌ 오류 발생:', error.message);

        try {
            await automation.takeScreenshot('error-screenshot.png');
            console.error('   스크린샷 저장됨: error-screenshot.png');
        } catch (e) { }

        try {
            await automation.close();
        } catch (e) { }

        process.exit(1);
    }
}

// 실행
testScheduledPublish();
