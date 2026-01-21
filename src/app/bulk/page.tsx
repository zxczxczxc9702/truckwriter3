'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, Play, Loader2, CheckCircle, XCircle, ArrowLeft, Image as ImageIcon, X, Calendar, Clock, Save } from 'lucide-react';
import Link from 'next/link';

type PublishMode = 'immediate' | 'scheduled' | 'draft';

interface PostItem {
    id: string;
    vehicleType: string;
    region: string;
    price: string;
    year: string;
    mileage: string;
    options: string;
    pros: string;
    cons: string;
    phone: string;
    keyword: string;
    images: File[];
    publishMode: PublishMode;
    scheduledTime: string;
    status: 'pending' | 'generating' | 'publishing' | 'completed' | 'failed';
    error?: string;
    generatedTitle?: string;
}

export default function BulkPublishPage() {
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [naverCredentials, setNaverCredentials] = useState({
        username: '',
        password: '',
        blogId: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [delayBetweenPosts, setDelayBetweenPosts] = useState(60);
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    const addPost = () => {
        const newPost: PostItem = {
            id: Date.now().toString(),
            vehicleType: '',
            region: '',
            price: '',
            year: '',
            mileage: '',
            options: '',
            pros: '',
            cons: '',
            phone: '',
            keyword: '',
            images: [],
            publishMode: 'immediate',
            scheduledTime: '',
            status: 'pending',
        };
        setPosts([...posts, newPost]);
    };

    const removePost = (id: string) => {
        setPosts(posts.filter(p => p.id !== id));
    };

    const updatePost = (id: string, field: keyof PostItem, value: any) => {
        setPosts(posts.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleImageUpload = (postId: string, files: FileList | null) => {
        if (!files) return;

        // 파일 크기 체크 (5MB 제한)
        const validFiles: File[] = [];
        for (let i = 0; i < files.length; i++) {
            if (files[i].size > 5 * 1024 * 1024) {
                alert(`${files[i].name} 파일이 5MB를 초과합니다. 작은 파일을 선택해주세요.`);
                continue;
            }
            validFiles.push(files[i]);
        }

        if (validFiles.length > 0) {
            setPosts(posts.map(p =>
                p.id === postId
                    ? { ...p, images: [...p.images, ...validFiles] }
                    : p
            ));
        }
    };

    const removeImage = (postId: string, imageIndex: number) => {
        setPosts(posts.map(p =>
            p.id === postId
                ? { ...p, images: p.images.filter((_, i) => i !== imageIndex) }
                : p
        ));
    };

    const handleBulkPublish = async () => {
        if (posts.length === 0) {
            alert('발행할 글을 추가해주세요.');
            return;
        }

        if (!naverCredentials.username || !naverCredentials.password || !naverCredentials.blogId) {
            alert('네이버 블로그 계정 정보를 입력해주세요.');
            return;
        }

        // 예약 발행 글의 시간 검증
        for (const post of posts) {
            if (post.publishMode === 'scheduled' && !post.scheduledTime) {
                alert('예약 발행을 선택한 글에 시간을 설정해주세요.');
                return;
            }
        }

        setIsProcessing(true);

        for (let i = 0; i < posts.length; i++) {
            setCurrentIndex(i);
            const post = posts[i];

            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'generating' } : p));

            try {
                // 1. Generate content
                const genResponse = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vehicleType: post.vehicleType,
                        region: post.region,
                        price: post.price,
                        year: post.year,
                        mileage: post.mileage,
                        options: post.options,
                        pros: post.pros,
                        cons: post.cons,
                        phone: post.phone,
                        keyword: post.keyword,
                    }),
                });

                if (!genResponse.ok) {
                    throw new Error(`콘텐츠 생성 실패 (${genResponse.status})`);
                }

                const genResult = await genResponse.json();

                if (!genResult.success) {
                    throw new Error(genResult.error || '콘텐츠 생성 실패');
                }

                setPosts(prev => prev.map(p => p.id === post.id ? {
                    ...p,
                    status: 'publishing',
                    generatedTitle: genResult.data.title
                } : p));

                // 2. Upload images if any
                const uploadedImageUrls: string[] = [];
                if (post.images.length > 0) {
                    for (const image of post.images) {
                        try {
                            const formData = new FormData();
                            formData.append('file', image);

                            const uploadRes = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData,
                            });

                            if (!uploadRes.ok) {
                                console.error(`이미지 업로드 실패: ${uploadRes.status}`);
                                continue;
                            }

                            const uploadResult = await uploadRes.json();
                            if (uploadResult.success && uploadResult.url) {
                                uploadedImageUrls.push(uploadResult.url);
                            }
                        } catch (uploadErr) {
                            console.error('이미지 업로드 오류:', uploadErr);
                        }
                    }
                }

                // 3. Publish/Draft/Schedule based on mode
                if (post.publishMode === 'draft') {
                    // 임시저장 - DB에만 저장
                    // TODO: Implement draft save to database
                    console.log('임시저장:', genResult.data.title);
                    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'completed' } : p));
                } else {
                    // 즉시 발행 또는 예약 발행
                    const pubResponse = await fetch('/api/publish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...genResult.data,
                            images: uploadedImageUrls,
                            naverUsername: naverCredentials.username,
                            naverPassword: naverCredentials.password,
                            blogId: naverCredentials.blogId,
                            scheduledAt: post.publishMode === 'scheduled' ? post.scheduledTime : undefined,
                        }),
                    });

                    if (!pubResponse.ok) {
                        throw new Error(`발행 실패 (${pubResponse.status})`);
                    }

                    const pubResult = await pubResponse.json();

                    if (!pubResult.success) {
                        throw new Error(pubResult.error || '발행 실패');
                    }

                    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'completed' } : p));
                }

            } catch (error) {
                console.error(`Post ${i + 1} error:`, error);
                setPosts(prev => prev.map(p => p.id === post.id ? {
                    ...p,
                    status: 'failed',
                    error: error instanceof Error ? error.message : '알 수 없는 오류'
                } : p));
            }

            if (i < posts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenPosts * 1000));
            }
        }

        setIsProcessing(false);
        setCurrentIndex(-1);
        alert('대량 발행이 완료되었습니다!');
    };

    const completedCount = posts.filter(p => p.status === 'completed').length;
    const failedCount = posts.filter(p => p.status === 'failed').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="text-purple-200 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">대량 발행</h1>
                            <p className="text-purple-200">여러 개의 블로그 글을 한 번에 작성하고 발행합니다</p>
                        </div>
                    </div>
                    <div className="text-right text-sm text-purple-200">
                        <p>총 {posts.length}개 / 완료 {completedCount}개 / 실패 {failedCount}개</p>
                    </div>
                </div>

                {/* Naver Credentials */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">네이버 블로그 계정</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="네이버 아이디"
                            value={naverCredentials.username}
                            onChange={(e) => setNaverCredentials({ ...naverCredentials, username: e.target.value })}
                            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                            type="password"
                            placeholder="비밀번호"
                            value={naverCredentials.password}
                            onChange={(e) => setNaverCredentials({ ...naverCredentials, password: e.target.value })}
                            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                            type="text"
                            placeholder="블로그 ID"
                            value={naverCredentials.blogId}
                            onChange={(e) => setNaverCredentials({ ...naverCredentials, blogId: e.target.value })}
                            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                        <Clock className="w-4 h-4 text-purple-300" />
                        <span className="text-sm text-purple-200">글 사이 대기 시간:</span>
                        <input
                            type="number"
                            min="30"
                            max="300"
                            value={delayBetweenPosts}
                            onChange={(e) => setDelayBetweenPosts(parseInt(e.target.value) || 60)}
                            className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-center"
                        />
                        <span className="text-sm text-purple-200">초</span>
                    </div>
                </div>

                {/* Posts List */}
                <div className="space-y-4 mb-6">
                    {posts.map((post, index) => (
                        <div
                            key={post.id}
                            className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border transition-all ${post.status === 'completed' ? 'border-green-400/50' :
                                post.status === 'failed' ? 'border-red-400/50' :
                                    post.status === 'generating' || post.status === 'publishing' ? 'border-blue-400/50 animate-pulse' :
                                        'border-white/20'
                                }`}
                        >
                            {/* Post Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-bold">#{index + 1}</span>
                                    {post.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-400" />}
                                    {post.status === 'failed' && <XCircle className="w-5 h-5 text-red-400" />}
                                    {(post.status === 'generating' || post.status === 'publishing') && (
                                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                    )}
                                    <span className={`text-sm px-2 py-0.5 rounded-full ${post.status === 'pending' ? 'bg-gray-500/30 text-gray-300' :
                                        post.status === 'generating' ? 'bg-yellow-500/30 text-yellow-300' :
                                            post.status === 'publishing' ? 'bg-blue-500/30 text-blue-300' :
                                                post.status === 'completed' ? 'bg-green-500/30 text-green-300' :
                                                    'bg-red-500/30 text-red-300'
                                        }`}>
                                        {post.status === 'pending' ? '대기' :
                                            post.status === 'generating' ? '생성 중' :
                                                post.status === 'publishing' ? '발행 중' :
                                                    post.status === 'completed' ? '완료' : '실패'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => removePost(post.id)}
                                    disabled={isProcessing}
                                    className="text-red-300 hover:text-red-200 disabled:opacity-50"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            {post.error && (
                                <p className="text-red-300 text-sm mb-4 bg-red-500/20 rounded-lg p-2">오류: {post.error}</p>
                            )}

                            {post.generatedTitle && (
                                <p className="text-purple-200 text-sm mb-4 truncate">📝 {post.generatedTitle}</p>
                            )}

                            {/* Input Fields */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <input
                                    type="text"
                                    placeholder="차량 종류 *"
                                    value={post.vehicleType}
                                    onChange={(e) => updatePost(post.id, 'vehicleType', e.target.value)}
                                    disabled={isProcessing || post.status !== 'pending'}
                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-purple-300/50 text-sm focus:outline-none disabled:opacity-50"
                                />
                                <input
                                    type="text"
                                    placeholder="지역"
                                    value={post.region}
                                    onChange={(e) => updatePost(post.id, 'region', e.target.value)}
                                    disabled={isProcessing || post.status !== 'pending'}
                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-purple-300/50 text-sm focus:outline-none disabled:opacity-50"
                                />
                                <input
                                    type="text"
                                    placeholder="가격"
                                    value={post.price}
                                    onChange={(e) => updatePost(post.id, 'price', e.target.value)}
                                    disabled={isProcessing || post.status !== 'pending'}
                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-purple-300/50 text-sm focus:outline-none disabled:opacity-50"
                                />
                                <input
                                    type="text"
                                    placeholder="연식"
                                    value={post.year}
                                    onChange={(e) => updatePost(post.id, 'year', e.target.value)}
                                    disabled={isProcessing || post.status !== 'pending'}
                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-purple-300/50 text-sm focus:outline-none disabled:opacity-50"
                                />
                                <input
                                    type="text"
                                    placeholder="주행거리"
                                    value={post.mileage}
                                    onChange={(e) => updatePost(post.id, 'mileage', e.target.value)}
                                    disabled={isProcessing || post.status !== 'pending'}
                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-purple-300/50 text-sm focus:outline-none disabled:opacity-50"
                                />
                                <input
                                    type="text"
                                    placeholder="옵션"
                                    value={post.options}
                                    onChange={(e) => updatePost(post.id, 'options', e.target.value)}
                                    disabled={isProcessing || post.status !== 'pending'}
                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-purple-300/50 text-sm focus:outline-none disabled:opacity-50"
                                />
                                <input
                                    type="text"
                                    placeholder="연락처"
                                    value={post.phone}
                                    onChange={(e) => updatePost(post.id, 'phone', e.target.value)}
                                    disabled={isProcessing || post.status !== 'pending'}
                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-purple-300/50 text-sm focus:outline-none disabled:opacity-50"
                                />
                                <input
                                    type="text"
                                    placeholder="키워드 *"
                                    value={post.keyword}
                                    onChange={(e) => updatePost(post.id, 'keyword', e.target.value)}
                                    disabled={isProcessing || post.status !== 'pending'}
                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-purple-300/50 text-sm focus:outline-none disabled:opacity-50"
                                />
                            </div>

                            {/* Publish Mode + Images Row */}
                            <div className="border-t border-white/10 pt-4 space-y-3">
                                {/* Publish Mode Selection */}
                                <div className="flex flex-wrap items-center gap-4">
                                    <span className="text-sm text-purple-200 font-medium">발행 방식:</span>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`publishMode-${post.id}`}
                                            checked={post.publishMode === 'immediate'}
                                            onChange={() => updatePost(post.id, 'publishMode', 'immediate')}
                                            disabled={isProcessing || post.status !== 'pending'}
                                            className="text-green-500 focus:ring-green-500"
                                        />
                                        <Play className="w-4 h-4 text-green-400" />
                                        <span className="text-sm text-white">즉시 발행</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`publishMode-${post.id}`}
                                            checked={post.publishMode === 'scheduled'}
                                            onChange={() => updatePost(post.id, 'publishMode', 'scheduled')}
                                            disabled={isProcessing || post.status !== 'pending'}
                                            className="text-blue-500 focus:ring-blue-500"
                                        />
                                        <Calendar className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm text-white">예약 발행</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`publishMode-${post.id}`}
                                            checked={post.publishMode === 'draft'}
                                            onChange={() => updatePost(post.id, 'publishMode', 'draft')}
                                            disabled={isProcessing || post.status !== 'pending'}
                                            className="text-yellow-500 focus:ring-yellow-500"
                                        />
                                        <Save className="w-4 h-4 text-yellow-400" />
                                        <span className="text-sm text-white">임시저장</span>
                                    </label>

                                    {/* Scheduled Time Input */}
                                    {post.publishMode === 'scheduled' && (
                                        <input
                                            type="datetime-local"
                                            value={post.scheduledTime}
                                            onChange={(e) => updatePost(post.id, 'scheduledTime', e.target.value)}
                                            disabled={isProcessing || post.status !== 'pending'}
                                            className="bg-white/10 border border-blue-400/50 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none disabled:opacity-50"
                                        />
                                    )}
                                </div>

                                {/* Image Upload */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <ImageIcon className="w-4 h-4 text-purple-300" />
                                    <span className="text-xs text-purple-200">이미지 ({post.images.length}개)</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        ref={(el) => { fileInputRefs.current[post.id] = el; }}
                                        onChange={(e) => handleImageUpload(post.id, e.target.files)}
                                        disabled={isProcessing || post.status !== 'pending'}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRefs.current[post.id]?.click()}
                                        disabled={isProcessing || post.status !== 'pending'}
                                        className="text-xs bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 px-2 py-1 rounded disabled:opacity-50 transition-colors"
                                    >
                                        + 추가
                                    </button>
                                    <span className="text-xs text-purple-400">(최대 5MB/개)</span>

                                    {post.images.length > 0 && (
                                        <div className="flex flex-wrap gap-1 ml-2">
                                            {post.images.map((image, imgIndex) => (
                                                <div key={imgIndex} className="relative group">
                                                    <img
                                                        src={URL.createObjectURL(image)}
                                                        alt={`이미지 ${imgIndex + 1}`}
                                                        className="w-10 h-10 object-cover rounded border border-white/20"
                                                    />
                                                    <button
                                                        onClick={() => removeImage(post.id, imgIndex)}
                                                        disabled={isProcessing || post.status !== 'pending'}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-2 h-2" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <button
                        onClick={addPost}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-white/10 text-white font-semibold py-3 px-6 rounded-xl hover:bg-white/20 transition-all border border-white/20 disabled:opacity-50"
                    >
                        <Plus className="w-5 h-5" />
                        글 추가
                    </button>
                    <button
                        onClick={handleBulkPublish}
                        disabled={isProcessing || posts.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                처리 중... ({currentIndex + 1}/{posts.length})
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                대량 발행 시작 ({posts.length}개)
                            </>
                        )}
                    </button>
                </div>

                {/* Progress Bar */}
                {isProcessing && (
                    <div className="mt-6 bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                            style={{ width: `${((completedCount + failedCount) / posts.length) * 100}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
