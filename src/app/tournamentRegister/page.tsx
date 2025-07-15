'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

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

  const handleRegister = async (tournamentId: number) => {
    setMessage('');
    const token = getToken();

    if (!token || !currentUser || (currentUser.role !== 'player' && currentUser.role !== 'organizer')) {
      setMessage('请登录后报名比赛。');
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

      console.log('Registration API Response Status:', res.status);
      console.log('Registration API Response OK:', res.ok);

      const data = await res.json();
      console.log('Registration API Response Data:', data);

      if (res.ok) {
        setMessage(data.message || '报名成功！');
        fetchTournaments(); // Re-fetch tournaments to update the list
      } else {
        setMessage(data.message || '报名失败。');
      }
    } catch (err: any) {
      console.error('Error during registration fetch:', err);
      setMessage(err.message || '报名时发生网络错误。');
    }
  };

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

  const filterAvailableTournaments = (tournament: any) => {
    const status = getTournamentStatus(tournament);
    // Only show tournaments that are '报名中' or '延期报名中'
    return status === '报名中' || status === '延期报名中';
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">报名比赛</h1>
      {message && <p className="mt-4 text-lg text-center text-red-500">{message}</p>}

      {!currentUser || (currentUser.role !== 'player' && currentUser.role !== 'organizer') ? (
        <p className="text-xl">请先<a href="/login" className="text-blue-500 hover:underline">登录</a>以玩家或主办方身份报名比赛。</p>
      ) : (
        <div className="w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">可报名的比赛</h2>
          {tournaments.filter(filterAvailableTournaments).length > 0 ? (
            <ul>
              {tournaments.filter(filterAvailableTournaments).map((tournament: any) => (
                <li key={tournament.id} className="p-4 bg-gray-800 rounded-lg shadow-md mb-2 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{tournament.name}</h3>
                    <p>开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                    <p>报名截止: {new Date(tournament.registration_deadline).toLocaleString()}</p>
                    <p>当前状态: {getTournamentStatus(tournament)}</p>
                    <p>已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                  </div>
                  <button
                    onClick={() => handleRegister(tournament.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                  >
                    一键报名
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>暂无开放报名的比赛。</p>
          )}
        </div>
      )}
    </main>
  );
}
