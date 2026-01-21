const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// API 서버 URL (Render에 배포된 서버)
const API_BASE_URL = 'https://truckwriter3.onrender.com';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.ico'),
        title: 'TruckWriter - 블로그 자동 생성'
    });

    // 라이센스 인증 페이지 로드
    mainWindow.loadFile('index.html');

    // 개발 모드에서 DevTools 열기
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC 핸들러: 라이센스 검증
ipcMain.handle('verify-license', async (event, { licenseKey, email }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/license/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licenseKey, email })
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: '서버 연결에 실패했습니다.' };
    }
});

// IPC 핸들러: 블로그 글 생성
ipcMain.handle('generate-content', async (event, formData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: '콘텐츠 생성에 실패했습니다.' };
    }
});

// IPC 핸들러: 사용량 기록
ipcMain.handle('record-usage', async (event, { licenseId }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/license/usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licenseId, action: 'publish' })
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: '사용량 기록에 실패했습니다.' };
    }
});

// IPC 핸들러: 네이버 블로그 발행 (로컬 Selenium)
ipcMain.handle('publish-to-naver', async (event, { post, credentials, blogId, licenseId }) => {
    try {
        // 사용량 확인 및 기록
        const usageResult = await (await fetch(`${API_BASE_URL}/api/license/usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licenseId, action: 'publish' })
        })).json();

        if (!usageResult.success) {
            return usageResult;
        }

        // 로컬 Selenium으로 발행
        const { publishToBlog } = require('./selenium-publisher');
        const result = await publishToBlog(post, credentials, blogId);

        return result;
    } catch (error) {
        console.error('발행 오류:', error);
        return { success: false, error: error.message || '발행에 실패했습니다.' };
    }
});
