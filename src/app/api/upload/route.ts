import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: '파일이 없습니다.' },
                { status: 400 }
            );
        }

        // 파일 크기 체크 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, error: '파일 크기가 10MB를 초과합니다.' },
                { status: 400 }
            );
        }

        // 이미지 타입 체크
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { success: false, error: '이미지 파일만 업로드 가능합니다.' },
                { status: 400 }
            );
        }

        // 업로드 디렉토리 생성
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch {
            // 디렉토리가 이미 존재하면 무시
        }

        // 파일 이름 생성 (타임스탬프 + 랜덤)
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${timestamp}-${randomStr}.${ext}`;
        const filePath = path.join(uploadDir, fileName);

        // 파일 저장
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // 공개 URL 반환
        const url = `/uploads/${fileName}`;

        return NextResponse.json({
            success: true,
            url,
            fileName,
            size: file.size,
        });

    } catch (error) {
        console.error('업로드 오류:', error);
        return NextResponse.json(
            { success: false, error: '파일 업로드 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
