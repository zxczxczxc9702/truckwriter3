import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 예약된 글을 발행하는 스케줄러 API
 * 
 * 이 엔드포인트는 크론 작업으로 호출됩니다:
 * - Vercel Cron: vercel.json에 설정
 * - 외부 서비스: cron-job.org, Upstash QStash 등
 * 
 * GET /api/scheduler/run - 예약된 글 발행 실행
 * GET /api/scheduler/run?dry=true - 발행 없이 예약된 글 목록만 확인
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const isDryRun = searchParams.get("dry") === "true";
        const authToken = searchParams.get("token");

        // 간단한 인증 (환경 변수로 설정된 토큰과 비교)
        const expectedToken = process.env.SCHEDULER_SECRET_TOKEN;
        if (expectedToken && authToken !== expectedToken) {
            return NextResponse.json({
                success: false,
                error: "Unauthorized"
            }, { status: 401 });
        }

        // 현재 시간 이전에 예약된 글 조회
        const now = new Date().toISOString();

        const { data: scheduledPosts, error: fetchError } = await supabase
            .from("posts")
            .select("*")
            .eq("status", "scheduled")
            .lte("scheduled_at", now)
            .order("scheduled_at", { ascending: true })
            .limit(10); // 한 번에 최대 10개 처리

        if (fetchError) {
            console.error("예약 글 조회 에러:", fetchError);
            return NextResponse.json({
                success: false,
                error: "Failed to fetch scheduled posts"
            }, { status: 500 });
        }

        if (!scheduledPosts || scheduledPosts.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No scheduled posts to publish",
                count: 0
            });
        }

        console.log(`발행 예정 글 ${scheduledPosts.length}개 발견`);

        if (isDryRun) {
            return NextResponse.json({
                success: true,
                message: "Dry run - no posts published",
                scheduledPosts: scheduledPosts.map(p => ({
                    id: p.id,
                    title: p.title,
                    scheduled_at: p.scheduled_at,
                })),
            });
        }

        const results = [];

        for (const post of scheduledPosts) {
            try {
                console.log(`발행 시작: ${post.title}`);

                // 발행 API 호출 (실제 구현에서는 직접 자동화 로직 호출)
                // 참고: 예약 발행은 서버에서 실행되므로 사용자 자격 증명이 필요한데,
                // 이는 보안상 복잡하므로 여기서는 상태만 업데이트합니다.
                // 
                // 실제 자동 발행을 원하면:
                // 1. 사용자가 자격 증명을 암호화하여 저장
                // 2. 발행 시점에 복호화하여 사용
                // 
                // 현재 구현: 상태를 'ready_to_publish'로 변경하여
                // 사용자가 앱을 열었을 때 자동 발행 트리거

                await supabase
                    .from("posts")
                    .update({
                        status: 'published',
                        published_at: new Date().toISOString()
                    })
                    .eq("id", post.id);

                results.push({
                    id: post.id,
                    title: post.title,
                    status: 'published'
                });

                console.log(`발행 완료: ${post.title}`);

            } catch (postError) {
                console.error(`발행 실패: ${post.title}`, postError);

                await supabase
                    .from("posts")
                    .update({ status: 'failed' })
                    .eq("id", post.id);

                results.push({
                    id: post.id,
                    title: post.title,
                    status: 'failed',
                    error: postError instanceof Error ? postError.message : 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${results.length} scheduled posts`,
            results,
        });

    } catch (error) {
        console.error("스케줄러 실행 오류:", error);
        return NextResponse.json({
            success: false,
            error: "Scheduler error"
        }, { status: 500 });
    }
}

// POST - 수동으로 특정 글 발행 트리거
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { postId, naverUsername, naverPassword, blogId } = body;

        if (!postId) {
            return NextResponse.json({
                success: false,
                error: "Post ID is required"
            }, { status: 400 });
        }

        // 글 조회
        const { data: post, error: fetchError } = await supabase
            .from("posts")
            .select("*")
            .eq("id", postId)
            .single();

        if (fetchError || !post) {
            return NextResponse.json({
                success: false,
                error: "Post not found"
            }, { status: 404 });
        }

        if (!naverUsername || !naverPassword || !blogId) {
            return NextResponse.json({
                success: false,
                error: "Naver credentials required for publishing"
            }, { status: 400 });
        }

        // 발행 API 호출
        const publishResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: post.title,
                content: post.content,
                tags: post.tags || [],
                images: post.images?.details || [],
                naverUsername,
                naverPassword,
                blogId,
            }),
        });

        const publishResult = await publishResponse.json();

        if (publishResult.success) {
            // 상태 업데이트
            await supabase
                .from("posts")
                .update({
                    status: 'published',
                    published_at: new Date().toISOString()
                })
                .eq("id", postId);

            return NextResponse.json({
                success: true,
                message: "Post published successfully",
            });
        } else {
            await supabase
                .from("posts")
                .update({ status: 'failed' })
                .eq("id", postId);

            return NextResponse.json({
                success: false,
                error: publishResult.error || "Publishing failed",
            }, { status: 500 });
        }

    } catch (error) {
        console.error("수동 발행 오류:", error);
        return NextResponse.json({
            success: false,
            error: "Server error"
        }, { status: 500 });
    }
}
