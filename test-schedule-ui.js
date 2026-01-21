/**
 * 네이버 블로그 예약 발행 UI 테스트 스크립트
 * 네이버 블로그 에디터의 예약 발행 UI를 분석합니다.
 */
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

async function testScheduleUI() {
    let driver;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    console.log('=== 네이버 블로그 예약 발행 UI 테스트 ===\n');

    // 환경 변수에서 네이버 계정 정보 읽기
    require('dotenv').config({ path: '.env.local' });

    const username = await question('네이버 아이디를 입력하세요: ');
    const password = await question('네이버 비밀번호를 입력하세요: ');
    const blogId = await question('블로그 ID를 입력하세요: ');

    try {
        // Chrome 옵션 설정
        const options = new chrome.Options();
        options.addArguments('--disable-blink-features=AutomationControlled');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        options.addArguments('--disable-save-password-bubble');
        options.setUserPreferences({
            'credentials_enable_service': false,
            'profile.password_manager_enabled': false
        });

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

        await driver.manage().window().maximize();
        console.log('✅ Chrome 브라우저 시작 성공!');

        // 1. 네이버 로그인
        console.log('\n1. 네이버 로그인 페이지로 이동...');
        await driver.get('https://nid.naver.com/nidlogin.login');
        await driver.sleep(2000);

        // 로그인
        await driver.executeScript(`
            document.getElementById('id').value = '${username}';
            document.getElementById('pw').value = '${password}';
        `);
        await driver.sleep(500);

        const loginBtn = await driver.findElement(By.css('.btn_login'));
        await loginBtn.click();
        console.log('로그인 버튼 클릭, 로그인 대기 중...');
        await driver.sleep(5000);

        // 2. 블로그 에디터로 이동
        console.log('\n2. 블로그 에디터로 이동...');
        await driver.get(`https://blog.naver.com/${blogId}/postwrite`);
        await driver.sleep(5000);

        console.log('에디터 페이지 로드 완료');

        // 3. "작성 중인 글이 있습니다" 팝업 처리
        try {
            const cancelDraftBtn = await driver.wait(
                until.elementLocated(By.css('.se-popup-button-cancel')),
                3000
            );
            if (cancelDraftBtn) {
                console.log('작성 중인 글 팝업 발견, 취소 클릭');
                await cancelDraftBtn.click();
            }
        } catch (e) {
            console.log('팝업 없음');
        }
        await driver.sleep(1000);

        // 4. 발행 버튼 클릭하여 발행 옵션 패널 열기
        console.log('\n3. 발행 버튼 클릭...');
        const publishButtonSelectors = [
            'button[data-click-area="tpb.publish"]',
            'button.publish_btn__m9KHH',
            'button[class*="publish_btn"]'
        ];

        let publishBtn = null;
        for (const selector of publishButtonSelectors) {
            try {
                publishBtn = await driver.findElement(By.css(selector));
                console.log(`발행 버튼 발견: ${selector}`);
                break;
            } catch (e) {
                continue;
            }
        }

        if (publishBtn) {
            await publishBtn.click();
            console.log('발행 버튼 클릭 완료');
            await driver.sleep(2000);
        } else {
            console.log('발행 버튼을 찾을 수 없습니다');
        }

        // 5. 발행 패널 HTML 분석
        console.log('\n4. 발행 옵션 패널 HTML 분석...');

        const analysisResult = await driver.executeScript(`
            const result = {
                radioButtons: [],
                selects: [],
                dateInputs: [],
                buttons: []
            };
            
            // 예약 라디오 버튼 찾기
            const radios = document.querySelectorAll('input[type="radio"]');
            radios.forEach(radio => {
                result.radioButtons.push({
                    id: radio.id,
                    name: radio.name,
                    value: radio.value,
                    dataClickArea: radio.getAttribute('data-click-area'),
                    dataTestid: radio.getAttribute('data-testid'),
                    className: radio.className,
                    checked: radio.checked,
                    parentText: radio.parentElement?.textContent?.trim()?.slice(0, 50)
                });
            });
            
            // Select 드롭다운 찾기
            const selects = document.querySelectorAll('select');
            selects.forEach(select => {
                const options = Array.from(select.options).map(opt => ({
                    value: opt.value,
                    text: opt.text
                }));
                result.selects.push({
                    id: select.id,
                    name: select.name,
                    className: select.className,
                    title: select.title,
                    currentValue: select.value,
                    optionsCount: select.options.length,
                    firstOptions: options.slice(0, 3)
                });
            });
            
            // 날짜 입력 필드 찾기
            const dateInputs = document.querySelectorAll('input[type="date"], input[readonly]');
            dateInputs.forEach(input => {
                result.dateInputs.push({
                    id: input.id,
                    className: input.className,
                    value: input.value,
                    readonly: input.readOnly,
                    type: input.type
                });
            });
            
            // 발행 확인 버튼 찾기
            const buttons = document.querySelectorAll('button');
            buttons.forEach(btn => {
                const text = btn.textContent?.trim();
                if (text && (text.includes('발행') || text.includes('확인'))) {
                    result.buttons.push({
                        text: text.slice(0, 30),
                        className: btn.className,
                        dataClickArea: btn.getAttribute('data-click-area'),
                        dataTestid: btn.getAttribute('data-testid')
                    });
                }
            });
            
            return result;
        `);

        console.log('\n=== 분석 결과 ===');
        console.log('\n[라디오 버튼들]');
        analysisResult.radioButtons.forEach((r, i) => {
            console.log(`  ${i + 1}. id=${r.id}, name=${r.name}, value=${r.value}`);
            console.log(`     data-click-area=${r.dataClickArea}`);
            console.log(`     data-testid=${r.dataTestid}`);
            console.log(`     class=${r.className}`);
            console.log(`     checked=${r.checked}, parent:${r.parentText}`);
        });

        console.log('\n[셀렉트 드롭다운들]');
        analysisResult.selects.forEach((s, i) => {
            console.log(`  ${i + 1}. class=${s.className}, title=${s.title}`);
            console.log(`     currentValue=${s.currentValue}, optionsCount=${s.optionsCount}`);
            console.log(`     firstOptions=`, s.firstOptions);
        });

        console.log('\n[날짜 입력 필드들]');
        analysisResult.dateInputs.forEach((d, i) => {
            console.log(`  ${i + 1}. class=${d.className}, value=${d.value}, readonly=${d.readonly}`);
        });

        console.log('\n[발행 버튼들]');
        analysisResult.buttons.forEach((b, i) => {
            console.log(`  ${i + 1}. text=${b.text}`);
            console.log(`     class=${b.className}`);
            console.log(`     data-click-area=${b.dataClickArea}`);
            console.log(`     data-testid=${b.dataTestid}`);
        });

        // 결과를 파일로 저장
        fs.writeFileSync('naver-schedule-ui-analysis.json', JSON.stringify(analysisResult, null, 2));
        console.log('\n분석 결과가 naver-schedule-ui-analysis.json에 저장되었습니다.');

        // 6. 예약 라디오 버튼 클릭 테스트
        console.log('\n5. 예약 라디오 버튼 클릭 시도...');
        const radioClicked = await driver.executeScript(`
            // 예약 라디오 버튼 찾기
            const selectors = [
                'input[data-click-area="tpb*i.schedule"]',
                'input[data-testid="preTimeRadioBtn"]',
                '#radio_time2',
                'input[value="pre"][name="radio_time"]'
            ];
            
            for (const selector of selectors) {
                const radio = document.querySelector(selector);
                if (radio) {
                    radio.click();
                    return { found: true, selector, checked: radio.checked };
                }
            }
            
            // 못 찾으면 텍스트로 찾기
            const labels = document.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent.includes('예약')) {
                    const radio = label.querySelector('input[type="radio"]');
                    if (radio) {
                        radio.click();
                        return { found: true, method: 'label-text', checked: radio.checked };
                    }
                }
            }
            
            return { found: false };
        `);

        console.log('예약 라디오 클릭 결과:', radioClicked);
        await driver.sleep(2000);

        // 7. 예약 옵션이 나타난 후 다시 분석
        if (radioClicked.found) {
            console.log('\n6. 예약 옵션 UI 재분석...');

            const scheduleUIResult = await driver.executeScript(`
                const result = {
                    hourSelect: null,
                    minuteSelect: null,
                    dateInput: null
                };
                
                // 시간 선택 드롭다운
                const hourSelectors = [
                    'select.hour_option__J_heO',
                    'select[title*="시간"]',
                    '.hour__ckNMb select',
                    'select[class*="hour"]'
                ];
                
                for (const sel of hourSelectors) {
                    const elem = document.querySelector(sel);
                    if (elem) {
                        result.hourSelect = {
                            selector: sel,
                            className: elem.className,
                            currentValue: elem.value,
                            options: Array.from(elem.options).map(o => o.value)
                        };
                        break;
                    }
                }
                
                // 분 선택 드롭다운
                const minuteSelectors = [
                    'select.minute_option__Vb3xB',
                    'select[title*="분"]',
                    '.minute__KXXvZ select',
                    'select[class*="minute"]'
                ];
                
                for (const sel of minuteSelectors) {
                    const elem = document.querySelector(sel);
                    if (elem) {
                        result.minuteSelect = {
                            selector: sel,
                            className: elem.className,
                            currentValue: elem.value,
                            options: Array.from(elem.options).map(o => o.value)
                        };
                        break;
                    }
                }
                
                // 날짜 입력 필드
                const dateSelectors = [
                    'input.input_date__QmA0s',
                    '.date__Lkn7S input',
                    'input[readonly][value*="."]'
                ];
                
                for (const sel of dateSelectors) {
                    const elem = document.querySelector(sel);
                    if (elem) {
                        result.dateInput = {
                            selector: sel,
                            className: elem.className,
                            currentValue: elem.value,
                            readonly: elem.readOnly
                        };
                        break;
                    }
                }
                
                return result;
            `);

            console.log('\n=== 예약 UI 요소 분석 ===');
            console.log('시간 선택:', scheduleUIResult.hourSelect);
            console.log('분 선택:', scheduleUIResult.minuteSelect);
            console.log('날짜 입력:', scheduleUIResult.dateInput);

            fs.writeFileSync('naver-schedule-options.json', JSON.stringify(scheduleUIResult, null, 2));
            console.log('\n예약 옵션 분석 결과가 naver-schedule-options.json에 저장되었습니다.');
        }

        // 대기
        console.log('\n브라우저를 열어두고 있습니다. 확인 후 Enter를 누르세요...');
        await question('');

    } catch (error) {
        console.error('\n❌ 테스트 실패:', error.message);
    } finally {
        rl.close();
        if (driver) {
            console.log('브라우저 종료 중...');
            await driver.quit();
        }
    }
}

testScheduleUI();
