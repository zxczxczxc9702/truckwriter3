'use client';

import { useState } from 'react';
import { Key, Mail, Loader2, CheckCircle, AlertCircle, Truck, Sparkles } from 'lucide-react';

export default function ActivatePage() {
    const [licenseKey, setLicenseKey] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [licenseInfo, setLicenseInfo] = useState<{
        tier: string;
        expiresAt: string;
        dailyLimit: number;
        monthlyLimit: number;
    } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        try {
            const response = await fetch('/api/license/activate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ licenseKey, email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '라이센스 활성화에 실패했습니다.');
            }

            setSuccess(true);
            setLicenseInfo(data.license);
        } catch (err) {
            setError(err instanceof Error ? err.message : '라이센스 활성화 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getTierLabel = (tier: string) => {
        switch (tier) {
            case 'free':
                return { label: '무료', color: 'from-gray-400 to-gray-500' };
            case 'basic':
                return { label: '베이직', color: 'from-blue-400 to-blue-600' };
            case 'pro':
                return { label: '프로', color: 'from-purple-400 to-pink-500' };
            case 'enterprise':
                return { label: '엔터프라이즈', color: 'from-amber-400 to-orange-500' };
            default:
                return { label: tier, color: 'from-gray-400 to-gray-500' };
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl mb-4 shadow-2xl shadow-purple-500/30">
                        <Truck className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">라이센스 활성화</h1>
                    <p className="text-purple-200/80">라이센스 키와 이메일을 입력하여 활성화하세요</p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 px-8 py-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                <Key className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">기본 정보</h2>
                                <p className="text-purple-100 text-sm">라이센스 정보를 입력하세요</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="p-8">
                        {success && licenseInfo ? (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-4">
                                        <CheckCircle className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">활성화 완료!</h3>
                                    <p className="text-gray-500">라이센스가 성공적으로 활성화되었습니다.</p>
                                </div>

                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 font-medium">라이센스 등급</span>
                                        <span className={`bg-gradient-to-r ${getTierLabel(licenseInfo.tier).color} text-white px-4 py-1 rounded-full text-sm font-bold`}>
                                            {getTierLabel(licenseInfo.tier).label}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 font-medium">만료일</span>
                                        <span className="text-gray-800 font-semibold">{formatDate(licenseInfo.expiresAt)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 font-medium">일일 사용량</span>
                                        <span className="text-gray-800 font-semibold">{licenseInfo.dailyLimit} 회</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 font-medium">월간 사용량</span>
                                        <span className="text-gray-800 font-semibold">{licenseInfo.monthlyLimit} 회</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setSuccess(false);
                                        setLicenseInfo(null);
                                        setLicenseKey('');
                                        setEmail('');
                                    }}
                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    새 라이센스 활성화
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                )}

                                {/* License Key Input */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        라이센스 키
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                                        <input
                                            type="text"
                                            value={licenseKey}
                                            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                                            placeholder="예: XXXX-XXXX-XXXX-XXXX"
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-mono tracking-wider"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <span className="w-1 h-1 bg-purple-400 rounded-full"></span>
                                        라이센스 키는 구매 시 제공된 16자리 코드입니다
                                    </p>
                                </div>

                                {/* Email Input */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        이메일
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="예: example@email.com"
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <span className="w-1 h-1 bg-purple-400 rounded-full"></span>
                                        라이센스 관리에 사용될 이메일 주소입니다
                                    </p>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            활성화 중...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            라이센스 활성화
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span className="text-purple-200 text-sm">프리미엄 기능으로 블로그 자동화를 경험하세요</span>
                    </div>
                </div>

                {/* Copyright */}
                <p className="text-center text-purple-300/60 text-sm mt-6">
                    © 2024 TruckWriter. All rights reserved.
                </p>
            </div>
        </div>
    );
}
