import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, rateLimitExceededResponse, getIdentifier } from '@/lib/rate-limit';

interface GenerateRequest {
    vehicleType: string;
    region: string;
    price: string;
    year: string;
    mileage: string;
    options: string;
    pros: string;
    cons?: string;
    phone: string;
    keyword?: string;
    authorName?: string;  // 작성자 이름/닉네임 (공란이면 인사말 생략)
    length?: string;      // 트럭 재원 - 길이
    width?: string;       // 트럭 재원 - 너비
    height?: string;      // 트럭 재원 - 높이
}

// 플랜별 월간 사용 한도
const PLAN_LIMITS: Record<string, number> = {
    free: 100,  // 테스트를 위해 100회로 증가
    pro: 50,
    business: 9999,
};

export async function POST(req: NextRequest) {
    try {
        // 요청 데이터 먼저 파싱 (라이센스 키 확인용)
        const data: GenerateRequest & { licenseKey?: string } = await req.json();

        // Supabase 클라이언트
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        let isAuthenticated = false;
        let userEmail: string | null = null;
        let userPlan = 'free';

        // 1. 세션 기반 인증 시도
        const session = await getServerSession();
        if (session?.user?.email) {
            isAuthenticated = true;
            userEmail = session.user.email;
        }

        // 2. 라이센스 키 기반 인증 (데스크탑 앱용)
        if (!isAuthenticated && data.licenseKey && supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { data: license } = await supabase
                .from('licenses')
                .select('*')
                .eq('license_key', data.licenseKey)
                .eq('is_active', true)
                .single();

            if (license && new Date(license.expires_at) > new Date()) {
                isAuthenticated = true;
                userEmail = license.user_email || 'desktop-app';
                userPlan = license.plan;
                console.log(`🔑 라이센스 인증 성공: ${data.licenseKey.substring(0, 10)}...`);
            }
        }

        // 인증 실패
        if (!isAuthenticated) {
            return NextResponse.json({
                success: false,
                error: '로그인이 필요합니다.',
            }, { status: 401 });
        }

        // Rate Limiting 체크
        const identifier = getIdentifier(req, userEmail || 'unknown');
        const rateLimit = checkRateLimit(identifier);
        if (!rateLimit.allowed) {
            console.log(`⚠️ Rate limit 초과: ${identifier}`);
            return rateLimitExceededResponse();
        }

        // 사용자 사용량 체크 (세션 기반 사용자만)
        if (session?.user?.email && supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);

            // 사용자 조회
            const { data: user } = await supabase
                .from('users')
                .select('id, plan')
                .eq('email', session.user.email)
                .single();

            if (user) {
                const currentMonth = new Date().toISOString().slice(0, 7); // "2024-12"
                const limit = PLAN_LIMITS[user.plan || 'free'];

                // 현재 월 사용량 조회
                const { data: usage } = await supabase
                    .from('usage')
                    .select('count')
                    .eq('user_id', user.id)
                    .eq('month', currentMonth)
                    .single();

                const currentUsage = usage?.count || 0;

                if (currentUsage >= limit) {
                    return NextResponse.json({
                        success: false,
                        error: `이번 달 사용량(${limit}회)을 초과했습니다. 프로 플랜으로 업그레이드하세요.`,
                        usage: { current: currentUsage, limit }
                    }, { status: 403 });
                }

                // 사용량 증가
                await supabase
                    .from('usage')
                    .upsert({
                        user_id: user.id,
                        month: currentMonth,
                        count: currentUsage + 1
                    }, { onConflict: 'user_id,month' });

                console.log(`📊 사용량: ${currentUsage + 1}/${limit} (${session.user.email})`);
            }
        }

        // Perplexity API 키 확인
        const apiKey = process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('❌ API 키가 설정되지 않음');
            return NextResponse.json({
                success: false,
                error: 'API 키가 설정되지 않았습니다. .env.local 파일을 확인하세요.',
            }, { status: 500 });
        }

        console.log('✅ Perplexity API 키 확인됨, 글 생성 시작...');

        // Perplexity API 클라이언트 (OpenAI 호환)
        const perplexity = new OpenAI({
            apiKey,
            baseURL: 'https://api.perplexity.ai'
        });

        // 핵심 키워드 처리
        const mainKeyword = data.keyword || data.vehicleType;
        console.log(`📝 핵심 키워드: "${mainKeyword}"`);

        // 시스템 프롬프트 - 20년 경력 트럭 전문가 (더 강화된 버전)
        const systemPrompt = `당신은 대한민국에서 20년 이상 트럭과 화물차를 전문으로 매매해온 베테랑 전문가입니다. 
이름은 "김차장"이고, 수천 대의 트럭을 직접 보고 거래한 경험이 있습니다.

## ⚠️ 반드시 지켜야 할 핵심 규칙 (매우 중요!)

### 1. 글자 수 규칙
- **최소 2000자 이상** 작성해야 합니다
- 각 섹션을 상세하게 작성하세요
- 짧은 글은 절대 불가입니다

### 2. 키워드 규칙  
- 핵심 키워드 "${mainKeyword}"를 본문에 **정확히 8회 이상** 자연스럽게 포함
- 키워드를 억지로 반복하지 말고 문맥에 맞게 삽입

### 3. 전문가 어투 규칙
${data.authorName ? `- "안녕하세요, ${data.authorName}입니다"로 시작` : '- 인사말 없이 바로 차량 소개로 시작 ("이번에 소개해드릴 차량은...")'}
- 전문가만 알 수 있는 실무 용어와 팁 포함
- 실제 차량을 직접 본 것처럼 생생하게 묘사
- 솔직하고 신뢰감 있는 어투 유지

### 4. 필수 섹션 (모두 상세히 작성)
1. 🙋 인사말 및 전문가 소개 (경력, 전문 분야)
2. 🚛 차량 기본 정보 소개
3. 👀 외관 상태 상세 점검 결과
4. 🔧 엔진 및 기계적 상태 분석
5. ⚙️ 옵션 및 특장 설명
6. ✨ 이 차량만의 핵심 장점
7. 💡 전문가의 솔직한 조언
8. 👥 이 차량을 추천하는 사람
9. 💰 시세 분석 및 가격 평가
10. 📞 문의 안내 (연락처 포함)

응답은 반드시 JSON 형식으로만 해주세요.`;

        // 사용자 프롬프트
        const userPrompt = `아래 차량 정보를 바탕으로 네이버 블로그에 올릴 전문적인 매물 글을 작성해주세요.

## 📋 차량 정보
- 차량 종류: ${data.vehicleType}
- 연식: ${data.year}
- 주행거리: ${data.mileage}
- 지역: ${data.region}
- 가격: ${data.price}
- 옵션/특장: ${data.options}
- 장점: ${data.pros}
${data.cons ? `- 참고사항: ${data.cons}` : ''}
${(data.length || data.width || data.height) ? `
## 📐 적재함 재원
${data.length ? `- 길이: ${data.length}` : ''}
${data.width ? `- 너비: ${data.width}` : ''}
${data.height ? `- 높이: ${data.height}` : ''}` : ''}
- 연락처: ${data.phone}

## 🔑 SEO 핵심 키워드
"${mainKeyword}" - 이 키워드를 본문 전체에 8회 이상 자연스럽게 삽입해주세요.

## 📤 출력 형식 (반드시 이 JSON 형식으로)
{
  "title": "SEO에 최적화된 제목 (${mainKeyword} 포함, 40-50자)",
  "content": "2000자 이상의 상세한 본문 내용 (마크다운 형식, ${mainKeyword} 8회 이상 포함)",
  "tags": ["#${mainKeyword}", "#트럭매매", "#중고트럭", ...] (8-10개의 관련 태그)
}

⚠️ 주의: JSON 형식 외의 다른 텍스트는 포함하지 마세요.`;

        console.log('🚀 Perplexity API 호출 중...');

        // Perplexity API 호출 (sonar 모델 사용)
        const completion = await perplexity.chat.completions.create({
            model: 'sonar',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 8000,
        });

        const text = completion.choices[0]?.message?.content || '';
        console.log('📥 Perplexity 응답 수신 완료, 길이:', text.length);

        if (!text) {
            console.error('❌ OpenAI 응답이 비어있음');
            return NextResponse.json({
                success: false,
                error: 'OpenAI에서 빈 응답을 받았습니다.',
            }, { status: 500 });
        }

        // JSON 파싱
        let parsedContent;
        try {
            // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
            let jsonStr = text;

            // ```json ... ``` 형태 처리 (여러 패턴 시도)
            const patterns = [
                /```json\s*([\s\S]*?)```/,           // ```json ... ```
                /```\s*([\s\S]*?)```/,               // ``` ... ```
                /\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/  // 직접 JSON 추출
            ];

            let extracted = false;
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    jsonStr = match[1] || match[0];
                    console.log('패턴 매칭 성공:', pattern.toString().substring(0, 30));
                    extracted = true;
                    break;
                }
            }

            // JSON 객체 추출 (중괄호 찾기)
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                // 불완전한 JSON 처리: 닫는 중괄호가 없으면 추가
                let jsonToParse = jsonMatch[0];

                // 중괄호 개수 확인
                const openBraces = (jsonToParse.match(/\{/g) || []).length;
                const closeBraces = (jsonToParse.match(/\}/g) || []).length;

                if (openBraces > closeBraces) {
                    console.log('불완전한 JSON 감지, 닫는 중괄호 추가...');
                    // 마지막 유효한 필드 끝까지만 사용
                    const lastValidEnd = jsonToParse.lastIndexOf('",');
                    if (lastValidEnd > 0) {
                        jsonToParse = jsonToParse.substring(0, lastValidEnd + 1);
                    }
                    // 필요한 만큼 닫는 중괄호 추가
                    for (let i = 0; i < openBraces - closeBraces; i++) {
                        jsonToParse += '}';
                    }
                }

                parsedContent = JSON.parse(jsonToParse);
            } else {
                throw new Error('JSON 형식을 찾을 수 없음');
            }

            console.log('✅ JSON 파싱 성공');
            console.log(`📊 생성된 콘텐츠 길이: ${parsedContent.content?.length || 0}자`);

        } catch (parseError) {
            console.error('❌ JSON 파싱 실패, 폴백 파싱 시도:', parseError);
            console.log('원본 응답:', text.substring(0, 500));

            // 폴백: 잘린 JSON에서 title과 content 직접 추출
            try {
                const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/);
                const contentMatch = text.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"tags"|"\s*}|$)/);

                if (titleMatch && contentMatch) {
                    const extractedContent = contentMatch[1]
                        .replace(/\\n/g, '\n')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\');

                    console.log('✅ 폴백 파싱 성공');
                    parsedContent = {
                        title: titleMatch[1],
                        content: extractedContent,
                        tags: generateDefaultTags(data)
                    };
                } else {
                    throw new Error('폴백 파싱도 실패');
                }
            } catch (fallbackError) {
                return NextResponse.json({
                    success: false,
                    error: 'AI 응답 파싱 실패. 다시 시도해주세요.',
                    rawResponse: text.substring(0, 200),
                }, { status: 500 });
            }
        }

        // 필수 필드 검증
        if (!parsedContent.title || !parsedContent.content) {
            console.error('❌ 필수 필드 누락');
            return NextResponse.json({
                success: false,
                error: '생성된 콘텐츠에 제목이나 본문이 없습니다.',
            }, { status: 500 });
        }

        // 콘텐츠 길이 경고
        if (parsedContent.content.length < 1500) {
            console.warn(`⚠️ 콘텐츠가 너무 짧음: ${parsedContent.content.length}자`);
        }

        return NextResponse.json({
            success: true,
            data: {
                title: parsedContent.title,
                content: parsedContent.content,
                tags: parsedContent.tags || generateDefaultTags(data),
            },
        });

    } catch (error: unknown) {
        console.error('❌ 콘텐츠 생성 오류:', error);

        // OpenAI API 에러 상세 정보
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

        return NextResponse.json({
            success: false,
            error: `콘텐츠 생성 실패: ${errorMessage}`,
        }, { status: 500 });
    }
}

// 기본 태그 생성
function generateDefaultTags(data: GenerateRequest): string[] {
    return [
        `#${data.vehicleType}`,
        `#${data.region}트럭`,
        '#트럭매매',
        '#화물차',
        '#특장차',
        '#중고트럭',
        '#트럭판매',
        '#화물차매매',
    ];
}
