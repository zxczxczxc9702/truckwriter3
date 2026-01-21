import { NextRequest, NextResponse } from 'next/server';
import { NaverBlogAutomation, BlogPost, NaverCredentials } from '@/lib/naver-blog-automation';
import { checkRateLimit, rateLimitExceededResponse, getIdentifier } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface PublishRequest {
    post: BlogPost;
    credentials: NaverCredentials;
    blogId: string;
}

export async function POST(req: NextRequest) {
    let automation: NaverBlogAutomation | null = null;
    const tempImagePaths: string[] = [];

    try {
        // 세션 확인
        const session = await getServerSession();

        // Rate Limiting 체크
        const identifier = getIdentifier(req, session?.user?.email || undefined);
        const rateLimit = checkRateLimit(identifier);
        if (!rateLimit.allowed) {
            console.log(`⚠️ Rate limit 초과: ${identifier}`);
            return rateLimitExceededResponse();
        }

        const body: PublishRequest = await req.json();
        const { post, credentials, blogId } = body;

        // 필수 필드 검증
        if (!post || !credentials || !blogId) {
            return NextResponse.json(
                {
                    success: false,
                    error: '필수 정보가 누락되었습니다.'
                },
                { status: 400 }
            );
        }

        if (!post.title || !post.content) {
            return NextResponse.json(
                {
                    success: false,
                    error: '제목과 내용을 입력해주세요.'
                },
                { status: 400 }
            );
        }

        // 이미지 처리
        if (post.images && post.images.length > 0) {
            const tempDir = path.join(process.cwd(), '.cache', 'temp_images');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            post.images = post.images.map((base64Image, index) => {
                // Base64 헤더 제거 (data:image/jpeg;base64,...)
                const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

                if (matches && matches.length === 3) {
                    const buffer = Buffer.from(matches[2], 'base64');
                    const extension = matches[1].split('/')[1];
                    const filename = `image_${Date.now()}_${index}.${extension}`;
                    const filepath = path.join(tempDir, filename);

                    fs.writeFileSync(filepath, buffer);
                    tempImagePaths.push(filepath);
                    return filepath;
                }
                return base64Image; // 이미 경로이거나 잘못된 형식이면 그대로 둠
            });
        }

        // Selenium 자동화 시작
        automation = new NaverBlogAutomation();

        console.log('브라우저 초기화 중...');
        await automation.initialize(false); // headless: false로 브라우저 창 표시

        console.log('네이버 로그인 중...');
        const loginSuccess = await automation.login(credentials);

        if (!loginSuccess) {
            return NextResponse.json(
                {
                    success: false,
                    error: '네이버 로그인에 실패했습니다. 아이디와 비밀번호를 확인하거나 2단계 인증을 완료해주세요.'
                },
                { status: 401 }
            );
        }

        console.log('블로그 글 발행 중...');
        const publishSuccess = await automation.publishPost(blogId, post);

        if (!publishSuccess) {
            return NextResponse.json(
                {
                    success: false,
                    error: '블로그 글 발행에 실패했습니다.'
                },
                { status: 500 }
            );
        }

        // 잠시 대기 후 브라우저 종료
        await new Promise(resolve => setTimeout(resolve, 3000));
        await automation.close();

        return NextResponse.json({
            success: true,
            message: post.scheduledAt
                ? `블로그 글이 ${new Date(post.scheduledAt).toLocaleString('ko-KR')}에 예약되었습니다!`
                : '블로그 글이 성공적으로 발행되었습니다!',
            data: {
                title: post.title,
                publishedAt: new Date().toISOString(),
                scheduledAt: post.scheduledAt || null,
            },
        });

    } catch (error) {
        console.error('블로그 발행 중 오류:', error);

        // 에러 발생 시 브라우저 종료
        if (automation) {
            try {
                await automation.close();
            } catch (e) {
                console.error('브라우저 종료 실패:', e);
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
            },
            { status: 500 }
        );
    } finally {
        // 임시 이미지 파일 삭제
        for (const imagePath of tempImagePaths) {
            try {
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (e) {
                console.error(`임시 파일 삭제 실패 (${imagePath}):`, e);
            }
        }
    }
}
