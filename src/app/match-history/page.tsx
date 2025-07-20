'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/utils/clientAuth';
import Image from 'next/image';
import { getRegistrationStatusText, getTournamentStatusText } from '@/utils/statusTranslators';

// 定义比赛和锦标赛的数据结构
interface Match {
  match_id: number;
  round_number: number;
  player1_id: number;
  player2_id: number;
  winner_id: number | null;
  match_status: string;
  finished_at: string;
  player1_name: string;
  player1_avatar: string;
  player2_name: string;
  player2_avatar: string;
  winner_name: string | null;
  winner_avatar: string;
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
  awards: any[]; // 奖品占位符
}

// 状态徽章组件
const StatusBadge = ({ status, type }: { status: string; type: 'tournament' | 'registration' | 'match' }) => {
  const { text, className } = type === 'tournament' || type === 'match'
    ? getTournamentStatusText(status)
    : getRegistrationStatusText(status);
  return <span className={`px-3 py-1 text-sm font-semibold rounded-full ${className}`}>{text}</span>;
};

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
          throw new Error(errorData.message || '获取比赛记录失败');
        }

        const data: TournamentEntry[] = await res.json();
        setMatchHistory(data);
      } catch (err: any) {
        setError(err.message);
        console.error('获取比赛记录时出错:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchHistory();
  }, [router]);

  // 加载状态
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24" style={{
        background: 'url(/images/yyarena.png) no-repeat center center fixed',
        backgroundSize: 'cover',
      }}>
        <div className="text-2xl font-bold text-white bg-black bg-opacity-50 p-4 rounded-lg">加载比赛记录中...</div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24" style={{
        background: 'url(/images/yyarena.png) no-repeat center center fixed',
        backgroundSize: 'cover',
      }}>
        <div className="text-2xl font-bold text-red-500 bg-black bg-opacity-50 p-4 rounded-lg">错误: {error}</div>
      </div>
    );
  }

  // 主页面渲染
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-12 lg:p-24" style={{
      background: 'url(/images/yyarena.png) no-repeat center center fixed',
      backgroundSize: 'cover',
    }}>
      <div className="w-full max-w-6xl mx-auto bg-black bg-opacity-60 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h1 className="text-5xl font-extrabold mb-10 text-center text-gray-100" style={{ textShadow: '0 0 15px rgba(255,255,255,0.5)' }}>
          我的比赛记录
        </h1>

        {matchHistory.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-gray-400 mb-6">江湖之路，尚未开启。您还没有参与过任何比赛。</p>
            <button
              onClick={() => router.push('/')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
            >
              浏览比赛，一战成名
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {matchHistory.map((tournament) => (
              <div
                key={tournament.tournament_id}
                className="bg-gray-900 bg-opacity-70 border border-gray-700 p-8 rounded-xl shadow-lg transition-all duration-300 hover:shadow-yellow-500/20 hover:border-yellow-600 hover:scale-[1.02]"
              >
                <h2 className="text-3xl font-bold mb-6 text-center text-yellow-400">{tournament.tournament_name}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8 text-gray-300">
                  <p><strong>主办方:</strong> <span className="font-mono">{tournament.organizer_name}</span></p>
                  <p><strong>报名时间:</strong> <span className="font-mono">{new Date(tournament.registration_time).toLocaleString()}</span></p>
                  <p><strong>比赛开始:</strong> <span className="font-mono">{new Date(tournament.start_time).toLocaleString()}</span></p>
                  <div className="flex items-center space-x-3">
                    <strong>比赛状态:</strong>
                    <StatusBadge status={tournament.tournament_status} type="tournament" />
                  </div>
                  <div className="flex items-center space-x-3">
                    <strong>报名状态:</strong>
                    <StatusBadge status={tournament.registration_status} type="registration" />
                  </div>
                </div>

                {tournament.matches.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-semibold mb-6 text-center text-gray-200 border-t border-b border-gray-700 py-3">
                      我的对局
                    </h3>
                    <div className="space-y-6">
                      {tournament.matches.map((match) => (
                        <div key={match.match_id} className="bg-gray-800 bg-opacity-80 p-6 rounded-lg border border-gray-600">
                          <p className="text-center text-lg font-semibold mb-4 text-yellow-500">第 {match.round_number} 回合</p>
                          <div className="flex items-center justify-around space-x-4">
                            <div className="flex flex-col items-center text-center w-32">
                              <Image
                                src={`/avatars/${match.player1_avatar || '000.webp'}`}
                                alt={match.player1_name || '轮空'}
                                width={80}
                                height={80}
                                className="rounded-full object-cover border-4 border-gray-600"
                              />
                              <span className="text-md mt-2 font-semibold truncate">{match.player1_name || '(轮空)'}</span>
                            </div>
                            <span className="text-4xl font-bold text-red-600" style={{ textShadow: '0 0 10px rgba(255,0,0,0.7)' }}>VS</span>
                            <div className="flex flex-col items-center text-center w-32">
                              <Image
                                src={`/avatars/${match.player2_avatar || '000.webp'}`}
                                alt={match.player2_name || '轮空'}
                                width={80}
                                height={80}
                                className="rounded-full object-cover border-4 border-gray-600"
                              />
                              <span className="text-md mt-2 font-semibold truncate">{match.player2_name || '(轮空)'}</span>
                            </div>
                          </div>
                          <div className="mt-6 text-center">
                            {match.winner_name ? (
                              <div className="flex items-center justify-center space-x-3">
                                <span className="text-lg font-semibold text-gray-300">胜者:</span>
                                <Image
                                  src={`/avatars/${match.winner_avatar || '000.webp'}`}
                                  alt={match.winner_name}
                                  width={40}
                                  height={40}
                                  className="rounded-full object-cover border-2 border-yellow-400"
                                />
                                <span className="text-xl font-bold text-yellow-400">{match.winner_name}</span>
                              </div>
                            ) : (
                              <p className="text-lg font-semibold text-gray-400">胜负未分</p>
                            )}
                          </div>
                          <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center text-sm text-gray-400 border-t border-gray-700 pt-3">
                            <div>
                              <strong>对局状态:</strong>
                              <StatusBadge status={match.match_status} type="match" />
                            </div>
                            {match.finished_at && <p><strong>结束时间:</strong> {new Date(match.finished_at).toLocaleString()}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 奖品占位符 */}
                {tournament.awards.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-semibold mb-4 text-center text-gray-200">我的奖品</h3>
                    {/* 在此渲染奖品 */}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
