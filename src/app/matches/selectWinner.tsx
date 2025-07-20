'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTournamentStatusText } from '@/utils/statusTranslators';

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

export default function SelectWinnerPage() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get('id');

  const [match, setMatch] = useState<any>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) {
      setError('比赛ID缺失。');
      setLoading(false);
      return;
    }

    const fetchMatchDetails = async () => {
      try {
        // Fetch all matches for a tournament and find the specific match
        // This is a workaround as we don't have a direct /api/matches/:id endpoint
        const token = getToken();
        if (!token) {
          setError('未授权：请登录。');
          setLoading(false);
          return;
        }

        // First, get the tournament ID from the match (requires a new API endpoint or a more complex query)
        // For now, we'll assume we can fetch all matches and find the one.
        // This is inefficient and should be improved with a dedicated API for single match.
        const allTournamentsRes = await fetch('/api/tournaments', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!allTournamentsRes.ok) throw new Error('获取比赛列表失败。');
        const allTournaments = await allTournamentsRes.json();

        let foundMatch = null;
        for (const tour of allTournaments) {
          const matchesRes = await fetch(`/api/tournaments/matches?tournamentId=${tour.id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!matchesRes.ok) continue; // Skip if matches for this tournament can't be fetched
          const matchesData = await matchesRes.json();
          foundMatch = matchesData.find((m: any) => m.id === parseInt(matchId));
          if (foundMatch) break;
        }

        if (foundMatch) {
          setMatch(foundMatch);
          setWinnerId(foundMatch.winner_id);
        } else {
          setError('未找到比赛。');
        }
      } catch (err: any) {
        setError(err.message || '获取对局详情失败。');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [matchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!match || winnerId === null) {
      setMessage('请选择一个获胜者。');
      return;
    }

    const token = getToken();
    if (!token) {
      setMessage('未授权：请登录。');
      return;
    }

    try {
      const res = await fetch('/api/matches/winner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          match_id: match.id,
          winner_id: winnerId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || '获胜者更新成功！');
        // Optionally refresh match data or redirect
      } else {
        setMessage(data.error || '更新获胜者失败。');
      }
    } catch (err: any) {
      setMessage(err.message || '发生错误。');
    }
  };

  if (loading) {
    return <main className="flex min-h-screen flex-col items-center p-24"><p>正在加载对局详情...</p></main>;
  }

  if (error) {
    return <main className="flex min-h-screen flex-col items-center p-24"><p className="text-red-500">错误: {error}</p></main>;
  }

  if (!match) {
    return <main className="flex min-h-screen flex-col items-center p-24"><p>未找到对局。</p></main>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold mb-8">选择对局 {match.id} 的获胜者</h1>
      <div className="p-4 border rounded mb-4 w-full max-w-md">
        <p>回合: {match.round_number}</p>
        <p>玩家1 ID: {match.player1_id}</p>
        <p>玩家2 ID: {match.player2_id || '轮空'}</p>
        <p>状态: {getTournamentStatusText(match.status).text}</p>
        {match.winner_id && <p className="font-bold">当前获胜者: {match.winner_id}</p>}
      </div>

      {match.status !== 'finished' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
          <label className="block">
            <input
              type="radio"
              name="winner"
              value={match.player1_id}
              checked={winnerId === match.player1_id}
              onChange={() => setWinnerId(match.player1_id)}
              className="mr-2"
            />
            玩家1 (ID: {match.player1_id})
          </label>
          {match.player2_id && (
            <label className="block">
              <input
                type="radio"
                name="winner"
                value={match.player2_id}
                checked={winnerId === match.player2_id}
                onChange={() => setWinnerId(match.player2_id)}
                className="mr-2"
              />
              玩家2 (ID: {match.player2_id})
            </label>
          )}
          <button type="submit" className="p-2 bg-blue-500 text-white rounded">
            提交获胜者
          </button>
        </form>
      )}

      {message && <p className="mt-4 text-lg">{message}</p>}
    </main>
  );
}
