'use client';

import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, RefreshCw, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface License {
    id: string;
    license_key: string;
    user_email: string | null;
    plan: string;
    monthly_limit: number;
    daily_limit: number;
    expires_at: string;
    is_active: boolean;
    registered_at: string | null;
    created_at: string;
}

export default function LicensePage() {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [plan, setPlan] = useState<'free' | 'paid'>('paid');
    const [count, setCount] = useState(1);

    useEffect(() => {
        loadLicenses();
    }, []);

    const loadLicenses = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/license/generate');
            const result = await response.json();
            if (result.success) {
                setLicenses(result.data || []);
            }
        } catch (error) {
            console.error('라이센스 조회 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const response = await fetch('/api/license/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, count }),
            });
            const result = await response.json();
            if (result.success) {
                alert(`${result.licenses.length}개의 라이센스가 생성되었습니다!`);
                loadLicenses();
            } else {
                alert(result.error || '생성 실패');
            }
        } catch (error) {
            alert('오류가 발생했습니다.');
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const response = await fetch(`/api/license/generate?id=${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (result.success) {
                loadLicenses();
            } else {
                alert(result.error || '삭제 실패');
            }
        } catch (error) {
            alert('오류가 발생했습니다.');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('클립보드에 복사되었습니다!');
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR');
    };

    const isExpired = (dateString: string) => {
        return new Date(dateString) < new Date();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-purple-200 hover:text-white transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                                <Key className="w-10 h-10" />
                                라이센스 관리
                            </h1>
                            <p className="text-purple-200 mt-1">인증코드 생성 및 관리</p>
                        </div>
                    </div>
                    <button
                        onClick={loadLicenses}
                        className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        새로고침
                    </button>
                </div>

                {/* Generate Section */}
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-green-400/30 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        새 라이센스 생성
                    </h2>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-green-200 mb-2">플랜 선택</label>
                            <select
                                value={plan}
                                onChange={(e) => setPlan(e.target.value as 'free' | 'paid')}
                                className="bg-white/10 border border-green-400/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="free" className="bg-gray-800">무료 (월 3회)</option>
                                <option value="paid" className="bg-gray-800">유료 (일 5회)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-green-200 mb-2">생성 개수</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                                className="w-24 bg-white/10 border border-green-400/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            라이센스 생성
                        </button>
                    </div>
                    <p className="text-sm text-green-300 mt-3">
                        💡 라이센스는 30일 유효기간으로 생성됩니다.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                        <p className="text-purple-200 text-sm">전체 라이센스</p>
                        <p className="text-2xl font-bold text-white">{licenses.length}개</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                        <p className="text-purple-200 text-sm">활성</p>
                        <p className="text-2xl font-bold text-green-400">{licenses.filter(l => l.is_active && !isExpired(l.expires_at)).length}개</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                        <p className="text-purple-200 text-sm">등록됨</p>
                        <p className="text-2xl font-bold text-blue-400">{licenses.filter(l => l.user_email).length}개</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                        <p className="text-purple-200 text-sm">만료됨</p>
                        <p className="text-2xl font-bold text-red-400">{licenses.filter(l => isExpired(l.expires_at)).length}개</p>
                    </div>
                </div>

                {/* License Table */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            라이센스 목록
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <RefreshCw className="w-8 h-8 text-white animate-spin mx-auto" />
                        </div>
                    ) : licenses.length === 0 ? (
                        <div className="p-12 text-center">
                            <Key className="w-12 h-12 text-purple-300/50 mx-auto mb-4" />
                            <p className="text-purple-200">생성된 라이센스가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-purple-200">라이센스 키</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-purple-200">플랜</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-purple-200">사용자</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-purple-200">만료일</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-purple-200">상태</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-purple-200">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {licenses.map((license) => (
                                        <tr key={license.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <code className="text-white text-sm font-mono bg-black/20 px-2 py-1 rounded">
                                                        {license.license_key}
                                                    </code>
                                                    <button
                                                        onClick={() => copyToClipboard(license.license_key)}
                                                        className="text-purple-300 hover:text-white transition-colors"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${license.plan === 'paid'
                                                        ? 'bg-purple-500/30 text-purple-200'
                                                        : 'bg-gray-500/30 text-gray-200'
                                                    }`}>
                                                    {license.plan === 'paid' ? '유료' : '무료'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-white text-sm">
                                                {license.user_email || <span className="text-purple-300/50">미등록</span>}
                                            </td>
                                            <td className="px-4 py-3 text-white text-sm">
                                                {formatDate(license.expires_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {license.is_active && !isExpired(license.expires_at) ? (
                                                    <span className="flex items-center gap-1 text-green-400 text-sm">
                                                        <CheckCircle className="w-4 h-4" />
                                                        활성
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-red-400 text-sm">
                                                        <XCircle className="w-4 h-4" />
                                                        {isExpired(license.expires_at) ? '만료' : '비활성'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleDelete(license.id)}
                                                    className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
