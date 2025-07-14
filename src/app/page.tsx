'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';

// Helper to get token from cookie
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

export default function Home() {
  // State variables
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [minPlayers, setMinPlayers] = useState(10);
  const [maxPlayers, setMaxPlayers] = useState(48);
  const [eventDescription, setEventDescription] = useState('');
  const [wechatQrCodeFile, setWechatQrCodeFile] = useState<File | null>(null);
  const [registrationDeadline, setRegistrationDeadline] = useState('');

  const [rankedPrizes, setRankedPrizes] = useState<{ rank: number; prizeId: string; quantity: number }[]>([
    { rank: 1, prizeId: '', quantity: 1 },
    { rank: 2, prizeId: '', quantity: 1 },
    { rank: 3, prizeId: '', quantity: 1 },
    { rank: 4, prizeId: '', quantity: 1 },
    { rank: 5, prizeId: '', quantity: 1 },
  ]);
  const [participationPrize, setParticipationPrize] = useState<{ prizeId: string; quantity: number }>({ prizeId: '', quantity: 1 });
  const [customPrizes, setCustomPrizes] = useState<{ customName: string; rangeStart: number; rangeEnd: number; prizeId: string; quantity: number }[]>([]);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState<string | null>(null);

  // Effect for initial data fetching and authentication check
  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        setIsLoggedIn(true);
        setUserRole(decodedToken.role);
        setCharacterName(decodedToken.character_name || '用户'); // Fallback name
      } catch (error) {
        console.error('Error decoding token:', error);
        setIsLoggedIn(false);
      }
    }

    const fetchData = async () => {
      try {
        const [tournamentsRes, prizesRes] = await Promise.all([
          fetch('/api/tournaments'),
          fetch('/api/prizes')
        ]);
        const tournamentsData = await tournamentsRes.json();
        const prizesData = await prizesRes.json();
        setTournaments(tournamentsData);
        setPrizes(prizesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Handlers
  const handleAddCustomPrize = () => {
    setCustomPrizes([...customPrizes, { customName: '', rangeStart: 0, rangeEnd: 0, prizeId: '', quantity: 1 }]);
  };

  const handleRemoveCustomPrize = (index: number) => {
    setCustomPrizes(customPrizes.filter((_, i) => i !== index));
  };

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/';
    setIsLoggedIn(false);
    setUserRole(null);
    setCharacterName(null);
    alert('已退出登录。');
    window.location.reload();
  };

  const getTournamentStatus = (tournament: any) => {
    if (tournament.status === 'finished') return '已结束';
    if (tournament.status === 'failed') return '活动组织失败';
    if (tournament.status === 'extended_registration') return '延期报名中';
    if (tournament.status === 'ongoing') return '进行中';
    const now = new Date();
    const startTime = new Date(tournament.start_time);
    const registrationDeadline = new Date(tournament.registration_deadline);
    if (now > startTime) return '进行中';
    if (now > registrationDeadline) return '报名已结束';
    return '报名中';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      alert('请登录后创建比赛。');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('start_time', startTime);
    formData.append('registration_deadline', registrationDeadline || startTime);
    formData.append('min_players', String(minPlayers));
    formData.append('max_players', String(maxPlayers));
    formData.append('event_description', eventDescription);
    if (wechatQrCodeFile) {
      formData.append('wechat_qr_code_image', wechatQrCodeFile);
    }

    const prize_settings = {
      ranked: rankedPrizes.filter(p => p.prizeId).map(p => ({ ...p, prize_id: parseInt(p.prizeId) })),
      participation: participationPrize.prizeId ? { ...participationPrize, prize_id: parseInt(participationPrize.prizeId) } : null,
      custom: customPrizes.filter(p => p.prizeId).map(p => ({ ...p, prize_id: parseInt(p.prizeId) })),
    };
    formData.append('prize_settings', JSON.stringify(prize_settings));

    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // No 'Content-Type', browser sets it for FormData
        body: formData,
      });

      if (res.ok) {
        alert('比赛创建成功！');
        const tournamentsRes = await fetch('/api/tournaments');
        const tournamentsData = await tournamentsRes.json();
        setTournaments(tournamentsData);
      } else {
        const errorData = await res.json();
        alert(`创建比赛失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('提交时发生网络错误。');
    }
  };

  // Main component render
  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-white">
      <nav className="w-full flex justify-end gap-4 mb-8">
        {isLoggedIn ? (
          <>
            <span className="text-gray-300">欢迎, {characterName}</span>
            <button onClick={handleLogout} className="text-blue-400 hover:underline">退出登录</button>
          </>
        ) : (
          <>
            <Link href="/register" className="text-blue-400 hover:underline">注册</Link>
            <Link href="/login" className="text-blue-400 hover:underline">登录</Link>
          </>
        )}
        <Link href="/tournamentRegister" className="text-blue-400 hover:underline">报名比赛</Link>
        {userRole === 'organizer' && (
          <Link href="/prizes/manage" className="text-blue-400 hover:underline">管理奖品</Link>
        )}
      </nav>

      <h1 className="text-4xl font-bold mb-8">比赛列表</h1>

      {/* Organizer's Create Tournament Form */}
      {userRole === 'organizer' && (
        <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4">创建比赛</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Form fields */}
            <input type="text" placeholder="比赛名称" value={name} onChange={(e) => setName(e.target.value)} className="p-2 border rounded bg-gray-700 text-white" />
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="p-2 border rounded bg-gray-700 text-white" />
            <input type="number" placeholder="最少参赛人数" value={minPlayers} onChange={(e) => setMinPlayers(parseInt(e.target.value))} className="p-2 border rounded bg-gray-700 text-white" />
            <input type="number" placeholder="最多参赛人数" value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value))} className="p-2 border rounded bg-gray-700 text-white" />
            <textarea placeholder="赛事说明" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="p-2 border rounded bg-gray-700 text-white" rows={5} />
            <input type="file" accept="image/*" onChange={(e) => setWechatQrCodeFile(e.target.files ? e.target.files[0] : null)} className="p-2 border rounded bg-gray-700 text-white" />
            <input type="datetime-local" placeholder="报名截止时间" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} className="p-2 border rounded bg-gray-700 text-white" required />
            
            {/* Prize sections */}
            <h3 className="text-xl font-bold mb-2 mt-4">奖品设置</h3>
            {/* Ranked Prizes */}
            {rankedPrizes.map((rp, index) => (
              <div key={index} className="flex gap-2 items-center">
                <span>第 {rp.rank} 名:</span>
                <select value={rp.prizeId} onChange={(e) => setRankedPrizes(rankedPrizes.map((p, i) => i === index ? { ...p, prizeId: e.target.value } : p))} className="p-2 border rounded bg-gray-700 text-white flex-grow">
                  <option value="">无奖品</option>
                  {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
                </select>
                <input type="number" value={rp.quantity} onChange={(e) => setRankedPrizes(rankedPrizes.map((p, i) => i === index ? { ...p, quantity: parseInt(e.target.value) } : p))} className="p-2 w-20 border rounded bg-gray-700 text-white" />
              </div>
            ))}
            {/* Participation Prize */}
            <div className="flex gap-2 items-center mt-2">
              <span>参与奖:</span>
              <select value={participationPrize.prizeId} onChange={(e) => setParticipationPrize({ ...participationPrize, prizeId: e.target.value })} className="p-2 border rounded bg-gray-700 text-white flex-grow">
                <option value="">无奖品</option>
                {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
              </select>
              <input type="number" value={participationPrize.quantity} onChange={(e) => setParticipationPrize({ ...participationPrize, quantity: parseInt(e.target.value) })} className="p-2 w-20 border rounded bg-gray-700 text-white" />
            </div>
            {/* Custom Prizes */}
            {customPrizes.map((cp, index) => (
              <div key={index} className="p-2 border rounded mt-2 bg-gray-700">
                <input type="text" placeholder="奖项名称" value={cp.customName} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, customName: e.target.value } : p))} className="p-2 w-full border rounded bg-gray-600"/>
                <div className="flex gap-2 mt-2">
                  <input type="number" placeholder="起始名次" value={cp.rangeStart} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, rangeStart: parseInt(e.target.value) } : p))} className="p-2 w-full border rounded bg-gray-600"/>
                  <input type="number" placeholder="结束名次" value={cp.rangeEnd} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, rangeEnd: parseInt(e.target.value) } : p))} className="p-2 w-full border rounded bg-gray-600"/>
                </div>
                <select value={cp.prizeId} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, prizeId: e.target.value } : p))} className="p-2 w-full border rounded mt-2 bg-gray-600">
                  <option value="">无奖品</option>
                  {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
                </select>
                <input type="number" placeholder="数量" value={cp.quantity} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, quantity: parseInt(e.target.value) } : p))} className="p-2 w-full border rounded mt-2 bg-gray-600"/>
                <button type="button" onClick={() => handleRemoveCustomPrize(index)} className="p-2 bg-red-500 text-white rounded mt-2 w-full">移除自定义奖项</button>
              </div>
            ))}
            <button type="button" onClick={handleAddCustomPrize} className="p-2 bg-green-500 text-white rounded mt-2">添加自定义奖项</button>
            <button type="submit" className="p-2 bg-blue-500 text-white rounded mt-4">创建比赛</button>
          </form>
        </div>
      )}

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