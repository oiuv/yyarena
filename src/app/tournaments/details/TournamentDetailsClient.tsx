'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';

import { getToken } from '@/utils/clientAuth';
import { getTournamentStatusText } from '@/utils/statusTranslators';

// Helper function to determine match stage
const getMatchStage = (matchesInRound: number): string => {
  if (matchesInRound === 1) {
    return '决赛';
  } else if (matchesInRound === 2) {
    return '半决赛';
  } else if (matchesInRound <= 4) { // 3 or 4 matches
    return '1/4 决赛';
  } else if (matchesInRound <= 8) { // 5 to 8 matches
    return '1/8 决赛';
  } else if (matchesInRound <= 16) { // 9 to 16 matches
    return '1/16 决赛';
  } else {
    return '淘汰赛'; // For earlier rounds or larger tournaments (including what was 1/32 finals)
  }
};

export default function TournamentDetailsClient() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get('id');

  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [matchSelections, setMatchSelections] = useState<{[matchId: number]: { winnerSelection: number | 'forfeit_player1' | 'forfeit_player2' | 'forfeit_both' | null, matchFormat: string }}>({}); // New state for individual match selections
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{ name: string, number: string, pass: string }>({ name: '', number: '', pass: '' });
  const [roomDetails, setRoomDetails] = useState<{ room_name: string, room_number: string, room_password: string } | null>(null);

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

          // Initialize matchSelections based on fetched matches
          const initialSelections: {[matchId: number]: { winnerSelection: number | 'forfeit_player1' | 'forfeit_player2' | 'forfeit_both' | null, matchFormat: string }} = {};
          matchesData.forEach((match: any) => {
            initialSelections[match.id] = {
              winnerSelection: match.winner_id || null, // Use existing winner if any
              matchFormat: match.match_format || '1局1胜', // Use existing format or default
            };
          });
          setMatchSelections(initialSelections);

        } catch (err) {
          setError('Failed to fetch tournament details.');
        }
      };
      fetchDetails();

      // Fetch room info if user is logged in
      if (token) {
        const fetchRoomInfo = async () => {
          try {
            const res = await fetch(`/api/tournaments/${tournamentId}/room-info`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              setRoomDetails(data);
            } else {
              console.error('Failed to fetch room info', res.status);
            }
          } catch (err) {
            console.error('Error fetching room info:', err);
          }
        };
        fetchRoomInfo();
      }
    }
  }, [tournamentId]);

  const handleStartTournament = async () => {
    setIsRoomModalOpen(true);
  };

  const handleSubmitRoomInfoAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
        alert('请先登录');
        return;
    }

    const now = new Date();
    const tournamentStartTime = new Date(tournament.start_time);

    if (now < tournamentStartTime) {
      const confirmStart = window.confirm('比赛尚未到开始时间，确定要提前开始吗？');
      if (!confirmStart) {
        return;
      }
    }

    try {
        const res = await fetch(`/api/tournaments/${tournamentId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ room_name: roomInfo.name, room_number: roomInfo.number, room_password: roomInfo.pass }),
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

  const handleMarkWinner = async (match: any) => { // Removed winnerSelection and selectedMatchFormat from params
    const currentSelection = matchSelections[match.id];
    if (!currentSelection || !currentSelection.winnerSelection) {
      alert('请选择一个获胜者或弃权类型。');
      return;
    }

    const token = getToken();
    if (!token) {
      alert('请先登录');
      return;
    }

    let winnerIdToSend: number | null = null;
    let forfeitType: string | null = null;

    // Determine winnerIdToSend and forfeitType based on winnerSelection
    if (typeof currentSelection.winnerSelection === 'number') {
      winnerIdToSend = currentSelection.winnerSelection;
    } else if (currentSelection.winnerSelection === 'forfeit_player1') {
      winnerIdToSend = match.player2_id; // Player 2 wins by Player 1 forfeiting
      forfeitType = 'player1';
    } else if (currentSelection.winnerSelection === 'forfeit_player2') {
      winnerIdToSend = match.player1_id; // Player 1 wins by Player 2 forfeiting
      forfeitType = 'player2';
    } else if (currentSelection.winnerSelection === 'forfeit_both') {
      winnerIdToSend = null; // No winner
      forfeitType = 'both';
    }

    try {
      const res = await fetch(`/api/matches/${match.id}/winner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          winner_id: winnerIdToSend,
          match_format: currentSelection.matchFormat, // Use individual match format
          forfeit_type: forfeitType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log('获胜者已标记！响应数据:', data);
        window.location.reload();
      } else {
        console.error(`错误: ${data.error || data.message}`);
      }
    } catch (err) {
      console.error('一个未知错误发生:', err);
    }
  };

  const handleWinnerSelectionChange = (matchId: number, value: string) => {
    setMatchSelections(prev => {
      let newWinnerSelection: number | 'forfeit_player1' | 'forfeit_player2' | 'forfeit_both' | null;

      if (value === "") {
        newWinnerSelection = null;
      } else if (value === "forfeit_player1") {
        newWinnerSelection = "forfeit_player1";
      } else if (value === "forfeit_player2") {
        newWinnerSelection = "forfeit_player2";
      } else if (value === "forfeit_both") {
        newWinnerSelection = "forfeit_both";
      } else {
        newWinnerSelection = parseInt(value, 10);
      }

      return {
        ...prev,
        [matchId]: {
          ...prev[matchId],
          winnerSelection: newWinnerSelection,
        }
      };
    });
  };

  const handleMatchFormatChange = (matchId: number, value: string) => {
    setMatchSelections(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        matchFormat: value,
      }
    }));
  };


  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  if (!tournament) {
    return <div className="text-center p-8">加载中...</div>;
  }

  const isOrganizer = currentUser && currentUser.role === 'organizer' && currentUser.id === tournament.organizer_id;
  const isPlayer = currentUser && currentUser.role === 'player';
  const isTournamentUpcoming = new Date(tournament.start_time) > new Date();

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-4">{tournament.name}</h1>
      <div className="w-full max-w-4xl bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <p><span className="font-bold">开始时间:</span> {new Date(tournament.start_time).toLocaleString()}</p>
        <p><span className="font-bold">状态:</span> {getTournamentStatusText(tournament.status)}</p>
        <p><span className="font-bold">说明:</span> {tournament.event_description}</p>

        {roomDetails && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-xl font-bold mb-2">砺兵台房间信息</h3>
            <p>房间名: {roomDetails.room_name}</p>
            <p>房间ID: {roomDetails.room_number}</p>
            {roomDetails.room_password && <p>房间密码: {roomDetails.room_password}</p>}
          </div>
        )}
      </div>

      {isOrganizer && tournament.status === 'pending' && (
        <button 
          onClick={handleStartTournament} 
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mb-8"
        >
          {isTournamentUpcoming ? '提前开始比赛' : '开始比赛'}
        </button>
      )}

      {isRoomModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4">完善砺兵台房间信息</h2>
            <form onSubmit={handleSubmitRoomInfoAndStart}>
              <div className="mb-4">
                <label htmlFor="roomName" className="block mb-2">房间名</label>
                <input
                  id="roomName"
                  type="text"
                  value={roomInfo.name}
                  onChange={(e) => setRoomInfo({ ...roomInfo, name: e.target.value })}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                  maxLength={9}
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="roomNumber" className="block mb-2">房间ID</label>
                <input
                  id="roomNumber"
                  type="text"
                  value={roomInfo.number}
                  onChange={(e) => setRoomInfo({ ...roomInfo, number: e.target.value })}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                  maxLength={10}
                  pattern="\d{10}"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="roomPassword" className="block mb-2">密码 (可选)</label>
                <input
                  id="roomPassword"
                  type="text"
                  value={roomInfo.pass}
                  onChange={(e) => setRoomInfo({ ...roomInfo, pass: e.target.value })}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                  maxLength={4}
                  pattern="\d{4}"
                />
              </div>
              <p className="text-sm text-gray-400 mb-4">提示：创建房间的玩法类型必须是1V1，挑战模式必须是管理模式。</p>
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setIsRoomModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                  取消
                </button>
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                  确认并开始比赛
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!currentUser && tournament.status === 'pending' && (
        <Link href="/login">
          <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-8">
            登录后报名
          </button>
        </Link>
      )}

      {isPlayer && tournament.status === 'pending' && (
        <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-8">
          报名参赛
        </button>
      )}

      {tournament.status === 'finished' && tournament.final_rankings && (
        <div className="w-full max-w-4xl bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-3xl font-bold mb-4">最终排名</h2>
          <ul>
            {tournament.final_rankings.map((player: any) => (
              <li key={player.player_id} className="mb-2">
                <b>第 {player.rank} 名:</b> {player.character_name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="text-3xl font-bold mb-4">对阵图</h2>
      <div className="w-full max-w-4xl">
        {matches.length > 0 ? (
          matches.map(match => (
            <div key={match.id} className="bg-gray-700 p-4 rounded-lg mb-2 flex justify-between items-center">
              <div>
                <p><b>第 {match.round_number} 轮</b>
                  <span> ({getMatchStage(matches.filter(m => m.round_number === match.round_number).length)})</span></p> {/* Display round number */}
                <span>{match.player1_character_name || 'Player 1'}{match.player1_registration_status === 'forfeited' ? ' (弃权)' : ''}</span>
                <span className="mx-4">VS</span>
                <span>{match.player2_character_name || (match.player2_id === null ? '(轮空)' : 'Player 2')}{match.player2_registration_status === 'forfeited' ? ' (弃权)' : ''}</span>
                {match.finished_at && ( // Display finished_at if available
                  <p className="text-sm text-gray-400">结束时间: {new Date(match.finished_at).toLocaleString()}</p>
                )}
              </div>
              <div>
                {match.winner_id ? (
                  <span>胜者: {match.winner_character_name} (赛制: {match.match_format})</span> // Display match format
                ) : (
                  isOrganizer && match.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="p-2 border rounded bg-gray-700 text-white"
                        onChange={(e) => handleWinnerSelectionChange(match.id, e.target.value)} // Use new handler
                        value={matchSelections[match.id]?.winnerSelection || ""} // Control the select component
                      >
                        <option value="">选择胜者或弃权</option>
                        {match.player1_id && <option value={match.player1_id}>{match.player1_character_name}</option>}
                        {match.player2_id && <option value={match.player2_id}>{match.player2_character_name}</option>}
                        {match.player1_id && <option value="forfeit_player1">{match.player1_character_name} 弃权</option>}
                        {match.player2_id && <option value="forfeit_player2">{match.player2_character_name} 弃权</option>}
                        <option value="forfeit_both">双方弃权</option>
                      </select>
                      <select
                        className="p-2 border rounded bg-gray-700 text-white"
                        value={matchSelections[match.id]?.matchFormat || "1局1胜"} // Control the select component
                        onChange={(e) => handleMatchFormatChange(match.id, e.target.value)} // Use new handler
                      >
                        <option value="1局1胜">1局1胜</option>
                        <option value="3局2胜">3局2胜</option>
                        <option value="5局3胜">5局3胜</option>
                      </select>
                      <button
                        onClick={() => handleMarkWinner(match)} // Pass only match object
                        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {/* Dynamic button text based on selection */}
                        {(() => {
                          const selection = matchSelections[match.id]?.winnerSelection;
                          if (typeof selection === 'number') return '确认胜者';
                          if (selection === 'forfeit_player1' || selection === 'forfeit_player2') return '确认单方弃权';
                          if (selection === 'forfeit_both') return '确认双方弃权';
                          return '确认';
                        })()}
                      </button>
                    </div>
                  ) : (
                    // Display "双方弃权" if status is 'forfeited', otherwise "未开始"
                    <span>{match.status === 'forfeited' ? '双方弃权' : '未开始'}</span>
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