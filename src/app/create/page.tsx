'use client';

import { useState, useEffect } from 'react';
import { Truck, DollarSign, Calendar, Gauge, MapPin, Phone, ImageIcon, Save, Eye, X, Loader2, Upload, Quote, Clock, FileText, Trash2, Ruler, User } from 'lucide-react';

export default function CreatePost() {
    const [formData, setFormData] = useState({
        vehicleType: '',
        region: '',
        price: '',
        year: '',
        mileage: '',
        options: '',
        pros: '',
        cons: '',
        phone: '',
        keyword: '',  // 핵심 키워드 (SEO용)
        authorName: '', // 사용자 이름/닉네임 (인사말용)
        // 트럭 재원
        length: '',   // 길이
        width: '',    // 너비
        height: '',   // 높이
    });

    const [naverCredentials, setNaverCredentials] = useState({
        username: '',
        password: '',
        blogId: '',
    });

    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [preview, setPreview] = useState<{
        title: string;
        content: string;
        tags: string[];
    } | null>(null);

    const [images, setImages] = useState<{
        thumbnail: string | null;
        details: string[];
    }>({
        thumbnail: null,
        details: [],
    });

    const [cursorPosition, setCursorPosition] = useState<number | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
    const [currentPostId, setCurrentPostId] = useState<string | null>(null);
    const [savedDrafts, setSavedDrafts] = useState<Array<{
        id: string;
        title: string;
        status: string;
        scheduled_at: string | null;
        created_at: string;
    }>>([]);
    const [savingDraft, setSavingDraft] = useState(false);
    const [showDrafts, setShowDrafts] = useState(false);
    const [scheduledTime, setScheduledTime] = useState<string>('');

    // Load saved drafts on mount
    useEffect(() => {
        loadDrafts();
    }, []);

    const loadDrafts = async () => {
        try {
            const response = await fetch('/api/posts?status=all');
            const result = await response.json();
            if (result.success) {
                setSavedDrafts(result.data || []);
            }
        } catch (error) {
            console.error('Failed to load drafts:', error);
        }
    };

    const handleSaveDraft = async (status: 'draft' | 'scheduled' = 'draft') => {
        if (!preview) {
            alert('먼저 블로그 글을 생성해주세요.');
            return;
        }

        if (status === 'scheduled' && !scheduledTime) {
            alert('예약 발행 시간을 선택해주세요.');
            return;
        }

        setSavingDraft(true);

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentPostId,
                    title: preview.title,
                    content: preview.content,
                    tags: preview.tags,
                    status,
                    scheduled_at: status === 'scheduled' ? scheduledTime : null,
                    vehicle_data: formData,
                    images,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setCurrentPostId(result.data.id);
                await loadDrafts();
                alert(status === 'scheduled' ? '✅ 예약 발행이 설정되었습니다!' : '✅ 임시저장되었습니다!');
            } else {
                alert(`❌ 저장 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setSavingDraft(false);
        }
    };

    const handleLoadDraft = async (id: string) => {
        try {
            const response = await fetch(`/api/posts/${id}`);
            const result = await response.json();

            if (result.success && result.data) {
                const post = result.data;
                setCurrentPostId(post.id);
                setPreview({
                    title: post.title || '',
                    content: post.content || '',
                    tags: post.tags || [],
                });
                if (post.vehicle_data) {
                    setFormData(post.vehicle_data);
                }
                if (post.images) {
                    setImages(post.images);
                }
                if (post.scheduled_at) {
                    setScheduledTime(post.scheduled_at.slice(0, 16));
                }
                setShowDrafts(false);
                alert('✅ 글을 불러왔습니다.');
            }
        } catch (error) {
            console.error('Load error:', error);
            alert('불러오기 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteDraft = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' });
            const result = await response.json();

            if (result.success) {
                await loadDrafts();
                if (currentPostId === id) {
                    setCurrentPostId(null);
                }
                alert('✅ 삭제되었습니다.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'thumbnail' | 'detail') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'thumbnail') {
                    setImages(prev => ({ ...prev, thumbnail: reader.result as string }));
                } else {
                    setImages(prev => ({ ...prev, details: [...prev.details, reader.result as string] }));
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (result.success) {
                setPreview(result.data);
            } else {
                alert('블로그 글 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!preview) return;

        if (!naverCredentials.username || !naverCredentials.password || !naverCredentials.blogId) {
            alert('네이버 블로그 계정 정보를 모두 입력해주세요.');
            return;
        }

        setPublishing(true);

        try {
            // 이미지 인덱싱 재구성 로직
            let finalContent = preview.content;
            const finalImages: string[] = [];
            let detailImageOffset = 0;

            // 1. 썸네일 처리 (항상 0번 인덱스)
            if (images.thumbnail) {
                finalImages.push(images.thumbnail);
                // 썸네일을 본문 맨 뒤에 추가 (이미지가 상단에 몰리는 문제 해결)
                finalContent = `${finalContent}\n\n<<IMAGE_0>>`;
                detailImageOffset = 1;
            }

            // 2. 상세 이미지 처리 - 본문에 플레이스홀더가 없으면 자동 삽입
            if (images.details.length > 0) {
                // 본문에 삽입되지 않은 이미지들을 추적
                const insertedIndices = new Set<number>();

                // 기존 플레이스홀더가 있는 이미지 처리
                images.details.forEach((img, idx) => {
                    finalImages.push(img);
                    const finalIndex = idx + detailImageOffset;

                    // 기존 <<DETAIL_N>> 플레이스홀더를 <<IMAGE_M>>으로 변환
                    if (finalContent.includes(`<<DETAIL_${idx}>>`)) {
                        finalContent = finalContent.replace(
                            new RegExp(`<<DETAIL_${idx}>>`, 'g'),
                            `<<IMAGE_${finalIndex}>>`
                        );
                        insertedIndices.add(idx);
                    }
                });

                // 본문에 삽입되지 않은 이미지들을 본문 끝에 자동 추가
                images.details.forEach((img, idx) => {
                    if (!insertedIndices.has(idx)) {
                        const finalIndex = idx + detailImageOffset;
                        finalContent = finalContent + `\n\n<<IMAGE_${finalIndex}>>`;
                        console.log(`상세 이미지 ${idx}를 본문 끝에 자동 삽입`);
                    }
                });
            }

            const response = await fetch('/api/publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    post: {
                        ...preview,
                        content: finalContent,
                        images: finalImages,
                        scheduledAt: scheduledTime || undefined
                    },
                    credentials: {
                        username: naverCredentials.username,
                        password: naverCredentials.password,
                    },
                    blogId: naverCredentials.blogId,
                }),
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ 네이버 블로그에 성공적으로 발행되었습니다!');
                setPreview(null);
                setFormData({
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
                    authorName: '',
                    length: '',
                    width: '',
                    height: '',
                });
            } else {
                alert(`❌ 발행 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('발행 중 오류가 발생했습니다.');
        } finally {
            setPublishing(false);
        }
    };

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="mb-8 flex items-start justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">새 게시글 작성</h1>
                            <p className="text-purple-200">차량 정보를 입력하면 자동으로 SEO 최적화된 블로그 글이 생성됩니다</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowDrafts(!showDrafts)}
                            className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-all border border-white/20"
                        >
                            <FileText className="w-5 h-5" />
                            저장된 글 ({savedDrafts.length})
                        </button>
                    </div>

                    {/* Saved Drafts Panel */}
                    {showDrafts && (
                        <div className="mb-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                저장된 글 목록
                            </h3>
                            {savedDrafts.length === 0 ? (
                                <p className="text-purple-200 text-center py-4">저장된 글이 없습니다.</p>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                    {savedDrafts.map((draft) => (
                                        <div key={draft.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium truncate">{draft.title || '(제목 없음)'}</p>
                                                <div className="flex items-center gap-2 text-sm text-purple-200">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${draft.status === 'draft' ? 'bg-gray-500/30' :
                                                        draft.status === 'scheduled' ? (
                                                            draft.scheduled_at && new Date(draft.scheduled_at) <= new Date()
                                                                ? 'bg-orange-500/30 text-orange-200 animate-pulse'
                                                                : 'bg-blue-500/30'
                                                        ) :
                                                            draft.status === 'published' ? 'bg-green-500/30' : 'bg-red-500/30'
                                                        }`}>
                                                        {draft.status === 'draft' ? '임시저장' :
                                                            draft.status === 'scheduled' ? (
                                                                draft.scheduled_at && new Date(draft.scheduled_at) <= new Date()
                                                                    ? '🔔 발행 대기 중'
                                                                    : '예약됨'
                                                            ) :
                                                                draft.status === 'published' ? '발행됨' : '실패'}
                                                    </span>
                                                    {draft.scheduled_at && (
                                                        <span className={`flex items-center gap-1 ${draft.status === 'scheduled' && new Date(draft.scheduled_at) <= new Date()
                                                            ? 'text-orange-300 font-medium'
                                                            : ''
                                                            }`}>
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(draft.scheduled_at).toLocaleString('ko-KR')}
                                                            {draft.status === 'scheduled' && new Date(draft.scheduled_at) <= new Date() && (
                                                                <span className="text-xs ml-1">(시간 도달)</span>
                                                            )}
                                                        </span>
                                                    )}
                                                    <span>{new Date(draft.created_at).toLocaleDateString('ko-KR')}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <button
                                                    onClick={() => handleLoadDraft(draft.id)}
                                                    className="text-sm bg-purple-500/20 text-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-500/30"
                                                >
                                                    불러오기
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDraft(draft.id)}
                                                    className="text-sm bg-red-500/20 text-red-200 p-1.5 rounded-lg hover:bg-red-500/30"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                <Truck className="w-6 h-6" />
                                기본 정보
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField
                                    icon={<Truck className="w-5 h-5" />}
                                    label="차량 종류"
                                    placeholder="예: 메가트럭, 냉동탑차, 덤프트럭"
                                    value={formData.vehicleType}
                                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                />
                                <InputField
                                    icon={<MapPin className="w-5 h-5" />}
                                    label="지역"
                                    placeholder="예: 서울, 인천, 대구"
                                    value={formData.region}
                                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                />
                                <InputField
                                    icon={<DollarSign className="w-5 h-5" />}
                                    label="가격"
                                    placeholder="예: 3,500만원"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                />
                                <InputField
                                    icon={<Calendar className="w-5 h-5" />}
                                    label="연식"
                                    placeholder="예: 2018년식"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                />
                                <InputField
                                    icon={<Gauge className="w-5 h-5" />}
                                    label="주행거리"
                                    placeholder="예: 18만km"
                                    value={formData.mileage}
                                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                                />
                                <InputField
                                    icon={<Phone className="w-5 h-5" />}
                                    label="전화번호"
                                    placeholder="010-XXXX-XXXX"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                                <InputField
                                    icon={<User className="w-5 h-5" />}
                                    label="작성자 이름 (선택)"
                                    placeholder="예: 트럭매매전문 김사장"
                                    value={formData.authorName}
                                    onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                                />
                            </div>

                            {/* 트럭 재원 입력 */}
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <label className="block text-sm font-medium text-purple-200 mb-3 flex items-center gap-2">
                                    <Ruler className="w-4 h-4" />
                                    📐 트럭 재원 (적재함 크기)
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-purple-300 mb-1">길이 (L)</label>
                                        <input
                                            type="text"
                                            placeholder="예: 6.2m"
                                            value={formData.length}
                                            onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-purple-300 mb-1">너비 (W)</label>
                                        <input
                                            type="text"
                                            placeholder="예: 2.35m"
                                            value={formData.width}
                                            onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-purple-300 mb-1">높이 (H)</label>
                                        <input
                                            type="text"
                                            placeholder="예: 2.4m"
                                            value={formData.height}
                                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-purple-300 mt-2">💡 적재함 크기를 입력하면 블로그 글에 자동 반영됩니다</p>
                            </div>

                            {/* 핵심 키워드 입력 (SEO용) */}
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <label className="block text-sm font-medium text-purple-200 mb-2">🔑 핵심 키워드 (SEO)</label>
                                <input
                                    type="text"
                                    placeholder="예: 메가트럭, 5톤냉동탑차, 중고화물차"
                                    value={formData.keyword}
                                    onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                                    className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-400/30 rounded-xl text-white placeholder-yellow-300/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                />
                                <p className="text-xs text-yellow-300 mt-2">💡 이 키워드가 본문에 8회 이상 자동 삽입됩니다</p>
                            </div>
                        </div>

                        {/* Detailed Info */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <h2 className="text-2xl font-bold text-white mb-6">상세 정보</h2>
                            <div className="space-y-6">
                                <TextAreaField
                                    label="옵션 및 특장 정보"
                                    placeholder="예: 냉동기 신품, 적재함 무사고, 타이어 새것"
                                    value={formData.options}
                                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                                />
                                <TextAreaField
                                    label="장점"
                                    placeholder="이 차량의 주요 장점을 입력하세요"
                                    value={formData.pros}
                                    onChange={(e) => setFormData({ ...formData, pros: e.target.value })}
                                />
                                <TextAreaField
                                    label="단점 (선택)"
                                    placeholder="솔직한 단점이 신뢰도를 높입니다"
                                    value={formData.cons}
                                    onChange={(e) => setFormData({ ...formData, cons: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                <ImageIcon className="w-6 h-6" />
                                이미지 업로드
                            </h2>
                            <div className="space-y-4">
                                {/* Thumbnail Upload */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, 'thumbnail')}
                                        className="hidden"
                                        id="thumbnail-upload"
                                    />
                                    <label
                                        htmlFor="thumbnail-upload"
                                        className="block border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:border-white/50 transition-colors cursor-pointer"
                                    >
                                        {images.thumbnail ? (
                                            <div className="relative h-48 w-full">
                                                <img
                                                    src={images.thumbnail}
                                                    alt="Thumbnail"
                                                    className="w-full h-full object-contain rounded-lg"
                                                />
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                                                    <p className="text-white font-medium">변경하려면 클릭</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-12 h-12 text-white/50 mx-auto mb-3" />
                                                <p className="text-white font-medium">썸네일 이미지 업로드</p>
                                                <p className="text-sm text-purple-200 mt-1">클릭하여 이미지 선택</p>
                                            </>
                                        )}
                                    </label>
                                </div>

                                {/* Detail Images Upload */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleImageUpload(e, 'detail')}
                                        className="hidden"
                                        id="detail-upload"
                                    />
                                    <label
                                        htmlFor="detail-upload"
                                        className="block border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:border-white/50 transition-colors cursor-pointer"
                                    >
                                        <ImageIcon className="w-12 h-12 text-white/50 mx-auto mb-3" />
                                        <p className="text-white font-medium">상세 이미지 업로드 (다중)</p>
                                        <p className="text-sm text-purple-200 mt-1">
                                            {images.details.length > 0
                                                ? `${images.details.length}장의 이미지가 선택됨 (추가하려면 클릭)`
                                                : '여러 장의 이미지를 선택할 수 있습니다'}
                                        </p>
                                    </label>

                                    {/* Selected Images Preview */}
                                    {images.details.length > 0 && (
                                        <div className="mt-4 grid grid-cols-1 gap-4">
                                            {images.details.map((img, idx) => (
                                                <div key={idx} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                                                    <div className="relative w-24 h-24 flex-shrink-0">
                                                        <img src={img} alt={`Detail ${idx}`} className="w-full h-full object-cover rounded-lg" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setImages(prev => ({
                                                                ...prev,
                                                                details: prev.details.filter((_, i) => i !== idx)
                                                            }))}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-white font-medium mb-1">이미지 #{idx + 1}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // 미리보기 상태가 아니면 경고
                                                                if (!preview) {
                                                                    alert('먼저 블로그 글을 생성해주세요.');
                                                                    return;
                                                                }

                                                                // 본문에 이미지 플레이스홀더 삽입
                                                                const placeholder = `\n<<DETAIL_${idx}>>\n`;

                                                                setPreview(prev => {
                                                                    if (!prev) return null;

                                                                    const currentContent = prev.content;
                                                                    let newContent;

                                                                    if (cursorPosition !== null && cursorPosition >= 0 && cursorPosition <= currentContent.length) {
                                                                        // 커서 위치에 삽입
                                                                        newContent = currentContent.slice(0, cursorPosition) + placeholder + currentContent.slice(cursorPosition);
                                                                    } else {
                                                                        // 커서 위치가 없으면 맨 뒤에 추가
                                                                        newContent = currentContent + placeholder;
                                                                    }

                                                                    return {
                                                                        ...prev,
                                                                        content: newContent
                                                                    };
                                                                });

                                                                // 알림은 제거하거나 간소화 (사용자 경험 개선)
                                                            }}
                                                            className="text-sm bg-purple-500/20 text-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-500/30 transition-colors border border-purple-500/30 flex items-center gap-2"
                                                        >
                                                            <ImageIcon className="w-4 h-4" />
                                                            본문에 삽입하기
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Naver Blog Account */}
                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-green-400/30">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                <Upload className="w-6 h-6 text-green-400" />
                                네이버 블로그 계정 정보
                            </h2>
                            <p className="text-green-200 text-sm mb-6">
                                ⚠️ 블로그에 자동으로 발행하려면 네이버 계정 정보가 필요합니다. 정보는 안전하게 처리되며 저장되지 않습니다.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-green-200 mb-2">네이버 아이디</label>
                                    <input
                                        type="text"
                                        placeholder="your_id"
                                        value={naverCredentials.username}
                                        onChange={(e) => setNaverCredentials({ ...naverCredentials, username: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/10 border border-green-400/30 rounded-xl text-white placeholder-green-300/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-green-200 mb-2">비밀번호</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={naverCredentials.password}
                                        onChange={(e) => setNaverCredentials({ ...naverCredentials, password: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/10 border border-green-400/30 rounded-xl text-white placeholder-green-300/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-green-200 mb-2">블로그 ID</label>
                                    <input
                                        type="text"
                                        placeholder="your_blog_id"
                                        value={naverCredentials.blogId}
                                        onChange={(e) => setNaverCredentials({ ...naverCredentials, blogId: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/10 border border-green-400/30 rounded-xl text-white placeholder-green-300/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                    <p className="text-xs text-green-300 mt-1">blog.naver.com/<strong>여기_ID</strong></p>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    생성 중...
                                </>
                            ) : (
                                <>
                                    <Save className="w-6 h-6" />
                                    블로그 글 생성하기
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Preview Modal */}
            {preview && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-white/20 shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Eye className="w-6 h-6" />
                                미리보기
                            </h2>
                            <button
                                onClick={() => setPreview(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column: Media Management */}
                                <div className="lg:col-span-1 space-y-6">
                                    {/* Thumbnail Manager */}
                                    <div>
                                        <label className="block text-sm font-medium text-purple-200 mb-2">썸네일</label>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                            {images.thumbnail ? (
                                                <div className="relative aspect-video rounded-lg overflow-hidden group">
                                                    <img src={images.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <label className="cursor-pointer bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors">
                                                            변경하기
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => handleImageUpload(e, 'thumbnail')}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="block border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/40 transition-colors cursor-pointer">
                                                    <ImageIcon className="w-8 h-8 text-white/40 mx-auto mb-2" />
                                                    <span className="text-sm text-white/60">썸네일 추가</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleImageUpload(e, 'thumbnail')}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Detail Images Manager */}
                                    <div>
                                        <label className="block text-sm font-medium text-purple-200 mb-2">
                                            상세 이미지 ({images.details.length})
                                        </label>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 max-h-[400px] overflow-y-auto">
                                            {images.details.map((img, idx) => (
                                                <div key={idx} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg group">
                                                    <img src={img} alt={`Detail ${idx}`} className="w-16 h-16 object-cover rounded-md" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-white/60 truncate">이미지 #{idx + 1}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            <button
                                                                onClick={() => {
                                                                    const placeholder = `\n<<DETAIL_${idx}>>\n`;
                                                                    setPreview(prev => {
                                                                        if (!prev) return null;
                                                                        const currentContent = prev.content;
                                                                        let newContent;
                                                                        if (cursorPosition !== null && cursorPosition >= 0 && cursorPosition <= currentContent.length) {
                                                                            newContent = currentContent.slice(0, cursorPosition) + placeholder + currentContent.slice(cursorPosition);
                                                                        } else {
                                                                            newContent = currentContent + placeholder;
                                                                        }
                                                                        return { ...prev, content: newContent };
                                                                    });
                                                                }}
                                                                className="text-xs bg-purple-500/20 text-purple-200 px-2 py-1 rounded hover:bg-purple-500/30"
                                                            >
                                                                삽입
                                                            </button>
                                                            <button
                                                                onClick={() => setImages(prev => ({
                                                                    ...prev,
                                                                    details: prev.details.filter((_, i) => i !== idx)
                                                                }))}
                                                                className="text-xs bg-red-500/20 text-red-200 px-2 py-1 rounded hover:bg-red-500/30"
                                                            >
                                                                삭제
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <label className="block border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-white/40 transition-colors cursor-pointer">
                                                <span className="text-sm text-white/60">+ 이미지 추가</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => handleImageUpload(e, 'detail')}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Content Editor */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-purple-200 mb-2">제목</label>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-1">
                                            <input
                                                type="text"
                                                value={preview.title}
                                                onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                                                className="w-full bg-transparent text-xl font-bold text-white px-4 py-3 focus:outline-none"
                                                placeholder="제목을 입력하세요"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-purple-200">내용</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!preview) return;
                                                    const currentContent = preview.content;
                                                    let newContent;

                                                    // 선택된 텍스트가 있으면 인용구로 감싸기
                                                    if (selectionRange && selectionRange.start !== selectionRange.end) {
                                                        const selectedText = currentContent.slice(selectionRange.start, selectionRange.end);
                                                        const before = currentContent.slice(0, selectionRange.start);
                                                        const after = currentContent.slice(selectionRange.end);
                                                        newContent = `${before}<<QUOTE>>${selectedText}<</QUOTE>>${after}`;
                                                        // 선택 범위 초기화
                                                        setSelectionRange(null);
                                                    } else {
                                                        // 선택된 텍스트 없으면 기존 플레이스홀더 삽입
                                                        const placeholder = `\n<<QUOTE>>인용할 텍스트를 여기에 입력하세요<</QUOTE>>\n`;
                                                        if (cursorPosition !== null && cursorPosition >= 0 && cursorPosition <= currentContent.length) {
                                                            newContent = currentContent.slice(0, cursorPosition) + placeholder + currentContent.slice(cursorPosition);
                                                        } else {
                                                            newContent = currentContent + placeholder;
                                                        }
                                                    }
                                                    setPreview({ ...preview, content: newContent });
                                                }}
                                                className="flex items-center gap-2 text-sm bg-amber-500/20 text-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition-colors border border-amber-500/30"
                                            >
                                                <Quote className="w-4 h-4" />
                                                인용구 삽입
                                            </button>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                            <textarea
                                                value={preview.content}
                                                onChange={(e) => setPreview({ ...preview, content: e.target.value })}
                                                onSelect={(e) => {
                                                    setCursorPosition(e.currentTarget.selectionStart);
                                                    setSelectionRange({
                                                        start: e.currentTarget.selectionStart,
                                                        end: e.currentTarget.selectionEnd
                                                    });
                                                }}
                                                onClick={(e) => {
                                                    setCursorPosition(e.currentTarget.selectionStart);
                                                    setSelectionRange({
                                                        start: e.currentTarget.selectionStart,
                                                        end: e.currentTarget.selectionEnd
                                                    });
                                                }}
                                                onKeyUp={(e) => {
                                                    setCursorPosition(e.currentTarget.selectionStart);
                                                    setSelectionRange({
                                                        start: e.currentTarget.selectionStart,
                                                        end: e.currentTarget.selectionEnd
                                                    });
                                                }}
                                                className="w-full h-[500px] bg-transparent text-white font-sans text-base leading-relaxed focus:outline-none resize-none"
                                                placeholder="내용을 입력하세요..."
                                            />
                                        </div>
                                        <p className="text-xs text-amber-300/70 mt-2">
                                            💡 텍스트를 드래그해서 선택한 후 "인용구 삽입" 버튼을 누르면 자동으로 인용구가 됩니다
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-purple-200 mb-2">태그</label>
                                <div className="flex flex-wrap gap-2">
                                    {preview.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="bg-purple-500/20 text-purple-200 px-4 py-2 rounded-full text-sm border border-purple-400/30"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/10 space-y-4">
                            {/* 예약 발행 시간 선택 - 10분 단위만 가능 */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-purple-200 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    예약 발행 시간 (10분 단위):
                                </label>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {/* 날짜 선택 */}
                                    <input
                                        type="date"
                                        value={scheduledTime ? scheduledTime.slice(0, 10) : ''}
                                        onChange={(e) => {
                                            const date = e.target.value;
                                            const time = scheduledTime ? scheduledTime.slice(11, 16) : '10:00';
                                            setScheduledTime(`${date}T${time}`);
                                        }}
                                        min={new Date().toISOString().slice(0, 10)}
                                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {/* 시간 선택 */}
                                    <select
                                        value={scheduledTime ? scheduledTime.slice(11, 13) : '10'}
                                        onChange={(e) => {
                                            const date = scheduledTime ? scheduledTime.slice(0, 10) : new Date().toISOString().slice(0, 10);
                                            const minute = scheduledTime ? scheduledTime.slice(14, 16) : '00';
                                            setScheduledTime(`${date}T${e.target.value}:${minute}`);
                                        }}
                                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <option key={i} value={String(i).padStart(2, '0')} className="bg-gray-800">
                                                {String(i).padStart(2, '0')}시
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-white">:</span>
                                    {/* 분 선택 - 10분 단위만 */}
                                    <select
                                        value={scheduledTime ? scheduledTime.slice(14, 16) : '00'}
                                        onChange={(e) => {
                                            const date = scheduledTime ? scheduledTime.slice(0, 10) : new Date().toISOString().slice(0, 10);
                                            const hour = scheduledTime ? scheduledTime.slice(11, 13) : '10';
                                            setScheduledTime(`${date}T${hour}:${e.target.value}`);
                                        }}
                                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="00" className="bg-gray-800">00분</option>
                                        <option value="10" className="bg-gray-800">10분</option>
                                        <option value="20" className="bg-gray-800">20분</option>
                                        <option value="30" className="bg-gray-800">30분</option>
                                        <option value="40" className="bg-gray-800">40분</option>
                                        <option value="50" className="bg-gray-800">50분</option>
                                    </select>
                                </div>
                                {scheduledTime && (
                                    <p className="text-xs text-blue-300">
                                        📅 예약 시간: {new Date(scheduledTime).toLocaleString('ko-KR')}
                                    </p>
                                )}
                            </div>

                            {/* 버튼들 */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPreview(null)}
                                    className="bg-white/10 text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/20 transition-all border border-white/20"
                                >
                                    수정하기
                                </button>
                                <button
                                    onClick={() => handleSaveDraft('draft')}
                                    disabled={savingDraft}
                                    className="flex items-center gap-2 bg-gray-500/30 text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-500/40 transition-all border border-gray-400/30 disabled:opacity-50"
                                >
                                    {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    임시저장
                                </button>
                                <button
                                    onClick={() => handleSaveDraft('scheduled')}
                                    disabled={savingDraft || !scheduledTime}
                                    className="flex items-center gap-2 bg-blue-500/30 text-blue-200 font-semibold py-3 px-4 rounded-xl hover:bg-blue-500/40 transition-all border border-blue-400/30 disabled:opacity-50"
                                >
                                    <Clock className="w-4 h-4" />
                                    예약저장
                                </button>
                                <button
                                    onClick={handlePublish}
                                    disabled={publishing}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {publishing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            발행 중...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5" />
                                            네이버 블로그에 발행
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

interface InputFieldProps {
    icon: React.ReactNode;
    label: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function InputField({ icon, label, placeholder, value, onChange }: InputFieldProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">{label}</label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300">
                    {icon}
                </div>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
            </div>
        </div>
    );
}

interface TextAreaFieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

function TextAreaField({ label, placeholder, value, onChange }: TextAreaFieldProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">{label}</label>
            <textarea
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
        </div>
    );
}
