'use client';

import { useState, useEffect } from 'react';
import { Users, Shield, Trash2, Crown, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    email: string;
    name: string | null;
    plan: string;
    blog_id: string | null;
    created_at: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (status === 'authenticated') {
            loadUsers();
        }
    }, [status, router]);

    const loadUsers = async (page = 1) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/users?page=${page}&limit=20`);
            const result = await response.json();

            if (result.success) {
                setUsers(result.data || []);
                setPagination(result.pagination);
            } else {
                setError(result.error || '사용자 목록을 불러올 수 없습니다.');
            }
        } catch (err) {
            setError('서버 연결에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string, email: string) => {
        if (!confirm(`정말 "${email}" 사용자를 삭제하시겠습니까?`)) return;

        try {
            const response = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
            const result = await response.json();

            if (result.success) {
                alert('사용자가 삭제되었습니다.');
                loadUsers(pagination?.page || 1);
            } else {
                alert(result.error || '삭제에 실패했습니다.');
            }
        } catch (err) {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleChangePlan = async (userId: string, newPlan: string) => {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, plan: newPlan }),
            });
            const result = await response.json();

            if (result.success) {
                loadUsers(pagination?.page || 1);
            } else {
                alert(result.error || '플랜 변경에 실패했습니다.');
            }
        } catch (err) {
            alert('플랜 변경 중 오류가 발생했습니다.');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">접근 권한 없음</h2>
                        <p className="text-red-200">{error}</p>
                        <Link
                            href="/dashboard"
                            className="inline-block mt-4 bg-white/10 text-white px-6 py-2 rounded-xl hover:bg-white/20 transition-colors"
                        >
                            대시보드로 돌아가기
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="text-purple-200 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                                <Shield className="w-10 h-10" />
                                관리자 페이지
                            </h1>
                            <p className="text-purple-200 mt-1">회원 관리 및 통계</p>
                        </div>
                    </div>
                    <button
                        onClick={() => loadUsers(pagination?.page || 1)}
                        className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        새로고침
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
                        <Users className="w-8 h-8 mb-2" />
                        <p className="text-sm opacity-90">총 회원수</p>
                        <p className="text-3xl font-bold">{pagination?.total || 0}명</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                        <Crown className="w-8 h-8 mb-2" />
                        <p className="text-sm opacity-90">Pro 회원</p>
                        <p className="text-3xl font-bold">{users.filter(u => u.plan === 'pro').length}명</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
                        <Users className="w-8 h-8 mb-2" />
                        <p className="text-sm opacity-90">Free 회원</p>
                        <p className="text-3xl font-bold">{users.filter(u => u.plan === 'free' || !u.plan).length}명</p>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            회원 목록
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">이메일</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">이름</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">플랜</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">블로그 ID</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">가입일</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-white">{user.email}</td>
                                        <td className="px-6 py-4 text-white">{user.name || '-'}</td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.plan || 'free'}
                                                onChange={(e) => handleChangePlan(user.id, e.target.value)}
                                                className={`px-3 py-1 rounded-full text-sm font-medium border-0 cursor-pointer ${user.plan === 'pro'
                                                        ? 'bg-purple-500/30 text-purple-200'
                                                        : user.plan === 'business'
                                                            ? 'bg-yellow-500/30 text-yellow-200'
                                                            : 'bg-gray-500/30 text-gray-200'
                                                    }`}
                                            >
                                                <option value="free">Free</option>
                                                <option value="pro">Pro</option>
                                                <option value="business">Business</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-purple-200">{user.blog_id || '-'}</td>
                                        <td className="px-6 py-4 text-purple-200 text-sm">{formatDate(user.created_at)}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.email)}
                                                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="p-6 border-t border-white/10 flex items-center justify-center gap-2">
                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => loadUsers(page)}
                                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${page === pagination.page
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                    )}

                    {users.length === 0 && (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-purple-300/50 mx-auto mb-4" />
                            <p className="text-purple-200">등록된 회원이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
