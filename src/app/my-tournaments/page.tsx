'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/utils/clientAuth';
import Link from 'next/link';
import { getTournamentStatusText } from '@/utils/statusTranslators';

interface Tournament {
  id: number;
  name: string;
  start_time: string;
  registration_deadline: string;
  status: string;
  min_players: number;
  max_players: number;
  event_description: string;
  organizer_name: string;
}

export default function MyTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMyTournaments = async () => {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/users/me/tournaments', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '获取我的比赛列表失败');
        }

        const data = await response.json();
        setTournaments(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTournaments();
  }, [router]);

  if (loading) {
    return <div className="text-center text-white text-xl">加载中...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 text-xl">错误: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-white mb-8">我创建的比赛</h1>
      {tournaments.length === 0 ? (
        <p className="text-white text-lg">您还没有创建任何比赛。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-white mb-2">{tournament.name}</h2>
              <p className="text-gray-300 mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
              <p className="text-gray-300 mb-1">报名截止: {new Date(tournament.registration_deadline).toLocaleString()}</p>
              <p className="text-gray-300 mb-1">状态: {getTournamentStatusText(tournament.status).text}</p>
              <p className="text-gray-300 mb-4">参赛人数: {tournament.min_players}-{tournament.max_players}</p>
              <Link href={`/tournaments/details?id=${tournament.id}`}>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  查看详情
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
