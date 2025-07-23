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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-brand-charcoal text-brand-ivory">
        <div className="text-2xl font-bold bg-brand-charcoal/80 p-4 rounded-lg">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-brand-charcoal text-brand-ivory">
        <div className="text-2xl font-bold text-brand-red bg-brand-charcoal/80 p-4 rounded-lg">错误: {error}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-12 lg:p-24 bg-brand-charcoal text-brand-ivory">
      <div className="w-full max-w-6xl mx-auto bg-brand-charcoal/80 p-8 rounded-2xl shadow-2xl border border-brand-gold/50">
        <h1 className="text-4xl font-bold text-brand-gold mb-8 text-center">我创建的比赛</h1>
        {tournaments.length === 0 ? (
          <p className="text-brand-ivory text-lg text-center">您还没有创建任何比赛。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="bg-brand-charcoal/70 rounded-lg shadow-lg shadow-brand-gold/20 border border-brand-gold/30 p-6">
                <h2 className="text-2xl font-semibold text-brand-gold mb-2">{tournament.name}</h2>
                <p className="text-brand-ivory/90 mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                <p className="text-brand-ivory/90 mb-1">报名截止: {new Date(tournament.registration_deadline).toLocaleString()}</p>
                <p className="text-brand-ivory/90 mb-1">状态: {getTournamentStatusText(tournament.status).text}</p>
                <p className="text-brand-ivory/90 mb-4">参赛人数: {tournament.min_players}-{tournament.max_players}</p>
                <div className="flex flex-col md:flex-row gap-2 mt-4">
                  <Link href={`/tournaments/details?id=${tournament.id}`} className="block w-full md:w-auto">
                    <button className="w-full bg-brand-gold hover:bg-brand-gold/80 text-brand-charcoal font-bold py-2 px-4 rounded transition-colors duration-300">
                      查看详情
                    </button>
                  </Link>
                  {tournament.status !== 'ongoing' && tournament.status !== 'finished' && (
                    <Link href={`/tournaments/${tournament.id}/edit`} className="block w-full md:w-auto">
                      <button className="w-full bg-brand-red hover:bg-brand-red/80 text-brand-ivory font-bold py-2 px-4 rounded transition-colors duration-300">
                        编辑
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
