'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
        const res = await fetch('/api/users/me/match-history', {
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

  const handleWithdraw = async (registrationId: number) => {
    const token = getToken();
    if (!token) {
      alert('请先登录');
      return;
    }

    if (!confirm('确定要退出本次报名吗？')) {
      return;
    }

    try {
      const res = await fetch(`/api/registrations/${registrationId}/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        // Refresh registrations list
        window.location.reload();
      } else {
        alert(`错误: ${data.message}`);
      }
    } catch (err) {
      alert('一个未知错误发生');
    }
  };

  const handleReRegister = async (tournamentId: number) => {
    const token = getToken();
    if (!token) {
      alert('请先登录');
      return;
    }

    if (!confirm('确定要重新报名本次比赛吗？')) {
      return;
    }

    try {
      const res = await fetch(`/api/registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tournamentId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        // Refresh registrations list
        window.location.reload();
      } else {
        alert(`错误: ${data.message}`);
      }
    } catch (err) {
      alert('一个未知错误发生');
    }
  };

  if (loading) {
    return <div className="text-center p-8">加载中...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  if (!currentUser || (currentUser.role !== 'player' && currentUser.role !== 'organizer')) {
    return <div className="text-red-500 text-center p-8">只有玩家或主办方才能查看报名列表。</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 lg:p-12 bg-gray-900 text-white">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center">我的报名</h1>
      <div className="w-full max-w-full md:max-w-4xl px-2 md:px-0">
        {registrations.length > 0 ? (
          <ul>
            {registrations.map((reg: any) => (
              <li key={reg.registration_id} className="p-4 bg-gray-800 rounded-lg shadow-md mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="mb-3 sm:mb-0 text-left">
                  <Link href={`/tournaments/details?id=${reg.tournament_id}`} className="block hover:bg-gray-700 p-2 rounded">
                    <h3 className="text-lg md:text-xl font-bold">{reg.tournament_name}</h3>
                    <p className="text-sm md:text-base">主办方: {reg.organizer_name}</p>
                    <p className="text-sm md:text-base">报名时间: {new Date(reg.registration_time).toLocaleString()}</p>
                    <p className="text-sm md:text-base">比赛开始: {new Date(reg.start_time).toLocaleString()}</p>
                    <p className="text-sm md:text-base">报名截止: {new Date(reg.registration_deadline).toLocaleString()}</p>
                    <p className="text-sm md:text-base">报名状态: {getRegistrationStatusText(reg.registration_status)}</p>
                    <p className="text-sm md:text-base">比赛状态: {getTournamentStatusText(reg.tournament_status)}</p>
                  </Link>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {reg.registration_status === 'active' && 
                   reg.tournament_status !== 'ongoing' && 
                   reg.tournament_status !== 'finished' && 
                   new Date() < new Date(reg.registration_deadline) && (
                    <button
                      onClick={() => handleWithdraw(reg.registration_id)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded w-full sm:w-auto text-sm md:text-base"
                    >
                      退出报名
                    </button>
                  )}
                  {reg.registration_status === 'withdrawn' && 
                   reg.tournament_status !== 'ongoing' && 
                   reg.tournament_status !== 'finished' && 
                   new Date() < new Date(reg.registration_deadline) && (
                    <button
                      onClick={() => handleReRegister(reg.tournament_id)}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded w-full sm:w-auto text-sm md:text-base"
                    >
                      重新报名
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-base md:text-xl">您还没有报名任何比赛。</p>
        )}
      </div>
    </main>
  );
}