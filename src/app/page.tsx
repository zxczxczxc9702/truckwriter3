'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo & Title */}
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 text-center">
          TruckWriter
        </h1>

        <p className="text-xl text-purple-200 mb-16 text-center max-w-md">
          트럭 매매 전용 AI 블로그 자동화
        </p>

        {/* Main Action Button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link
            href="/create"
            className="group bg-gradient-to-r from-purple-500 to-pink-500 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center gap-3"
          >
            바로 시작하기
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Auth Buttons */}
        <div className="flex gap-4">
          <Link
            href="/login"
            className="bg-white/10 backdrop-blur-sm text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20"
          >
            로그인
          </Link>

          <Link
            href="/signup"
            className="bg-white text-purple-900 px-8 py-3 rounded-xl font-semibold hover:bg-purple-100 transition-all"
          >
            가입하기
          </Link>
        </div>
      </div>
    </div>
  );
}
