'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link'; // Import Link for navigation
import { getTournamentStatusText, getDynamicTournamentStatusText } from '@/utils/statusTranslators';

function getToken() {
  const name = 'token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}

export default function TournamentRegisterPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments');
      const data = await res.json();
      if (res.ok) {
        setTournaments(data);
      } else {
        setMessage(data.message || '获取比赛列表失败。');
      }
    } catch (err) {
      setMessage('获取比赛列表时发生网络错误。');
    }
  };

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        setCurrentUser(jwtDecode(token));
      } catch (e) {
        console.error('Invalid token', e);
        // Optionally redirect to login if token is invalid
      }
    }

    fetchTournaments();
  }, []);

  const filterAvailableTournaments = (tournament: any) => {
    const now = new Date();
    const registrationDeadline = new Date(tournament.registration_deadline);
    const startTime = new Date(tournament.start_time);

    // Only show tournaments that are '报名中' or '延期报名中' AND have not started yet
    const isRegistrationOpen = now <= registrationDeadline;
    const hasNotStarted = now < startTime;

    return (tournament.status === 'pending' || tournament.status === 'extended_registration') && isRegistrationOpen && hasNotStarted;
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 lg:p-12 bg-[#1A1A1A] text-[#F5F5F5]">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center text-[#B89766]">可报名的比赛</h1>
      {message && <p className="mt-4 text-base md:text-lg text-[#C83C23] text-center">{message}</p>}

      {!currentUser || (currentUser.role !== 'player' && currentUser.role !== 'organizer') ? (
        <p className="text-base md:text-xl text-center text-[#F5F5F5]">请先<Link href="/login" className="text-[#B89766] hover:underline">登录</Link>以玩家或主办方身份查看可报名的比赛。</p>
      ) : (
        <div className="w-full max-w-full md:max-w-4xl px-2 md:px-0">
          {tournaments.filter(filterAvailableTournaments).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tournaments.filter(filterAvailableTournaments).map((tournament: any) => (
                <div key={tournament.id} className="p-6 bg-[#2A2A2A] rounded-lg shadow-md border border-[#B89766]/50 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.02]">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2 text-[#B89766]">{tournament.name}</h3>
                    <p className="text-sm md:text-base text-[#F5F5F5]">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                    <p className="text-sm md:text-base text-[#F5F5F5]">报名截止: {new Date(tournament.registration_deadline).toLocaleString()}</p>
                    <p className="text-sm md:text-base text-[#F5F5F5]">当前状态: {getDynamicTournamentStatusText(tournament)}</p>
                    <p className="text-sm md:text-base text-[#F5F5F5]">已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                  </div>
                  <div className="mt-4 text-right">
                    <Link href={`/tournaments/details?id=${tournament.id}`}>
                      <button
                        className="bg-[#B89766] hover:bg-[#C83C23] text-white font-bold py-2 px-4 rounded transition-colors duration-300"
                      >
                        查看详情并报名
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base md:text-lg text-center text-[#F5F5F5]">暂无开放报名的比赛。</p>
          )}
        </div>
      )}
    </main>
  );
}
