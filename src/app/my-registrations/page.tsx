'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { jwtDecode } from 'jwt-decode';

import { getToken } from '@/utils/clientAuth'; // Assuming getToken is in clientAuth.ts
import { getRegistrationStatusText, getTournamentStatusText } from '@/utils/statusTranslators';

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        setCurrentUser(jwtDecode(token));
      } catch (e) {
        console.error('Invalid token', e);
        setError('登录状态无效，请重新登录。');
        setLoading(false);
        return;
      }
    } else {
      setError('请先登录以查看您的报名。');
      setLoading(false);
      return;
    }

    const fetchRegistrations = async () => {
      try {
        const res = await fetch('/api/users/me/registrations', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setRegistrations(data);
        } else {
          setError(data.message || '获取报名列表失败。');
        }
      } catch (err) {
        setError('获取报名列表时发生网络错误。');
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, []);

  if (loading) {
    return <div className="text-center p-8 text-[#F5F5F5]">加载中...</div>;
  }

  if (error) {
    return <div className="text-[#C83C23] text-center p-8">{error}</div>;
  }

  if (!currentUser || (currentUser.role !== 'player' && currentUser.role !== 'organizer')) {
    return <div className="text-[#C83C23] text-center p-8">只有玩家或主办方才能查看报名列表。</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 lg:p-12 bg-[#1A1A1A] text-[#F5F5F5]">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center text-[#B89766]">我的报名</h1>
      <div className="w-full max-w-6xl px-2 md:px-0">
        {registrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registrations.map((reg: any) => (
              <div key={reg.registration_id} className="p-6 bg-[#2A2A2A] rounded-lg shadow-md border border-[#B89766]/50 transition-transform duration-300 hover:scale-[1.02]">
                <Link href={`/tournaments/details?id=${reg.tournament_id}`} className="block">
                  <div className="relative w-full h-48 mb-4 rounded-md overflow-hidden">
                    <Image
                      src={reg.cover_image_url ? `/${reg.cover_image_url.startsWith('/') ? reg.cover_image_url.substring(1) : reg.cover_image_url}` : '/images/default_cover.jpg'}
                      alt={reg.tournament_name}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2 text-[#B89766]">{reg.tournament_name}</h3>
                  <p className="text-sm md:text-base text-[#F5F5F5]">主办方: {reg.organizer_name}</p>
                  <p className="text-sm md:text-base text-[#F5F5F5]">报名时间: {new Date(reg.registration_time).toLocaleString()}</p>
                  <p className="text-sm md:text-base text-[#F5F5F5]">比赛开始: {new Date(reg.start_time).toLocaleString()}</p>
                  <p className="text-sm md:text-base text-[#F5F5F5]">报名截止: {new Date(reg.registration_deadline).toLocaleString()}</p>
                  <p className="text-sm md:text-base text-[#F5F5F5]">报名状态: {getRegistrationStatusText(reg.registration_status).text}</p>
                  <p className="text-sm md:text-base text-[#F5F5F5]">比赛状态: {getTournamentStatusText(reg.tournament_status).text}</p>
                  <button className="mt-4 w-full bg-[#B89766] text-[#1A1A1A] py-2 rounded-md font-bold hover:bg-[#A0855A] transition-colors duration-300">
                    查看详情
                  </button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-base md:text-xl text-[#F5F5F5]">您还没有报名任何比赛。</p>
        )}
      </div>
    </main>
  );
}