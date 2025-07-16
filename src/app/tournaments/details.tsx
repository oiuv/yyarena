'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';
import Image from 'next/image';

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

export default function TournamentDetailsPage() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get('id');

  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the room info form
  const [roomName, setRoomName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  // User state
  const [currentUser, setCurrentUser] = useState<{ id: number; role: string } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setCurrentUser({ id: decoded.userId, role: decoded.role });
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }

    if (!tournamentId) {
      setError('比赛ID缺失。');
      setLoading(false);
      return;
    }

    const fetchTournamentDetails = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setTournament(data);
        setRoomName(data.room_name || '');
        setRoomNumber(data.room_number || '');
        setRoomPassword(data.room_password || '');

        // Fetch matches for the tournament
        const matchesRes = await fetch(`/api/tournaments/matches?tournamentId=${tournamentId}`);
        if (!matchesRes.ok) {
          throw new Error(`HTTP error! status: ${matchesRes.status}`);
        }
        const matchesData = await matchesRes.json();
        setMatches(matchesData);

      } catch (err: any) {
        setError(err.message || '获取比赛详情失败。');
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentDetails();
  }, [tournamentId]);

  const handleUpdateRoomInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      alert('请先登录。');
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ room_name: roomName, room_number: roomNumber, room_password: roomPassword }),
        }
      );

      if (res.ok) {
        alert('房间信息更新成功！');
        const updatedTournament = await res.json();
        setTournament(updatedTournament);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || '更新失败');
      }
    } catch (err: any) {
      alert(`错误: ${err.message}`);
      setError(err.message);
    }
  };

  const handleGenerateMatches = async () => {
    const token = getToken();
    if (!token) {
      alert('请先登录。');
      return;
    }

    if (!confirm('确定要生成对阵并开始比赛吗？此操作不可逆转。')) {
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        alert('对阵已生成，比赛开始！');
        // Refresh the page to show the new matches and status
        window.location.reload();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || '生成对阵失败');
      }
    } catch (err: any) {
      alert(`错误: ${err.message}`);
      setError(err.message);
    }
  };

  if (loading) {
    return <main className="flex min-h-screen flex-col items-center p-24"><p>正在加载比赛详情...</p></main>;
  }

  if (error) {
    return <main className="flex min-h-screen flex-col items-center p-24"><p className="text-red-500">错误: {error}</p></main>;
  }

  if (!tournament) {
    return <main className="flex min-h-screen flex-col items-center p-24"><p>未找到比赛。</p></main>;
  }

  const isOrganizer = currentUser?.role === 'organizer' && currentUser?.id === tournament.organizer_id;

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">{tournament.name}</h1>
      <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-md">
        <p className="mb-2"><b>开始时间:</b> {new Date(tournament.start_time).toLocaleString()}</p>
        <p className="mb-2"><b>报名截止:</b> {new Date(tournament.registration_deadline).toLocaleString()}</p>
        <p className="mb-2"><b>玩家人数:</b> {tournament.min_players} - {tournament.max_players}</p>
        <p className="mb-4"><b>状态:</b> {tournament.status}</p>
        
        {tournament.event_description && (
          <div className="mb-4 p-4 border border-gray-600 rounded bg-gray-700">
            <h3 className="text-xl font-bold mb-2">赛事说明</h3>
            <p className="whitespace-pre-wrap">{tournament.event_description}</p>
          </div>
        )}
        
        {tournament.wechat_qr_code_url && (
          <div className="mb-4 p-4 border border-gray-600 rounded bg-gray-700">
            <h3 className="text-xl font-bold mb-2">微信群二维码</h3>
            <Image src={tournament.wechat_qr_code_url} alt="微信群二维码" width={192} height={192} className="w-48 h-48 object-contain" />
          </div>
        )}

        {/* Display Room Info */}
        <div className="mb-4 p-4 border border-gray-600 rounded bg-gray-700">
          <h3 className="text-xl font-bold mb-2">砺兵台房间信息</h3>
          <p><b>房间名:</b> {tournament.room_name || '尚未设置'}</p>
          <p><b>房间号:</b> {tournament.room_number || '尚未设置'}</p>
          <p><b>密码:</b> {tournament.room_password || '无'}</p>
        </div>

        {/* Organizer Form to Update Room Info */}
        {isOrganizer && (
          <div className="mt-6 p-4 border border-gray-600 rounded bg-gray-700">
            <h3 className="text-xl font-bold mb-4">更新房间信息</h3>
            <form onSubmit={handleUpdateRoomInfo} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="砺兵台房间名"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="p-2 border rounded bg-gray-600 text-white"
              />
              <input
                type="text"
                placeholder="砺兵台房间号 (10位)"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="p-2 border rounded bg-gray-600 text-white"
                maxLength={10}
              />
              <input
                type="text"
                placeholder="砺兵台房间密码 (4位, 可留空)"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                className="p-2 border rounded bg-gray-600 text-white"
                maxLength={4}
              />
              <button type="submit" className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                保存房间信息
              </button>
            </form>
          </div>
        )}

        <h2 className="text-2xl font-bold mt-8 mb-4">比赛对局</h2>
        {matches.length === 0 ? (
          <p>暂未生成对局。</p>
        ) : (
          <div className="w-full">
            {matches.map((match) => (
              <div key={match.id} className="p-4 border border-gray-600 rounded mb-2 bg-gray-700">
                <p><b>回合:</b> {match.round_number}</p>
                <p><b>玩家1:</b> {match.player1_id}</p>
                <p><b>玩家2:</b> {match.player2_id || '轮空'}</p>
                <p><b>获胜者:</b> {match.winner_id || 'N/A'}</p>
                <p><b>状态:</b> {match.status}</p>
                {isOrganizer && match.status !== 'finished' && (
                  <Link href={`/matches/selectWinner?id=${match.id}`} className="text-blue-400 hover:underline mt-2 block">
                    选择获胜者
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
