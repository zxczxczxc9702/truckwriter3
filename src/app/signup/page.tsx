'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Loader2, Truck, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 비밀번호 확인
        if (formData.password !== formData.confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (formData.password.length < 6) {
            setError('비밀번호는 6자 이상이어야 합니다.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } else {
                setError(result.error || '회원가입에 실패했습니다.');
            }
        } catch {
            setError('서버 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">회원가입 완료!</h2>
                    <p className="text-purple-200">로그인 페이지로 이동합니다...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-4">
                        <Truck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">TruckWriter</h1>
                    <p className="text-purple-200 mt-2">무료로 시작하세요</p>
                </div>

                {/* Signup Form */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">회원가입</h2>

                    {error && (
                        <div className="bg-red-500/20 border border-red-400/30 text-red-200 px-4 py-3 rounded-xl mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">
                                이름 (선택)
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="홍길동"
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">
                                이메일 *
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@example.com"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">
                                비밀번호 * (6자 이상)
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">
                                비밀번호 확인 *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                <input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    가입 중...
                                </>
                            ) : (
                                <>
                                    무료로 시작하기
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Free Plan Info */}
                    <div className="mt-6 p-4 bg-green-500/10 border border-green-400/30 rounded-xl">
                        <p className="text-green-200 text-sm text-center">
                            🎉 무료 플랜: 매월 <strong>3회</strong> 블로그 글 생성 가능
                        </p>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-purple-200">
                            이미 계정이 있으신가요?{' '}
                            <Link href="/login" className="text-pink-400 hover:text-pink-300 font-medium">
                                로그인
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-purple-300/60 text-sm mt-8">
                    © 2024 TruckWriter. All rights reserved.
                </p>
            </div>
        </div>
    );
}
