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
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-brand-charcoal text-brand-ivory">
        <div className="text-2xl font-bold bg-brand-charcoal/80 p-4 rounded-lg">加载比赛记录中...</div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-brand-charcoal text-brand-ivory">
        <div className="text-2xl font-bold text-brand-red bg-brand-charcoal/80 p-4 rounded-lg">错误: {error}</div>
      </div>
    );
  }

  // 主页面渲染
  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-12 lg:p-24 text-brand-ivory relative z-0">
      <div className="absolute inset-0 z-[-1]" style={{
        background: 'url(/images/yyarena.png) no-repeat center center fixed',
        backgroundSize: 'cover',
      }}></div>
      <div className="w-full max-w-6xl mx-auto bg-brand-charcoal/80 p-8 rounded-2xl shadow-2xl border border-brand-gold/50">
        <h1 className="text-5xl font-extrabold mb-10 text-center text-brand-gold" style={{ textShadow: '0 0 25px rgba(184,151,102,1.0), 0 0 10px rgba(0,0,0,0.5)' }}>
          我的比赛记录
        </h1>

        {matchHistory.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-brand-ivory/70 mb-6">江湖之路，尚未开启。您还没有参与过任何比赛。</p>
            <button
              onClick={() => router.push('/')}
              className="bg-brand-gold hover:bg-brand-gold/90 text-brand-charcoal font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-brand-gold/20"
            >
              浏览比赛，一战成名
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {matchHistory.map((tournament) => (
              <div
                key={tournament.tournament_id}
                className="bg-brand-charcoal/70 border border-brand-gold/30 p-8 rounded-xl shadow-lg transition-all duration-300 hover:shadow-brand-gold/20 hover:border-brand-gold hover:scale-[1.02]"
              >
                <h2 className="text-3xl font-bold mb-6 text-center text-brand-gold">{tournament.tournament_name}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8 text-brand-ivory/90">
                  <p><strong>主办方:</strong> <span className="font-mono">{tournament.organizer_name}</span></p>
                  <div className="flex items-center space-x-3">
                    <strong>比赛状态:</strong>
                    <StatusBadge status={tournament.tournament_status} type="tournament" />
                  </div>

                  <p><strong>报名时间:</strong> <span className="font-mono">{new Date(tournament.registration_time).toLocaleString()}</span></p>
                  <div className="flex items-center space-x-3">
                    <strong>报名状态:</strong>
                    <StatusBadge status={tournament.registration_status} type="registration" />
                  </div>
                  <p><strong>开赛时间:</strong> <span className="font-mono">{new Date(tournament.start_time).toLocaleString()}</span></p>
                </div>

                {tournament.matches.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-semibold mb-6 text-center text-brand-ivory border-t border-b border-brand-gold/50 py-3">
                      我的对局
                    </h3>
                    <div className="space-y-6">
                      {tournament.matches.map((match) => (
                        <div key={match.match_id} className="bg-brand-charcoal/80 p-6 rounded-lg border border-brand-gold/40">
                          <p className="text-center text-lg font-semibold mb-4 text-brand-gold">第 {match.round_number} 回合</p>
                          <div className="flex items-center justify-around space-x-4">
                            <div className="flex flex-col items-center text-center w-32">
                              <Image
                                src={`/avatars/${match.player1_avatar || '000.webp'}`}
                                alt={match.player1_name || '轮空'}
                                width={80}
                                height={80}
                                className="rounded-full object-cover border-4 border-brand-gold/50"
                              />
                              <span className="text-md mt-2 font-semibold truncate text-brand-ivory">{match.player1_name || '(轮空)'}</span>
                            </div>
                            <span className="text-4xl font-bold text-brand-red" style={{ textShadow: '0 0 10px rgba(200,60,35,0.7)' }}>VS</span>
                            <div className="flex flex-col items-center text-center w-32">
                              <Image
                                src={`/avatars/${match.player2_avatar || '000.webp'}`}
                                alt={match.player2_name || '轮空'}
                                width={80}
                                height={80}
                                className="rounded-full object-cover border-4 border-brand-gold/50"
                              />
                              <span className="text-md mt-2 font-semibold truncate text-brand-ivory">{match.player2_name || '(轮空)'}</span>
                            </div>
                          </div>
                          <div className="mt-6 text-center">
                            {match.winner_name ? (
                              <div className="flex items-center justify-center space-x-3">
                                <span className="text-lg font-semibold text-brand-ivory/80">胜者:</span>
                                <Image
                                  src={`/avatars/${match.winner_avatar || '000.webp'}`}
                                  alt={match.winner_name}
                                  width={40}
                                  height={40}
                                  className="rounded-full object-cover border-2 border-brand-gold"
                                />
                                <span className="text-xl font-bold text-brand-gold">{match.winner_name}</span>
                              </div>
                            ) : (
                              <p className="text-lg font-semibold text-brand-ivory/60">胜负未分</p>
                            )}
                          </div>
                          <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center text-sm text-brand-ivory/70 border-t border-brand-gold/40 pt-3">
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

                {/* 奖品渲染 */}
                {tournament.awards.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-semibold mb-6 text-center text-brand-ivory border-t border-b border-brand-gold/50 py-3">
                      我的战利品
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tournament.awards.map((award, index) => (
                        <div key={index} className="bg-brand-charcoal/80 p-4 rounded-lg border border-brand-gold/60 flex items-center space-x-4">
                          <Image
                            src={award.prize_image_url ? `/avatars/${award.prize_image_url}` : '/images/default_cover.jpg'}
                            alt={award.prize_name}
                            width={64}
                            height={64}
                            className="rounded-md object-cover"
                          />
                          <div>
                            <p className="font-bold text-brand-gold">{award.prize_name}</p>
                            <p className="text-sm text-brand-ivory/70">{award.prize_description}</p>
                            <p className="text-xs text-brand-ivory/60 mt-1">发放于: {new Date(award.awarded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
