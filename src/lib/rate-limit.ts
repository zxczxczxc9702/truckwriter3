/**
 * Rate Limiting 유틸리티
 * 메모리 기반 간단한 구현 (서버 재시작 시 초기화됨)
 * 프로덕션에서는 Redis/Upstash 사용 권장
 */

interface RateLimitRecord {
    count: number;
    lastReset: number;
}

// 메모리 저장소
const rateLimitStore: Map<string, RateLimitRecord> = new Map();

// 설정
const RATE_LIMIT_PER_MINUTE = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1분

/**
 * Rate limit 체크
 * @param identifier - 사용자 ID 또는 IP 주소
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
} {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    if (!record) {
        // 새 레코드 생성
        rateLimitStore.set(identifier, { count: 1, lastReset: now });
        return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - 1, resetIn: RATE_LIMIT_WINDOW_MS };
    }

    // 윈도우 경과 시 리셋
    if (now - record.lastReset >= RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.set(identifier, { count: 1, lastReset: now });
        return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - 1, resetIn: RATE_LIMIT_WINDOW_MS };
    }

    // 제한 초과 확인
    if (record.count >= RATE_LIMIT_PER_MINUTE) {
        const resetIn = RATE_LIMIT_WINDOW_MS - (now - record.lastReset);
        return { allowed: false, remaining: 0, resetIn };
    }

    // 카운트 증가
    record.count++;
    const resetIn = RATE_LIMIT_WINDOW_MS - (now - record.lastReset);
    return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - record.count, resetIn };
}

/**
 * Rate limit 에러 응답 생성
 */
export function rateLimitExceededResponse() {
    return new Response(
        JSON.stringify({
            success: false,
            error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
            code: 'RATE_LIMIT_EXCEEDED'
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': '60'
            }
        }
    );
}

/**
 * 요청에서 식별자 추출 (사용자 ID 또는 IP)
 */
export function getIdentifier(request: Request, userId?: string): string {
    if (userId) {
        return `user:${userId}`;
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return `ip:${ip}`;
}
