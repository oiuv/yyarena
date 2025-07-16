'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

import { getToken } from '@/utils/clientAuth';

export default function TournamentDetailsClient() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get('id');

  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedWinner, setSelectedWinner] = useState<number | null>(null);
  const [selectedMatchFormat, setSelectedMatchFormat] = useState<string>('1局1胜'); // New state for match format

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        setCurrentUser(jwtDecode(token));
      } catch (e) {
        console.error('Invalid token', e);
      }
    }

    if (tournamentId) {
      const fetchDetails = async () => {
        try {
          const [tournamentRes, matchesRes] = await Promise.all([
            fetch(`/api/tournaments/${tournamentId}`),
            fetch(`/api/tournaments/${tournamentId}/matches`)
          ]);
          const tournamentData = await tournamentRes.json();
          const matchesData = await matchesRes.json();
          setTournament(tournamentData);
          setMatches(matchesData);
        } catch (err) {
          setError('Failed to fetch tournament details.');
        }
      };
      fetchDetails();
    }
  }, [tournamentId]);

  const handleStartTournament = async () => {
    const token = getToken();
    if (!token) {
        alert('请先登录');
        return;
    }

    try {
        const res = await fetch(`/api/tournaments/${tournamentId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await res.json();
        if (res.ok) {
            alert('比赛已成功开始！');
            window.location.reload();
        } else {
            alert(`错误: ${data.message}`);
        }
    } catch (err) {
        alert('一个未知错误发生');
    }
  };

  const handleMarkWinner = async (matchId: number, winnerId: number | null) => {
    if (!winnerId) {
      alert('请选择一个获胜者。');
      return;
    }

    const token = getToken();
    if (!token) {
      alert('请先登录');
      return;
    }

    try {
      const res = await fetch(`/api/matches/${matchId}/winner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ winner_id: winnerId, match_format: selectedMatchFormat }), // Pass match_format
      });

      const data = await res.json();
      if (res.ok) {
        console.log('获胜者已标记！响应数据:', data); // Log the full response
        // Refresh data
        window.location.reload();
      } else {
        console.error(`错误: ${data.error || data.message}`);
      }
    } catch (err) {
      console.error('一个未知错误发生:', err);
    }
  };

  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  if (!tournament) {
    return <div className="text-center p-8">加载中...</div>;
  }

  const isOrganizer = currentUser && currentUser.role === 'organizer' && currentUser.id === tournament.organizer_id;

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-4">{tournament.name}</h1>
      <div className="w-full max-w-4xl bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <p><span className="font-bold">开始时间:</span> {new Date(tournament.start_time).toLocaleString()}</p>
        <p><span className="font-bold">状态:</span> {tournament.status}</p>
        <p><span className="font-bold">说明:</span> {tournament.event_description}</p>
      </div>

      {isOrganizer && tournament.status === 'pending' && (
        <button 
          onClick={handleStartTournament} 
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mb-8"
        >
          开始比赛
        </button>
      )}

      <h2 className="text-3xl font-bold mb-4">对阵图</h2>
      <div className="w-full max-w-4xl">
        {matches.length > 0 ? (
          matches.map(match => (
            <div key={match.id} className="bg-gray-700 p-4 rounded-lg mb-2 flex justify-between items-center">
              <div>
                <span>{match.player1_character_name || 'Player 1'}</span>
                <span className="mx-4">VS</span>
                <span>{match.player2_character_name || (match.player2_id === null ? '(轮空)' : 'Player 2')}</span>
              </div>
              <div>
                {match.winner_id ? (
                  <span>胜者: {match.winner_character_name} (赛制: {match.match_format})</span> // Display match format
                ) : (
                  isOrganizer && match.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="p-2 border rounded bg-gray-700 text-white"
                        onChange={(e) => setSelectedWinner(parseInt(e.target.value))}
                      >
                        <option value="">选择胜者</option>
                        {match.player1_id && <option value={match.player1_id}>{match.player1_character_name}</option>}
                        {match.player2_id && <option value={match.player2_id}>{match.player2_character_name}</option>}
                      </select>
                      <select
                        className="p-2 border rounded bg-gray-700 text-white"
                        value={selectedMatchFormat}
                        onChange={(e) => setSelectedMatchFormat(e.target.value)}
                      >
                        <option value="1局1胜">1局1胜</option>
                        <option value="3局2胜">3局2胜</option>
                        <option value="5局3胜">5局3胜</option>
                      </select>
                      <button
                        onClick={() => handleMarkWinner(match.id, selectedWinner)}
                        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        确认胜者
                      </button>
                    </div>
                  ) : (
                    <span>未开始</span>
                  )
                )}
              </div>
            </div>
          ))
        ) : (
          <p>对阵尚未生成。</p>
        )}
      </div>
    </main>
  );
}