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

  const fetchRegisteredPlayersAvatars = useCallback(async (tournamentId: number, token: string) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/registered-players-avatars`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const avatars = await res.json();
        setRegisteredPlayersAvatars(prev => ({ ...prev, [tournamentId]: avatars }));
      }
    } catch (error) {
      console.error(`Error fetching registered players avatars for tournament ${tournamentId}:`, error);
    }
  }, []);

  const handleRegister = useCallback(async (tournamentId: number, tournamentName: string) => {
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
        body: JSON.stringify({ tournamentId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`成功报名比赛: ${tournamentName}！`);
        setUserRegisteredTournamentIds(prev => new Set(prev).add(tournamentId));
        fetchRegisteredPlayersAvatars(tournamentId, token);
      } else {
        alert(`报名失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('报名时发生网络错误。');
    }
  }, [fetchRegisteredPlayersAvatars]);

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

        if (token) {
          openForRegistration.forEach(tournament => {
            fetchRegisteredPlayersAvatars(tournament.id, token);
          });
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }, [fetchRegisteredPlayersAvatars]);

  useEffect(() => {
    fetchUserDataAndTournaments();
  }, [fetchUserDataAndTournaments]);

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gradient-to-br from-gray-950 to-black text-white font-sans">
      <div className="w-full max-w-6xl mx-auto">
        <h1 className="text-5xl font-extrabold mb-12 text-center text-amber-400 drop-shadow-lg">燕云砺兵台</h1>

        {ongoingTournaments.length > 0 && (
          <section className="mb-12 p-6 bg-gradient-to-br from-red-900 to-red-950 rounded-xl shadow-2xl border-4 border-amber-500 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-4xl font-bold mb-6 text-amber-300 border-b-2 border-amber-600 pb-3">⚔️ 激战正酣 ⚔️</h2>
            <div className="grid grid-cols-1 gap-6">
              {ongoingTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="flex flex-col md:flex-row items-center p-6 bg-red-800/70 rounded-lg shadow-xl border border-red-600 hover:bg-red-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <div className="relative w-full md:w-64 h-40 md:h-32 flex-shrink-0 mb-4 md:mb-0 md:mr-6 rounded-lg overflow-hidden border border-red-500">
                    <Image
                      src={tournament.cover_image_url || '/images/default_cover.jpg'}
                      alt={tournament.name}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <h3 className="text-3xl font-bold mb-2 text-amber-200 group-hover:text-amber-500 transition-colors duration-300">{tournament.name}</h3>
                    <p className="text-red-100 text-base mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                    <p className="text-red-100 text-base mb-1">已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                    {tournament.room_name && <p className="text-red-100 text-base mb-1">房间名: {tournament.room_name}</p>}
                    {tournament.room_number && <p className="text-red-100 text-base mb-1">房间号: {tournament.room_number}</p>}
                    {tournament.room_password && <p className="text-red-100 text-base mb-1">房间密码: {tournament.room_password}</p>}
                    {tournament.stream_url && <p className="text-red-100 text-base mb-1">直播间/主页: <a href={tournament.stream_url} target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:underline">{tournament.stream_url}</a></p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {openForRegistrationTournaments.length > 0 && (
          <section className="mb-12 p-6 bg-gradient-to-br from-green-900 to-green-950 rounded-xl shadow-2xl border-4 border-lime-500 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-4xl font-bold mb-6 text-lime-300 border-b-2 border-lime-600 pb-3">🔥 火热报名中 🔥</h2>
            <div className="grid grid-cols-1 gap-6">
              {openForRegistrationTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="flex flex-col lg:flex-row items-center p-6 bg-green-800/70 rounded-lg shadow-xl border border-green-600 hover:bg-green-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <div className="relative w-full lg:w-1/3 h-48 flex-shrink-0 mb-4 lg:mb-0 lg:mr-6 rounded-lg overflow-hidden border border-green-500">
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
                      <h3 className="text-3xl font-bold mb-2 text-lime-200 group-hover:text-lime-500 transition-colors duration-300">{tournament.name}</h3>
                      <p className="text-green-100 text-base mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                      <p className="text-green-100 text-base mb-1">报名截止: {new Date(tournament.registration_deadline).toLocaleString()}</p>
                      <p className="text-green-100 text-base mb-1">已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                      
                      {tournament.organizerCharacterName && (
                        <div className="flex items-center mt-3 justify-center lg:justify-start">
                          <Image
                            src={tournament.organizerAvatar ? `/avatars/${tournament.organizerAvatar}` : '/avatars/000.webp'}
                            alt={tournament.organizerCharacterName}
                            width={32}
                            height={32}
                            className="rounded-full mr-2 border border-lime-400"
                          />
                          <p className="text-green-200 text-base">主办者: {tournament.organizerCharacterName}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      {tournament.prize_settings && (
                        <div className="mt-3">
                          <p className="text-green-200 text-base font-bold">主要奖品:</p>
                          {tournament.prize_settings.ranked && tournament.prize_settings.ranked.length > 0 && (
                            <ul className="list-disc list-inside text-green-100 text-sm">
                              {tournament.prize_settings.ranked.slice(0, 3).map((prize: any, idx: number) => (
                                <li key={idx}>{prize.custom_prize_name || `第${prize.rank}名奖品`}: {prize.quantity}</li>
                              ))}
                              {tournament.prize_settings.ranked.length > 3 && <li>...</li>}
                            </ul>
                          )}
                          {tournament.prize_settings.participation && tournament.prize_settings.participation.prize_id && (
                            <p className="text-green-100 text-sm">参与奖: {tournament.prize_settings.participation.custom_prize_name || '系统默认参与奖'} x {tournament.prize_settings.participation.quantity}</p>
                          )}
                        </div>
                      )}

                      {registeredPlayersAvatars[tournament.id] && registeredPlayersAvatars[tournament.id].length > 0 && (
                        <div className="mt-4">
                          <p className="text-green-200 text-base font-bold mb-2">已报名玩家:</p>
                          <div className="flex -space-x-2 overflow-hidden justify-center lg:justify-start">
                            {registeredPlayersAvatars[tournament.id].map((player: any, idx: number) => (
                              <Image
                                key={idx}
                                src={player.avatar ? `/avatars/${player.avatar}` : '/avatars/000.webp'}
                                alt={player.character_name}
                                width={36}
                                height={36}
                                className="inline-block h-9 w-9 rounded-full ring-2 ring-green-400"
                              />
                            ))}
                            {tournament.registeredPlayersCount > registeredPlayersAvatars[tournament.id].length && (
                              <span className="flex items-center justify-center h-9 w-9 rounded-full bg-green-700 text-green-100 text-xs ring-2 ring-green-400">+{tournament.registeredPlayersCount - registeredPlayersAvatars[tournament.id].length}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {currentUserId && tournament.organizer_id !== currentUserId && (
                        <div className="mt-4">
                          {userRegisteredTournamentIds.has(tournament.id) ? (
                            <span className="text-green-400 font-bold">您已报名</span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleRegister(tournament.id, tournament.name);
                              }}
                              className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
                            >
                              报名参赛
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {registrationClosedTournaments.length > 0 && (
          <section className="mb-12 p-6 bg-gradient-to-br from-purple-900 to-purple-950 rounded-xl shadow-2xl border-4 border-fuchsia-500 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-4xl font-bold mb-6 text-fuchsia-300 border-b-2 border-fuchsia-600 pb-3">⚔️ 报名已截止 ⚔️</h2>
            <div className="grid grid-cols-1 gap-6">
              {registrationClosedTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="flex flex-col md:flex-row items-center p-6 bg-purple-800/70 rounded-lg shadow-xl border border-purple-600 hover:bg-purple-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <div className="relative w-full md:w-64 h-40 md:h-32 flex-shrink-0 mb-4 md:mb-0 md:mr-6 rounded-lg overflow-hidden border border-purple-500">
                    <Image
                      src={tournament.cover_image_url || '/images/default_cover.jpg'}
                      alt={tournament.name}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <h3 className="text-3xl font-bold mb-2 text-fuchsia-200 group-hover:text-fuchsia-500 transition-colors duration-300">{tournament.name}</h3>
                    <p className="text-purple-100 text-base mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                    <p className="text-purple-100 text-base mb-1">已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {finishedTournaments.length > 0 && (
          <section className="mb-12 p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border-4 border-gray-600 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-4xl font-bold mb-6 text-gray-300 border-b-2 border-gray-500 pb-3">🏆 比赛已结束 🏆</h2>
            <div className="grid grid-cols-1 gap-6">
              {finishedTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="flex flex-col md:flex-row items-center p-6 bg-gray-700/70 rounded-lg shadow-xl border border-gray-600 hover:bg-gray-600/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <div className="relative w-full md:w-64 h-40 md:h-32 flex-shrink-0 mb-4 md:mb-0 md:mr-6 rounded-lg overflow-hidden border border-gray-500">
                    <Image
                      src={tournament.cover_image_url || '/images/default_cover.jpg'}
                      alt={tournament.name}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <h3 className="text-3xl font-bold mb-2 text-gray-200 group-hover:text-gray-400 transition-colors duration-300">{tournament.name}</h3>
                    <p className="text-gray-100 text-base mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                    <p className="text-gray-100 text-base mb-1">状态: 已结束</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {failedTournaments.length > 0 && (
          <section className="mb-12 p-6 bg-gradient-to-br from-red-900 to-red-950 rounded-xl shadow-2xl border-4 border-red-600 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-4xl font-bold mb-6 text-red-300 border-b-2 border-red-500 pb-3">💔 活动组织失败 💔</h2>
            <div className="grid grid-cols-1 gap-6">
              {failedTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="block p-6 bg-red-800/70 rounded-lg shadow-xl border border-red-600 hover:bg-red-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <h3 className="text-2xl font-bold mb-2 text-red-200 group-hover:text-red-400 transition-colors duration-300">{tournament.name}</h3>
                  <p className="text-red-100 text-base mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                  <p className="text-red-100 text-base mb-1">状态: 活动组织失败</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}