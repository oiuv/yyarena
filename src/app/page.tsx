'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tournamentsRes = await fetch('/api/tournaments');
        const tournamentsData = await tournamentsRes.json();
        setTournaments(tournamentsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const getTournamentStatus = (tournament: any) => {
    if (tournament.status === 'finished') return '已结束';
    if (tournament.status === 'failed') return '活动组织失败';
    if (tournament.status === 'extended_registration') return '延期报名中';
    if (tournament.status === 'ongoing') return '进行中';
    const now = new Date();
    const startTime = new Date(tournament.start_time);
    const registrationDeadline = new Date(tournament.registration_deadline);

    if (now > registrationDeadline) {
      if ((tournament.registeredPlayersCount || 0) < tournament.min_players) {
        return '活动组织失败';
      }
    }

    if (now > startTime) return '进行中';
    if (now > registrationDeadline) return '报名已结束';
    return '报名中';
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">比赛列表</h1>

      {/* Tournaments List */}
      <div className="w-full max-w-2xl mt-8">
        <h2 className="text-2xl font-bold mb-4">即将开始的比赛</h2>
        <ul>
          {tournaments.map((tournament: any) => (
            <li key={tournament.id} className="p-4 bg-gray-800 rounded-lg shadow-md mb-2">
              <Link href={`/tournaments/details?id=${tournament.id}`} className="block hover:bg-gray-700 p-2 rounded">
                <h3 className="text-xl font-bold">{tournament.name}</h3>
                <p>开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                <p>已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                <p>状态: {getTournamentStatus(tournament)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
