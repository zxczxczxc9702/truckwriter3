'use client';

import { useState } from 'react';
import { Eye, Edit, Trash2, Phone, TrendingUp } from 'lucide-react';

export default function PostsPage() {
    const [posts] = useState([
        {
            id: 1,
            title: '2018년식 메가트럭 카고 사고 없음 급매',
            region: '서울',
            vehicleType: '메가트럭',
            price: '3,500만원',
            views: 156,
            calls: 8,
            searchRank: 3,
            createdAt: '2024-01-15',
        },
        {
            id: 2,
            title: '인천 3.5톤 냉동탑차 실주행 18만km 특A급',
            region: '인천',
            vehicleType: '냉동탑차',
            price: '2,800만원',
            views: 243,
            calls: 12,
            searchRank: 1,
            createdAt: '2024-01-14',
        },
        {
            id: 3,
            title: '대구 덤프트럭 2020년식 저렴하게 판매',
            region: '대구',
            vehicleType: '덤프트럭',
            price: '4,200만원',
            views: 198,
            calls: 6,
            searchRank: 5,
            createdAt: '2024-01-13',
        },
    ]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold text-white">게시글 관리</h1>
                    <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg">
                        전체 재최적화
                    </button>
                </div>

                <div className="space-y-4">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function PostCard({ post }: any) {
    return (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{post.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-300 mb-4">
                        <span className="bg-purple-500/20 px-3 py-1 rounded-full">{post.vehicleType}</span>
                        <span className="bg-blue-500/20 px-3 py-1 rounded-full">{post.region}</span>
                        <span className="font-semibold text-green-400">{post.price}</span>
                        <span className="text-gray-400">{post.createdAt}</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-blue-300">
                            <Eye className="w-5 h-5" />
                            <span className="font-semibold">{post.views}</span>
                            <span className="text-sm text-gray-400">조회</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-300">
                            <Phone className="w-5 h-5" />
                            <span className="font-semibold">{post.calls}</span>
                            <span className="text-sm text-gray-400">전화</span>
                        </div>
                        <div className="flex items-center gap-2 text-yellow-300">
                            <TrendingUp className="w-5 h-5" />
                            <span className="font-semibold">#{post.searchRank}</span>
                            <span className="text-sm text-gray-400">검색순위</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors">
                        <Edit className="w-5 h-5" />
                    </button>
                    <button className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
