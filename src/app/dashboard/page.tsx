'use client';

import { FileText, TrendingUp, Phone, Eye, Plus, Layers, Shield } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">대시보드</h1>
          <div className="flex gap-3">
            <Link
              href="/create"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-2 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              새 글 작성
            </Link>
            <Link
              href="/bulk"
              className="flex items-center gap-2 bg-white/10 text-white font-semibold py-2 px-4 rounded-xl hover:bg-white/20 transition-all border border-white/20"
            >
              <Layers className="w-5 h-5" />
              대량 발행
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-2 bg-white/10 text-white font-semibold py-2 px-4 rounded-xl hover:bg-white/20 transition-all border border-white/20"
            >
              <Shield className="w-5 h-5" />
              관리자
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={<FileText className="w-8 h-8" />}
            title="총 게시글"
            value="24"
            change="+12%"
            color="from-blue-500 to-cyan-500"
          />
          <StatCard
            icon={<Eye className="w-8 h-8" />}
            title="총 조회수"
            value="1,240"
            change="+23%"
            color="from-purple-500 to-pink-500"
          />
          <StatCard
            icon={<Phone className="w-8 h-8" />}
            title="전화 클릭"
            value="45"
            change="+8%"
            color="from-green-500 to-emerald-500"
          />
          <StatCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="검색 유입"
            value="890"
            change="+15%"
            color="from-orange-500 to-red-500"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, change, color }: any) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-lg hover:scale-105 transition-transform`}>
      <div className="flex items-center justify-between mb-4">
        {icon}
        <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">{change}</span>
      </div>
      <h3 className="text-sm font-medium opacity-90">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
