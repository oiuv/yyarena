'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [ongoingTournaments, setOngoingTournaments] = useState<any[]>([]);
  const [openForRegistrationTournaments, setOpenForRegistrationTournaments] = useState<any[]>([]);
  const [registrationClosedTournaments, setRegistrationClosedTournaments] = useState<any[]>([]);
  const [finishedTournaments, setFinishedTournaments] = useState<any[]>([]);
  const [failedTournaments, setFailedTournaments] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
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
            // Default to failed if status is not explicitly handled and not ongoing/finished
            failed.push(tournament);
          }
        });

        setOngoingTournaments(ongoing);
        setOpenForRegistrationTournaments(openForRegistration);
        setRegistrationClosedTournaments(registrationClosed);
        setFinishedTournaments(finished);
        setFailedTournaments(failed);

        setTournaments(tournamentsData); // Keep original for potential future use or debugging

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gradient-to-br from-gray-950 to-black text-white font-sans">
      <div className="w-full max-w-6xl mx-auto">
        <h1 className="text-5xl font-extrabold mb-12 text-center text-amber-400 drop-shadow-lg">燕云砺兵台</h1>

        {/* 1. 正在进行中的比赛 */}
        {ongoingTournaments.length > 0 && (
          <section className="mb-12 p-6 bg-gradient-to-br from-red-900 to-red-950 rounded-xl shadow-2xl border-4 border-amber-500 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-4xl font-bold mb-6 text-amber-300 border-b-2 border-amber-600 pb-3">⚔️ 激战正酣 ⚔️</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ongoingTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="block p-6 bg-red-800/70 rounded-lg shadow-xl border border-red-600 hover:bg-red-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <h3 className="text-2xl font-bold mb-2 text-amber-200 group-hover:text-amber-500 transition-colors duration-300">{tournament.name}</h3>
                  <p className="text-red-100 text-sm mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                  <p className="text-red-100 text-sm mb-1">已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                  {tournament.room_name && <p className="text-red-100 text-sm mb-1">房间名: {tournament.room_name}</p>}
                  {tournament.room_number && <p className="text-red-100 text-sm mb-1">房间号: {tournament.room_number}</p>}
                  {tournament.room_password && <p className="text-red-100 text-sm mb-1">房间密码: {tournament.room_password}</p>}
                  {tournament.stream_url && <p className="text-red-100 text-sm mb-1">直播间/主页: <a href={tournament.stream_url} target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:underline">{tournament.stream_url}</a></p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 2. 正在报名中的比赛 */}
        {openForRegistrationTournaments.length > 0 && (
          <section className="mb-12 p-6 bg-gradient-to-br from-green-900 to-green-950 rounded-xl shadow-2xl border-4 border-lime-500 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-4xl font-bold mb-6 text-lime-300 border-b-2 border-lime-600 pb-3">🔥 火热报名中 🔥</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openForRegistrationTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="block p-6 bg-green-800/70 rounded-lg shadow-xl border border-green-600 hover:bg-green-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <h3 className="text-2xl font-bold mb-2 text-lime-200 group-hover:text-lime-500 transition-colors duration-300">{tournament.name}</h3>
                  <p className="text-green-100 text-sm mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                  <p className="text-green-100 text-sm mb-1">报名截止: {new Date(tournament.registration_deadline).toLocaleString()}</p>
                  <p className="text-green-100 text-sm mb-1">已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 3. 报名已结束或报名人数已满的比赛 */}
        {registrationClosedTournaments.length > 0 && (
          <section className="mb-12 p-6 bg-gradient-to-br from-purple-900 to-purple-950 rounded-xl shadow-2xl border-4 border-fuchsia-500 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-4xl font-bold mb-6 text-fuchsia-300 border-b-2 border-fuchsia-600 pb-3">⚔️ 报名已截止 ⚔️</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {registrationClosedTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="block p-6 bg-purple-800/70 rounded-lg shadow-xl border border-purple-600 hover:bg-purple-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <h3 className="text-2xl font-bold mb-2 text-fuchsia-200 group-hover:text-fuchsia-500 transition-colors duration-300">{tournament.name}</h3>
                  <p className="text-purple-100 text-sm mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                  <p className="text-purple-100 text-sm mb-1">已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 4. 已结束的比赛 */}
        {finishedTournaments.length > 0 && (
          <section className="mb-12 p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border-4 border-gray-600 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-4xl font-bold mb-6 text-gray-300 border-b-2 border-gray-500 pb-3">🏆 比赛已结束 🏆</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {finishedTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="block p-6 bg-gray-700/70 rounded-lg shadow-xl border border-gray-600 hover:bg-gray-600/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <h3 className="text-2xl font-bold mb-2 text-gray-200 group-hover:text-gray-400 transition-colors duration-300">{tournament.name}</h3>
                  <p className="text-gray-100 text-sm mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                  <p className="text-gray-100 text-sm mb-1">状态: 已结束</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 5. 已失败的比赛 */}
        {failedTournaments.length > 0 && (
          <section className="mb-12 p-6 bg-gradient-to-br from-red-900 to-red-950 rounded-xl shadow-2xl border-4 border-red-600 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-4xl font-bold mb-6 text-red-300 border-b-2 border-red-500 pb-3">💔 活动组织失败 💔</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {failedTournaments.map((tournament: any) => (
                <Link key={tournament.id} href={`/tournaments/details?id=${tournament.id}`} className="block p-6 bg-red-800/70 rounded-lg shadow-xl border border-red-600 hover:bg-red-700/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-102 group">
                  <h3 className="text-2xl font-bold mb-2 text-red-200 group-hover:text-red-400 transition-colors duration-300">{tournament.name}</h3>
                  <p className="text-red-100 text-sm mb-1">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                  <p className="text-red-100 text-sm mb-1">状态: 活动组织失败</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}