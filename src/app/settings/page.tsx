'use client';

import { useState } from 'react';
import { User, Bell, Key, Shield, Save } from 'lucide-react';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        companyName: '',
        sellerName: '',
        phone: '',
        region: '',
        emailNotifications: true,
        smsNotifications: false,
        autoPublish: true,
        seoOptimization: true,
        lowQualityFilter: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Settings saved:', settings);
        // TODO: API 호출
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">설정</h1>
                    <p className="text-purple-200">계정과 서비스 설정을 관리합니다</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 프로필 설정 */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <User className="w-6 h-6" />
                            프로필 설정
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    회사명
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: OO트럭매매"
                                    value={settings.companyName}
                                    onChange={(e) =>
                                        setSettings({ ...settings, companyName: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    담당자명
                                </label>
                                <input
                                    type="text"
                                    placeholder="홍길동"
                                    value={settings.sellerName}
                                    onChange={(e) =>
                                        setSettings({ ...settings, sellerName: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    전화번호
                                </label>
                                <input
                                    type="tel"
                                    placeholder="010-XXXX-XXXX"
                                    value={settings.phone}
                                    onChange={(e) =>
                                        setSettings({ ...settings, phone: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    주요 활동 지역
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: 서울, 경기"
                                    value={settings.region}
                                    onChange={(e) =>
                                        setSettings({ ...settings, region: e.target.value })
                                    }
                                    className="w- px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 알림 설정 */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Bell className="w-6 h-6" />
                            알림 설정
                        </h2>

                        <div className="space-y-4">
                            <ToggleSwitch
                                label="이메일 알림"
                                description="새로운 조회 및 연락이 있을 때 이메일로 알림받기"
                                checked={settings.emailNotifications}
                                onChange={(checked: boolean) =>
                                    setSettings({ ...settings, emailNotifications: checked })
                                }
                            />
                            <ToggleSwitch
                                label="SMS 알림"
                                description="중요한 업데이트를 SMS로 받기"
                                checked={settings.smsNotifications}
                                onChange={(checked: boolean) =>
                                    setSettings({ ...settings, smsNotifications: checked })
                                }
                            />
                        </div>
                    </div>

                    {/* 자동화 설정 */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Shield className="w-6 h-6" />
                            자동화 설정
                        </h2>

                        <div className="space-y-4">
                            <ToggleSwitch
                                label="자동 발행"
                                description="블로그 글 생성 후 자동으로 네이버 블로그에 발행"
                                checked={settings.autoPublish}
                                onChange={(checked: boolean) =>
                                    setSettings({ ...settings, autoPublish: checked })
                                }
                            />
                            <ToggleSwitch
                                label="SEO 자동 최적화"
                                description="키워드 및 검색 엔진 최적화 자동 적용"
                                checked={settings.seoOptimization}
                                onChange={(checked: boolean) =>
                                    setSettings({ ...settings, seoOptimization: checked })
                                }
                            />
                            <ToggleSwitch
                                label="저품질 필터 방지"
                                description="네이버 저품질 필터를 회피하는 콘텐츠 생성"
                                checked={settings.lowQualityFilter}
                                onChange={(checked: boolean) =>
                                    setSettings({ ...settings, lowQualityFilter: checked })
                                }
                            />
                        </div>
                    </div>

                    {/* API 키 설정 */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Key className="w-6 h-6" />
                            API 연동
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    네이버 API 키
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    AI API 키 (OpenAI, Claude 등)
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 저장 버튼 */}
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
                    >
                        <Save className="w-6 h-6" />
                        설정 저장
                    </button>
                </form>
            </div>
        </div>
    );
}

interface ToggleSwitchProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function ToggleSwitch({ label, description, checked, onChange }: ToggleSwitchProps) {
    return (
        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">{label}</h3>
                <p className="text-sm text-purple-200">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${checked ? 'bg-purple-500' : 'bg-white/20'
                    }`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-8' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
}
