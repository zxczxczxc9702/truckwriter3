const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에서 사용할 API
contextBridge.exposeInMainWorld('electronAPI', {
    // 라이센스 검증
    verifyLicense: (licenseKey, email) =>
        ipcRenderer.invoke('verify-license', { licenseKey, email }),

    // 블로그 글 생성
    generateContent: (formData) =>
        ipcRenderer.invoke('generate-content', formData),

    // 사용량 기록
    recordUsage: (licenseId) =>
        ipcRenderer.invoke('record-usage', { licenseId }),

    // 네이버 블로그 발행
    publishToNaver: (post, credentials, blogId, licenseId) =>
        ipcRenderer.invoke('publish-to-naver', { post, credentials, blogId, licenseId }),
});
