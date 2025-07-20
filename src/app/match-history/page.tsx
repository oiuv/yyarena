'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/utils/clientAuth';
import Image from 'next/image';

interface Match {
  match_id: number;
  round_number: number;
  player1_id: number;
  player2_id: number;
  winner_id: number | null;
  match_status: string;
  finished_at: string;
  player1_name: string;
  player2_name: string;
  winner_name: string | null;
}

interface TournamentEntry {
  registration_id: number;
  registration_time: string;
  registration_status: string;
  tournament_id: number;
  tournament_name: string;
  start_time: string;
  registration_deadline: string;
  tournament_status: string;
  organizer_name: string;
  matches: Match[];
  awards: any[]; // Placeholder for awards
}

export default function MatchHistoryPage() {
  const [matchHistory, setMatchHistory] = useState<TournamentEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMatchHistory = async () => {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('/api/users/me/match-history', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch match history');
        }

        const data: TournamentEntry[] = await res.json();
        setMatchHistory(data);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching match history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchHistory();
  }, [router]);

  if (loading) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">加载比赛记录中...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-red-500">错误: {error}</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 lg:p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">我的比赛记录</h1>

      {matchHistory.length === 0 ? (
        <p>您还没有参与过任何比赛。</p>
      ) : (
        <div className="w-full max-w-4xl">
          {matchHistory.map((tournament) => (
            <div key={tournament.tournament_id} className="bg-gray-800 p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-2xl font-bold mb-4">{tournament.tournament_name}</h2>
              <p><strong>主办方:</strong> {tournament.organizer_name}</p>
              <p><strong>报名时间:</strong> {new Date(tournament.registration_time).toLocaleString()}</p>
              <p><strong>比赛开始时间:</strong> {new Date(tournament.start_time).toLocaleString()}</p>
              <p><strong>比赛状态:</strong> {tournament.tournament_status}</p>
              <p><strong>报名状态:</strong> {tournament.registration_status}</p>

              {tournament.matches.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xl font-bold mb-3">我的对局</h3>
                  {tournament.matches.map((match) => (
                    <div key={match.match_id} className="bg-gray-700 p-4 rounded-lg mb-3">
                      <p><strong>回合:</strong> {match.round_number}</p>
                      <p><strong>对阵:</strong> {match.player1_name} vs {match.player2_name}</p>
                      <p><strong>获胜者:</strong> {match.winner_name || '待定'}</p>
                      <p><strong>对局状态:</strong> {match.match_status}</p>
                      {match.finished_at && <p><strong>结束时间:</strong> {new Date(match.finished_at).toLocaleString()}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Placeholder for awards */}
              {tournament.awards.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xl font-bold mb-3">我的奖品</h3>
                  {/* Render awards here */}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
