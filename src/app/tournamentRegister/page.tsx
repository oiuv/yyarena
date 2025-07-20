'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
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
  const [registrationCodeInput, setRegistrationCodeInput] = useState<{ [tournamentId: number]: string }>({}); // New state for registration code input

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

  const handleRegister = async (tournamentId: number, requiresCode: boolean) => {
    setMessage('');
    const token = getToken();

    if (!token || !currentUser || (currentUser.role !== 'player' && currentUser.role !== 'organizer')) {
      setMessage('请登录后报名比赛。');
      return;
    }

    const registrationCode = registrationCodeInput[tournamentId] || '';

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tournamentId, registrationCode }),
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
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 lg:p-12 bg-gray-900 text-white">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center">报名比赛</h1>
      {message && <p className="mt-4 text-base md:text-lg text-red-500 text-center">{message}</p>}

      {!currentUser || (currentUser.role !== 'player' && currentUser.role !== 'organizer') ? (
        <p className="text-base md:text-xl text-center">请先<a href="/login" className="text-blue-500 hover:underline">登录</a>以玩家或主办方身份报名比赛。</p>
      ) : (
        <div className="w-full max-w-full md:max-w-2xl px-2 md:px-0">
          <h2 className="text-xl md:text-2xl font-bold mb-4">可报名的比赛</h2>
          {tournaments.filter(filterAvailableTournaments).length > 0 ? (
            <ul>
              {tournaments.filter(filterAvailableTournaments).map((tournament: any) => (
                <li key={tournament.id} className="p-4 bg-gray-800 rounded-lg shadow-md mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="mb-3 sm:mb-0 text-left">
                    <h3 className="text-lg md:text-xl font-bold">{tournament.name}</h3>
                    <p className="text-sm md:text-base">开始时间: {new Date(tournament.start_time).toLocaleString()}</p>
                    <p className="text-sm md:text-base">报名截止: {new Date(tournament.registration_deadline).toLocaleString()}</p>
                    <p className="text-sm md:text-base">当前状态: {getTournamentStatus(tournament)}</p>
                    <p className="text-sm md:text-base">已报名: {tournament.registeredPlayersCount || 0} / {tournament.max_players}</p>
                  </div>
                  {tournament.registration_code ? (
                    <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="请输入验证码"
                        value={registrationCodeInput[tournament.id] || ''}
                        onChange={(e) => setRegistrationCodeInput(prev => ({ ...prev, [tournament.id]: e.target.value }))}
                        className="p-2 border rounded bg-gray-700 text-white w-full sm:w-40 text-sm md:text-base"
                      />
                      <button
                        onClick={() => handleRegister(tournament.id, true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full sm:w-auto text-sm md:text-base"
                      >
                        报名参赛
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRegister(tournament.id, false)}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full sm:w-auto text-sm md:text-base"
                    >
                      一键报名
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base md:text-lg text-center">暂无开放报名的比赛。</p>
          )}
        </div>
      )}
    </main>
  );
}
