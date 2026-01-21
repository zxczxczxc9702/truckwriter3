/**
 * 사용자 친화적 에러 메시지 유틸리티
 */

// HTTP 상태 코드별 기본 메시지
const ERROR_MESSAGES: Record<number, string> = {
    400: '입력 정보를 확인해주세요.',
    401: '로그인이 필요합니다.',
    403: '권한이 없습니다.',
    404: '요청한 리소스를 찾을 수 없습니다.',
    408: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
    413: '파일 크기가 너무 큽니다.',
    429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    502: '서버와 연결할 수 없습니다.',
    503: '서비스가 일시적으로 이용 불가합니다.',
    504: '서버 응답 시간이 초과되었습니다.',
};

// 네이버 관련 에러 메시지
export const NAVER_ERROR_MESSAGES = {
    LOGIN_FAILED: '네이버 로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.',
    CAPTCHA_DETECTED: '네이버에서 캡차(보안문자)가 발생했습니다. 웹 브라우저에서 네이버에 직접 로그인하신 후 다시 시도해주세요.',
    TWO_FACTOR_DETECTED: '2단계 인증이 필요한 계정입니다. 네이버 설정에서 2단계 인증을 해제하거나, 다른 계정을 사용해주세요.',
    SESSION_EXPIRED: '네이버 세션이 만료되었습니다. 다시 시도해주세요.',
    PUBLISH_FAILED: '블로그 발행에 실패했습니다. 잠시 후 다시 시도해주세요.',
    NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
    UNKNOWN: '알 수 없는 오류가 발생했습니다.',
};

/**
 * HTTP 상태 코드에 대한 사용자 친화적 메시지 반환
 */
export function getErrorMessage(statusCode: number, defaultMessage?: string): string {
    return ERROR_MESSAGES[statusCode] || defaultMessage || NAVER_ERROR_MESSAGES.UNKNOWN;
}

/**
 * 에러 객체에서 사용자 친화적 메시지 추출
 */
export function parseApiError(error: unknown): string {
    if (error instanceof Error) {
        // 네트워크 에러
        if (error.message.includes('fetch') || error.message.includes('network')) {
            return NAVER_ERROR_MESSAGES.NETWORK_ERROR;
        }

        // JSON 파싱 에러 (HTML 응답)
        if (error.message.includes('Unexpected token') || error.message.includes('DOCTYPE')) {
            return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }

        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return NAVER_ERROR_MESSAGES.UNKNOWN;
}

/**
 * API 응답 에러 처리
 */
export async function handleApiResponse(response: Response): Promise<{ success: true; data: any } | { success: false; error: string }> {
    if (!response.ok) {
        const errorMessage = getErrorMessage(response.status);

        try {
            const errorData = await response.json();
            return { success: false, error: errorData.error || errorMessage };
        } catch {
            return { success: false, error: errorMessage };
        }
    }

    try {
        const data = await response.json();
        return { success: true, data };
    } catch {
        return { success: false, error: '응답 처리 중 오류가 발생했습니다.' };
    }
}
