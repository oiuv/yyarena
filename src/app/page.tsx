'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getToken } from '@/utils/clientAuth';
import { jwtDecode } from 'jwt-decode';

export default function Home() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [ongoingTournaments, setOngoingTournaments] = useState<any[]>([]);
  const [openForRegistrationTournaments, setOpenForRegistrationTournaments] = useState<any[]>([]);
  const [registrationClosedTournaments, setRegistrationClosedTournaments] = useState<any[]>([]);
  const [finishedTournaments, setFinishedTournaments] = useState<any[]>([]);
  const [failedTournaments, setFailedTournaments] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userRegisteredTournamentIds, setUserRegisteredTournamentIds] = useState<Set<number>>(new Set());
  const [registeredPlayersAvatars, setRegisteredPlayersAvatars] = useState<{ [key: number]: any[] }>({});
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [selectedTournamentForRegistration, setSelectedTournamentForRegistration] = useState<any>(null);
  const [registrationCodeInput, setRegistrationCodeInput] = useState('');

  const fetchRegisteredPlayersAvatars = useCallback(async (tournamentId: number) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/registered-players-avatars?limit=10`);
      if (res.ok) {
        const avatars = await res.json();
        setRegisteredPlayersAvatars(prev => ({ ...prev, [tournamentId]: avatars }));
      }
    } catch (error) {
      console.error(`Error fetching registered players avatars for tournament ${tournamentId}:`, error);
    }
  }, []);

  const executeRegistration = useCallback(async (tournamentId: number, tournamentName: string, code: string | null) => {
    const token = getToken();
    if (!token) {
      alert('请登录后报名比赛。');
      return;
    }

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tournamentId, registrationCode: code }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`成功报名比赛: ${tournamentName}！`);
        setUserRegisteredTournamentIds(prev => new Set(prev).add(tournamentId));
        fetchRegisteredPlayersAvatars(tournamentId);
        setIsRegistrationModalOpen(false); // Close modal on success
        setRegistrationCodeInput(''); // Clear input
      } else {
        alert(`报名失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('报名时发生网络错误。');
    }
  }, [fetchRegisteredPlayersAvatars]);

  const handleRegister = useCallback(async (tournamentId: number, tournamentName: string, requiresCode: boolean) => {
    if (requiresCode) {
      setSelectedTournamentForRegistration({ id: tournamentId, name: tournamentName });
      setIsRegistrationModalOpen(true);
      return;
    }
    
    await executeRegistration(tournamentId, tournamentName, null); // No code needed
  }, [executeRegistration]);

  const handleModalSubmit = () => {
    if (selectedTournamentForRegistration) {
      if (!registrationCodeInput) {
        alert('请输入参赛验证码。');
        return;
      }
      executeRegistration(selectedTournamentForRegistration.id, selectedTournamentForRegistration.name, registrationCodeInput);
    }
  };

  const fetchUserDataAndTournaments = useCallback(async () => {
    const token = getToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        setCurrentUserId(decodedToken.id);

        const registrationsRes = await fetch('/api/users/me/registrations', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (registrationsRes.ok) {
            const registrationsData = await registrationsRes.json();
            const registeredIds: Set<number> = new Set(registrationsData.map((reg: any) => Number(reg.tournament_id)));
            setUserRegisteredTournamentIds(registeredIds);
          }
        } catch (error) {
          console.error('Error decoding token or fetching registrations:', error);
          setCurrentUserId(null);
          setUserRegisteredTournamentIds(new Set());
        }
      }

      try {
        const tournamentsRes = await fetch('/api/tournaments');
        const tournamentsData = await tournamentsRes.json();
        
        const now = new Date();

        const ongoing: any[] = [];
        const openForRegistration: any[] = [];
        const registrationClosed: any[] = [];
        const finished: any[] = [];
        const failed: any[] = [];

        tournamentsData.forEach((tournament: any) => {
          const startTime = new Date(tournament.start_time);
          const registrationDeadline = new Date(tournament.registration_deadline);
          const registeredPlayersCount = tournament.registeredPlayersCount || 0;
          const registrationCode = tournament.registration_code; // Get registration code

          if (tournament.status === 'ongoing') {
            ongoing.push(tournament);
          } else if (tournament.status === 'finished') {
            finished.push(tournament);
          } else if (tournament.status === 'failed') {
            failed.push(tournament);
          } else if (now < registrationDeadline) {
            openForRegistration.push(tournament);
          } else if (now >= registrationDeadline && registeredPlayersCount >= tournament.min_players) {
            registrationClosed.push(tournament);
          } else {
            failed.push(tournament);
          }
        });

        setOngoingTournaments(ongoing);
        setOpenForRegistrationTournaments(openForRegistration);
        setRegistrationClosedTournaments(registrationClosed);
        setFinishedTournaments(finished);
        setFailedTournaments(failed);

        setTournaments(tournamentsData);

        openForRegistration.forEach(tournament => {
          fetchRegisteredPlayersAvatars(tournament.id);
        });

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }, [fetchRegisteredPlayersAvatars]);

  useEffect(() => {
    fetchUserDataAndTournaments();
  }, [fetchUserDataAndTournaments]);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 lg:p-12 bg-gradient-to-br from-gray-950 to-black text-white font-sans">
      <div className="w-full max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 md:mb-12 text-center text-amber-400 drop-shadow-lg">燕云砺兵台</h1>

        {ongoingTournaments.length > 0 && (
          <section className="mb-8 md:mb-12 p-4 md:p-6 bg-gradient-to-br from-red-900 to-red-950 rounded-xl shadow-2xl border-4 border-amber-500 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-amber-300 border-b-2 border-amber-600 pb-2 md:pb-3">⚔️ 激战正酣 ⚔️</h2>
            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {ongoingTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="flex flex-col sm:flex-row items-center p-4 md:p-6 bg-red-800/70 rounded-lg shadow-xl border border-red-600 hover:bg-red-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <div className="relative w-full sm:w-48 h-32 sm:h-28 flex-shrink-0 mb-4 sm:mb-0 sm:mr-6 rounded-lg overflow-hidden border border-red-500">
                    <Image
                      src={tournament.cover_image_url || '/images/default_cover.jpg'}
                      alt={tournament.name}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-grow text-center sm:text-left">
                    <h3 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-amber-200 group-hover:text-amber-500 transition-colors duration-300">{tournament.name}</h3>
                    <p className="text-red-100 text-sm md:text-base mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                    <p className="text-red-100 text-sm md:text-base mb-1">已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                    {tournament.room_name && <p className="text-red-100 text-sm md:text-base mb-1">房间名: {tournament.room_name}</p>}
                    {tournament.room_number && <p className="text-red-100 text-sm md:text-base mb-1">房间号: {tournament.room_number}</p>}
                    
                    {tournament.stream_url && <p className="text-red-100 text-sm md:text-base mb-1">直播间/主页: <a href={tournament.stream_url} target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:underline">{tournament.stream_url}</a></p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {openForRegistrationTournaments.length > 0 && (
          <section className="mb-8 md:mb-12 p-4 md:p-6 bg-gradient-to-br from-green-900 to-green-950 rounded-xl shadow-2xl border-4 border-lime-500 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-lime-300 border-b-2 border-lime-600 pb-2 md:pb-3">🔥 火热报名中 🔥</h2>
            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {openForRegistrationTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="flex flex-col lg:flex-row items-center p-4 md:p-6 bg-green-800/70 rounded-lg shadow-xl border border-green-600 hover:bg-green-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <div className="relative w-full lg:w-1/4 h-40 md:h-48 flex-shrink-0 mb-4 lg:mb-0 lg:mr-6 rounded-lg overflow-hidden border border-green-500">
                    <Image
                      src={tournament.cover_image_url || '/images/default_cover.jpg'}
                      alt={tournament.name}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-grow text-center lg:text-left grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-lime-200 group-hover:text-lime-500 transition-colors duration-300">{tournament.name}</h3>
                      <p className="text-green-100 text-sm md:text-base mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                      <p className="text-green-100 text-sm md:text-base mb-1">报名截止: {new Date(tournament.registration_deadline).toLocaleString()}</p>
                      <p className="text-green-100 text-sm md:text-base mb-1">已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                      
                      {tournament.organizerCharacterName && (
                        <div className="flex items-center mt-3 justify-center lg:justify-start">
                          <Image
                            src={tournament.organizerAvatar ? `/avatars/${tournament.organizerAvatar}` : '/avatars/000.webp'}
                            alt={tournament.organizerCharacterName}
                            width={32}
                            height={32}
                            className="rounded-full mr-2 border border-lime-400"
                          />
                          <p className="text-green-200 text-sm md:text-base">主办者: {tournament.organizerCharacterName}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      {tournament.prize_settings && (
                        <div className="mt-3">
                          <p className="text-green-200 text-sm md:text-base font-bold">主要奖品:</p>
                          {tournament.prize_settings.ranked && tournament.prize_settings.ranked.length > 0 && (
                            <ul className="list-disc list-inside text-green-100 text-sm">
                              {tournament.prize_settings.ranked.map((prize: any, idx: number) => (
                                <li key={idx}>{prize.custom_prize_name || prize.prize_name || `第${prize.rank}名奖品`}</li>
                              ))}
                            </ul>
                          )}
                          {tournament.prize_settings.participation && tournament.prize_settings.participation.prize_id && (
                            <p className="text-green-100 text-sm">参与奖: {tournament.prize_settings.participation.custom_prize_name || tournament.prize_settings.participation.prize_name || '系统默认参与奖'}</p>
                          )}
                        </div>
                      )}

                      {registeredPlayersAvatars[tournament.id] && registeredPlayersAvatars[tournament.id].length > 0 && (
                        <div className="mt-4">
                          <p className="text-green-200 text-sm md:text-base font-bold mb-2">已报名玩家:</p>
                          <div className="flex -space-x-2 overflow-hidden justify-center lg:justify-start">
                            {registeredPlayersAvatars[tournament.id].map((player: any, idx: number) => (
                              <Image
                                key={idx}
                                src={player.avatar ? `/avatars/${player.avatar}` : '/avatars/000.webp'}
                                alt={player.character_name}
                                width={32}
                                height={32}
                                className="inline-block h-8 w-8 rounded-full ring-2 ring-green-400"
                              />
                            ))}
                            {tournament.registeredPlayersCount > registeredPlayersAvatars[tournament.id].length && (
                              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-green-700 text-green-100 text-xs ring-2 ring-green-400">+{tournament.registeredPlayersCount - registeredPlayersAvatars[tournament.id].length}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {currentUserId === null ? (
                        <div className="mt-4">
                            <Link href="/login">
                                <button
                                    className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
                                >
                                    登录后报名
                                </button>
                            </Link>
                        </div>
                        ) : (
                        currentUserId && tournament.organizer_id !== currentUserId && (
                            <div className="mt-4">
                            {userRegisteredTournamentIds.has(tournament.id) ? (
                                <span className="text-green-400 font-bold">您已报名</span>
                            ) : (
                                <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleRegister(tournament.id, tournament.name, !!tournament.registration_code);
                                }}
                                className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
                                >
                                {tournament.registration_code ? '报名参赛' : '一键报名'}
                                </button>
                            )}
                            </div>
                        )
                        )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {isRegistrationModalOpen && selectedTournamentForRegistration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-xl w-11/12 max-w-md">
              <h2 className="text-xl md:text-2xl font-bold mb-4">{selectedTournamentForRegistration.name}</h2>
              <p className="mb-4 text-sm md:text-base">此比赛需要验证码才能报名。</p>
              <input
                type="text"
                placeholder="请输入参赛验证码"
                value={registrationCodeInput}
                onChange={(e) => setRegistrationCodeInput(e.target.value)}
                className="w-full p-2 border rounded bg-gray-700 text-white mb-4 text-sm md:text-base"
                required
              />
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistrationModalOpen(false);
                    setRegistrationCodeInput('');
                    setSelectedTournamentForRegistration(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded text-sm md:text-base"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleModalSubmit}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded text-sm md:text-base"
                >
                  确认报名
                </button>
              </div>
            </div>
          </div>
        )}

        {registrationClosedTournaments.length > 0 && (
          <section className="mb-8 md:mb-12 p-4 md:p-6 bg-gradient-to-br from-purple-900 to-purple-950 rounded-xl shadow-2xl border-4 border-fuchsia-500 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-fuchsia-300 border-b-2 border-fuchsia-600 pb-2 md:pb-3">⚔️ 报名已截止 ⚔️</h2>
            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {registrationClosedTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="flex flex-col sm:flex-row items-center p-4 md:p-6 bg-purple-800/70 rounded-lg shadow-xl border border-purple-600 hover:bg-purple-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <div className="relative w-full sm:w-48 h-32 sm:h-28 flex-shrink-0 mb-4 sm:mb-0 sm:mr-6 rounded-lg overflow-hidden border border-purple-500">
                    <Image
                      src={tournament.cover_image_url || '/images/default_cover.jpg'}
                      alt={tournament.name}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-grow text-center sm:text-left">
                    <h3 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-fuchsia-200 group-hover:text-fuchsia-500 transition-colors duration-300">{tournament.name}</h3>
                    <p className="text-purple-100 text-sm md:text-base mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                    <p className="text-purple-100 text-sm md:text-base mb-1">状态: 已结束</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {finishedTournaments.length > 0 && (
          <section className="mb-8 md:mb-12 p-4 md:p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border-4 border-gray-600 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-gray-300 border-b-2 border-gray-500 pb-2 md:pb-3">🏆 比赛已结束 🏆</h2>
            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {finishedTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="flex flex-col sm:flex-row items-center p-4 md:p-6 bg-gray-700/70 rounded-lg shadow-xl border border-gray-600 hover:bg-gray-600/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <div className="relative w-full sm:w-48 h-32 sm:h-28 flex-shrink-0 mb-4 sm:mb-0 sm:mr-6 rounded-lg overflow-hidden border border-gray-500">
                    <Image
                      src={tournament.cover_image_url || '/images/default_cover.jpg'}
                      alt={tournament.name}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-grow text-center sm:text-left">
                    <h3 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-gray-200 group-hover:text-gray-400 transition-colors duration-300">{tournament.name}</h3>
                    <p className="text-gray-100 text-sm md:text-base mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                    <p className="text-gray-100 text-sm md:text-base mb-1">状态: 已结束</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {failedTournaments.length > 0 && (
          <section className="mb-8 md:mb-12 p-4 md:p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border-4 border-gray-600 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-gray-300 border-b-2 border-gray-500 pb-2 md:pb-3">💔 活动组织失败 💔</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {failedTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="block p-4 bg-gray-700/70 rounded-lg shadow-xl border border-gray-600 hover:bg-gray-600/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                    <div className="relative w-full h-32 mb-4 rounded-lg overflow-hidden border border-gray-500">
                        <Image
                            src={tournament.cover_image_url || '/images/default_cover.jpg'}
                            alt={tournament.name}
                            layout="fill"
                            objectFit="cover"
                            className="transition-transform duration-300 group-hover:scale-110"
                        />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-gray-200 group-hover:text-gray-400 transition-colors duration-300">{tournament.name}</h3>
                    <p className="text-gray-100 text-sm mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                    <p className="text-red-400 text-sm font-bold">状态: 活动组织失败</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}