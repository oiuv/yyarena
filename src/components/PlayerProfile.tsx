'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getRegistrationStatusText, getTournamentStatusText } from '@/utils/statusTranslators';
import Link from 'next/link';

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
  player1_uuid?: string; // Add player1_uuid
  player2_name: string;
  player2_avatar: string;
  player2_uuid?: string; // Add player2_uuid
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
  return <span className={`px-3 py-1 text-base font-semibold rounded-full shadow-sm ${className}`}>{text}</span>;
};

interface Player {
  character_name: string;
  avatar: string;
  game_id: string;
  stream_url?: string;
}

interface PlayerStats {
  total_participations: number;
  first_place_count: number;
  second_place_count: number;
  third_place_count: number;
  forfeit_count: number;
}

export default function PlayerProfile({ playerUuid }: { playerUuid: string }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<TournamentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        const [playerRes, matchHistoryRes] = await Promise.all([
          fetch(`/api/players/${playerUuid}`),
          fetch(`/api/players/${playerUuid}/match-history`),
        ]);

        if (!playerRes.ok) {
          const errorData = await playerRes.json();
          throw new Error(errorData.message || 'Failed to fetch player data');
        }
        const playerData = await playerRes.json();
        setPlayer(playerData.player);
        setStats(playerData.stats);

        if (!matchHistoryRes.ok) {
          const errorData = await matchHistoryRes.json();
          throw new Error(errorData.message || 'Failed to fetch match history');
        }
        const matchHistoryData = await matchHistoryRes.json();
        setMatchHistory(matchHistoryData);
        console.log('Match History Data:', matchHistoryData); // Add this line for debugging

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerUuid]);

  if (loading) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">加载玩家资料中...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-red-500">错误: {error}</div>;
  }

  if (!player) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">未找到玩家资料。</div>;
  }

  // Mask game_id for display
  const maskedGameId = player.game_id ? `${player.game_id.substring(0, 2)}******${player.game_id.substring(player.game_id.length - 2)}` : 'N/A';

  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-12 lg:p-24 text-[#F5F5F5] relative z-0">
      <div className="absolute inset-0 z-[-1]" style={{
        background: 'url(/images/yyarena.png) no-repeat center center fixed',
        backgroundSize: 'cover',
      }}></div>
      <div className="w-full max-w-6xl mx-auto bg-[#2A2A2A]/80 p-6 rounded-2xl shadow-2xl border border-[#B89766]/50">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 text-center text-[#B89766]" style={{ textShadow: '0 0 25px rgba(184,151,102,1.0), 0 0 10px rgba(0,0,0,0.5)' }}>
          {player.character_name} 的主页
        </h1>

        <div className="mb-4 p-4 bg-[#1A1A1A] rounded-lg border border-[#B89766]/30">
          <h2 className="text-2xl font-bold mb-2 text-[#B89766] text-center">个人信息</h2>
          <div className="flex flex-col items-center mb-6">
            <Image
              src={`/avatars/${player.avatar}`}
              alt="Player Avatar"
              width={96}
              height={96}
              className="w-24 h-24 rounded-lg object-cover mb-4 border-2 border-[#B89766]"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="flex items-center p-3 bg-[#2A2A2A] rounded-md border border-[#B89766]/20 transition-all duration-300 hover:scale-[1.02] hover:border-[#B89766]">
                <span className="text-xl mr-3 text-[#B89766]">👤</span>
                <div>
                  <p className="text-sm text-[#F5F5F5]/70">角色名称</p>
                  <p className="text-lg font-semibold text-[#F5F5F5]">{player.character_name}</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-[#2A2A2A] rounded-md border border-[#B89766]/20 transition-all duration-300 hover:scale-[1.02] hover:border-[#B89766]">
                <span className="text-xl mr-3 text-[#B89766]">🆔</span>
                <div>
                  <p className="text-sm text-[#F5F5F5]/70">角色编号</p>
                  <p className="text-lg font-semibold text-[#F5F5F5]">{maskedGameId}</p>
                </div>
              </div>
              {player.stream_url && (
                <div className="flex items-center p-3 bg-[#2A2A2A] rounded-md border border-[#B89766]/20 col-span-full transition-all duration-300 hover:scale-[1.02] hover:border-[#B89766]">
                  <span className="text-xl mr-3 text-[#B89766]">🔗</span>
                  <div>
                    <p className="text-sm text-[#F5F5F5]/70">主页/直播间</p>
                    <a href={player.stream_url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-[#B89766] hover:underline">
                      {player.stream_url}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {stats && (
          <div className="mt-4 p-4 bg-[#1A1A1A] rounded-lg">
            <h2 className="text-2xl font-bold mb-2 text-center text-[#B89766]">比赛统计</h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-[#3A3A3A] p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:border-[#B89766] border border-transparent">
                <p className="text-xl font-bold text-[#F5F5F5]">{stats.total_participations}</p>
                <p className="text-sm text-[#F5F5F5]/70">参赛次数</p>
              </div>
              <div className="bg-[#3A3A3A] p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:border-[#B89766] border border-transparent">
                <p className="text-xl font-bold text-[#F5F5F5]">{stats.first_place_count}</p>
                <p className="text-sm text-[#F5F5F5]/70">第一名</p>
              </div>
              <div className="bg-[#3A3A3A] p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:border-[#B89766] border border-transparent">
                <p className="text-xl font-bold text-[#F5F5F5]">{stats.second_place_count}</p>
                <p className="text-sm text-[#F5F5F5]/70">第二名</p>
              </div>
              <div className="bg-[#3A3A3A] p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:border-[#B89766] border border-transparent">
                <p className="text-xl font-bold text-[#F5F5F5]">{stats.third_place_count}</p>
                <p className="text-sm text-[#F5F5F5]/70">第三名</p>
              </div>
              <div className="bg-[#3A3A3A] p-4 rounded-lg col-span-2 transition-all duration-300 hover:scale-[1.02] hover:border-[#B89766] border border-transparent">
                <p className="text-xl font-bold text-[#F5F5F5]">{stats.forfeit_count}</p>
                <p className="text-sm text-[#F5F5F5]/70">弃权次数</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-8 text-center text-[#B89766]" style={{ textShadow: '0 0 25px rgba(184,151,102,1.0), 0 0 10px rgba(0,0,0,0.5)' }}>
            比赛记录
          </h2>
          {matchHistory.length === 0 ? (
            <div className="text-center py-16 bg-[#1A1A1A]/70 rounded-lg border border-[#B89766]/30 shadow-inner">
              <p className="text-xl text-[#F5F5F5]/70 mb-6">江湖之路，尚未开启。该玩家还没有参与过任何比赛。</p>
            </div>
          ) : (
            <div className="space-y-6">
              {matchHistory
                .filter(tournament => tournament.tournament_status === 'ongoing' || tournament.tournament_status === 'finished')
                .map((tournament) => (
                <div
                  key={tournament.tournament_id}
                  className="bg-[#1A1A1A]/70 border border-[#B89766]/30 p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-[#B89766]/20 hover:border-[#B89766] hover:scale-[1.02]"
                >
                  <h2 className="text-3xl font-bold mb-4 text-center text-[#B89766]">{tournament.tournament_name}</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-4 text-[#F5F5F5]/90">
                    <p><strong>主 办 方:</strong> <span className="px-3 py-1 text-base font-semibold rounded-full shadow-sm bg-[#B89766] text-[#F5F5F5]">{tournament.organizer_name}</span></p>
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
                      <h3 className="text-2xl font-semibold mb-4 text-center text-[#F5F5F5] border-t border-b border-[#B89766]/50 py-3">
                        对局记录
                      </h3>
                      <div className="space-y-4 overflow-x-auto pb-4">
                        {tournament.matches.map((match) => (
                          <div key={match.match_id} className="bg-[#2A2A2A]/80 p-6 rounded-lg border border-[#B89766]/40">
                            <p className="text-center text-lg font-semibold mb-4 text-[#B89766]">第 {match.round_number} 回合</p>
                            <div className="flex flex-row items-center justify-around space-x-4">
                              <div className="flex flex-col items-center text-center w-32">
                                {match.player1_uuid ? (
                                  <Link href={`/players/${match.player1_uuid}`}>
                                    <Image
                                      src={`/avatars/${match.player1_avatar || '000.webp'}`}
                                      alt={match.player1_name || '轮空'}
                                      width={80}
                                      height={80}
                                      className={`rounded-full object-cover border-4 ${match.winner_id === match.player1_id ? 'border-green-500' : match.winner_id !== null && match.winner_id !== match.player1_id ? 'border-red-500' : 'border-[#B89766]/50'} cursor-pointer`}
                                    />
                                  </Link>
                                ) : (
                                  <Image
                                    src={`/avatars/${match.player1_avatar || '000.webp'}`}
                                    alt={match.player1_name || '轮空'}
                                    width={80}
                                    height={80}
                                    className={`rounded-full object-cover border-4 ${match.winner_id === match.player1_id ? 'border-green-500' : match.winner_id !== null && match.winner_id !== match.player1_id ? 'border-red-500' : 'border-[#B89766]/50'}`}
                                  />
                                )}
                                <span className="text-md mt-2 font-semibold truncate text-[#F5F5F5]">{match.player1_name || '(轮空)'}</span>
                              </div>
                              <span className="text-4xl font-bold text-[#C83C23]" style={{ textShadow: '0 0 10px rgba(200,60,35,0.7)' }}>VS</span>
                              <div className="flex flex-col items-center text-center w-32">
                                {match.player2_uuid ? (
                                  <Link href={`/players/${match.player2_uuid}`}>
                                    <Image
                                      src={`/avatars/${match.player2_avatar || '000.webp'}`}
                                      alt={match.player2_name || '轮空'}
                                      width={80}
                                      height={80}
                                      className={`rounded-full object-cover border-4 ${match.winner_id === match.player2_id ? 'border-green-500' : match.winner_id !== null && match.winner_id !== match.player2_id ? 'border-red-500' : 'border-[#B89766]/50'} cursor-pointer`}
                                    />
                                  </Link>
                                ) : (
                                  <Image
                                    src={`/avatars/${match.player2_avatar || '000.webp'}`}
                                    alt={match.player2_name || '轮空'}
                                    width={80}
                                    height={80}
                                    className={`rounded-full object-cover border-4 ${match.winner_id === match.player2_id ? 'border-green-500' : match.winner_id !== null && match.winner_id !== match.player2_id ? 'border-red-500' : 'border-[#B89766]/50'}`}
                                  />
                                )}
                                <span className="text-md mt-2 font-semibold truncate text-[#F5F5F5]">{match.player2_name || '(轮空)'}</span>
                              </div>
                            </div>
                            <div className="mt-6 text-center">
                              {match.winner_name ? (
                                <div className="flex items-center justify-center space-x-3">
                                  <span className="text-lg font-semibold text-[#F5F5F5]/80">胜者:</span>
                                  <Image
                                    src={`/avatars/${match.winner_avatar || '000.webp'}`}
                                    alt={match.winner_name}
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover border-2 border-[#B89766]"
                                  />
                                  <span className="text-xl font-bold text-[#B89766]">{match.winner_name}</span>
                                </div>
                              ) : (
                                <p className="text-lg font-semibold text-[#F5F5F5]/60">此局胜负未定</p>
                              )}
                            </div>
                            <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center text-sm text-[#F5F5F5]/70 border-t border-[#B89766]/40 pt-3">
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
                      <h3 className="text-2xl font-semibold mb-4 text-center text-[#F5F5F5] border-t border-b border-[#B89766]/50 py-3">
                        我的战利品
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tournament.awards.map((award, index) => (
                          <div key={index} className="bg-[#2A2A2A]/80 p-4 rounded-lg border border-[#B89766]/60 flex items-center space-x-4">
                            <Image
                              src={award.prize_image_url ? `/avatars/${award.prize_image_url}` : '/images/default_cover.jpg'}
                              alt={award.prize_name}
                              width={64}
                              height={64}
                              className="rounded-md object-cover"
                            />
                            <div>
                              <p className="font-bold text-[#B89766]">{award.prize_name}</p>
                              <p className="text-sm text-[#F5F5F5]/70">{award.prize_description}</p>
                              <p className="text-xs text-[#F5F5F5]/60 mt-1">发放于: {new Date(award.awarded_at).toLocaleDateString()}</p>
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
      </div>
    </main>
  );
}
