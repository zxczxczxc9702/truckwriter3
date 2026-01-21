'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, FileText, Settings } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: '대시보드' },
        { href: '/create', icon: PlusCircle, label: '새 글 작성' },
        { href: '/posts', icon: FileText, label: '게시글 관리' },
        { href: '/settings', icon: Settings, label: '설정' },
    ];

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-white/10">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-white mb-8">TruckWriter</h1>
                    <nav className="space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                            ? 'bg-purple-500 text-white shadow-lg'
                                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
