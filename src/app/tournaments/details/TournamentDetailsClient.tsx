'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';
import Image from 'next/image';

import { getToken } from '@/utils/clientAuth';
import { getTournamentStatusText, getDynamicTournamentStatusText } from '@/utils/statusTranslators';

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

const getPrizeForRank = (rank: number, prizes: any[]) => {
  if (!prizes || prizes.length === 0) return null;

  // Sort prizes by rank_start to ensure correct matching
  const sortedPrizes = [...prizes].sort((a, b) => (a.rank_start || 0) - (b.rank_start || 0));

  for (const prize of sortedPrizes) {
    if (prize.rank_start && prize.rank_end) {
      if (rank >= prize.rank_start && rank <= prize.rank_end) {
        return prize;
      }
    } else if (prize.rank_start === rank) { // For single rank prizes
      return prize;
    }
  }

  // Check for participation prize if no specific rank prize is found
  const participationPrize = prizes.find((p: any) => p.rank_start === null && p.rank_end === null && p.custom_prize_name === '参与奖');
  if (participationPrize) {
    return participationPrize;
  }

  return null;
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
  const [roomInfo, setRoomInfo] = useState<{ name: string, number: string, pass: string, livestreamUrl: string }>({ name: '', number: '', pass: '', livestreamUrl: '' });
  const [roomDetails, setRoomDetails] = useState<{ room_name: string, room_number: string, room_password: string, livestreamUrl: string } | null>(null);
  const [registeredPlayers, setRegisteredPlayers] = useState<any[]>([]); // New state for registered players when no matches
  const [playerAvatars, setPlayerAvatars] = useState<{ [key: string]: string }>({});
  const [prizes, setPrizes] = useState<any[]>([]);
  const [awardedPrizes, setAwardedPrizes] = useState<any[]>([]);
  const [selectedPrizes, setSelectedPrizes] = useState<{ [playerId: string]: string }>({});
  const [awarding, setAwarding] = useState<string | null>(null);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [registrationCodeInput, setRegistrationCodeInput] = useState('');
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [userRegistrationId, setUserRegistrationId] = useState<number | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!tournamentId) return;
    const token = getToken();

    try {
      const [tournamentRes, matchesRes, prizesRes, awardedPrizesRes, registrationStatusRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}`),
        fetch(`/api/tournaments/${tournamentId}/matches`),
        fetch(`/api/prizes`),
        fetch(`/api/tournaments/${tournamentId}/awards`),
        token ? fetch(`/api/tournaments/${tournamentId}/registration-status`, { headers: { 'Authorization': `Bearer ${token}` } }) : Promise.resolve(null)
      ]);

      const tournamentData = await tournamentRes.json();
      const matchesData = await matchesRes.json();
      const prizesData = await prizesRes.json();
      const awardedPrizesData = await awardedPrizesRes.json();

      setTournament(tournamentData);
      setMatches(matchesData);
      setPrizes(prizesData);
      setAwardedPrizes(awardedPrizesData);

      if (registrationStatusRes && registrationStatusRes.ok) {
        const regData = await registrationStatusRes.json();
        setIsUserRegistered(regData.isRegistered);
        setUserRegistrationId(regData.registrationId);
      }

      // Create a map of player IDs to avatars from the matches data
      if (matchesData.length > 0) {
        const avatarMap: { [key: string]: string } = {};
        matchesData.forEach((match: any) => {
          if (match.player1_id && match.player1_avatar) {
            avatarMap[match.player1_id] = match.player1_avatar;
          }
          if (match.player2_id && match.player2_avatar) {
            avatarMap[match.player2_id] = match.player2_avatar;
          }
        });
        setPlayerAvatars(avatarMap);
      }

      // Initialize matchSelections based on fetched matches
      const initialSelections: {[matchId: number]: { winnerSelection: number | 'forfeit_player1' | 'forfeit_player2' | 'forfeit_both' | null, matchFormat: string }} = {};
      matchesData.forEach((match: any) => {
        initialSelections[match.id] = {
          winnerSelection: match.winner_id || null, // Use existing winner if any
          matchFormat: match.match_format || '1局1胜', // Use existing format or default
        };
      });
      setMatchSelections(initialSelections);

      // If no matches are generated, fetch all registered players
      if (matchesData.length === 0) {
        const registeredPlayersRes = await fetch(`/api/tournaments/${tournamentId}/registered-players-avatars`);
        if (registeredPlayersRes.ok) {
          const playersData = await registeredPlayersRes.json();
          setRegisteredPlayers(playersData);
        }
      }

    } catch (err) {
      setError('Failed to fetch tournament details.');
    }
  }, [tournamentId]);

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
  }, [tournamentId, fetchDetails]);

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
            body: JSON.stringify({ room_name: roomInfo.name, room_number: roomInfo.number, room_password: roomInfo.pass, livestream_url: roomInfo.livestreamUrl }),
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
        await fetchDetails(); // Re-fetch data instead of full reload
        // Scroll to the updated match
        const updatedMatchElement = document.getElementById(`match-${match.id}`);
        if (updatedMatchElement) {
          updatedMatchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
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

  const handlePrizeSelectionChange = (playerId: string, prizeId: string) => {
    setSelectedPrizes(prev => ({
      ...prev,
      [playerId]: prizeId,
    }));
  };

  const handleAwardPrize = async (playerId: string) => {
    const prizeId = selectedPrizes[playerId];
    if (!prizeId) {
      alert('请为玩家选择一个奖品。');
      return;
    }

    const token = getToken();
    if (!token) {
      alert('认证失败，请重新登录。');
      return;
    }

    setAwarding(playerId);

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/award`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ player_id: playerId, prize_id: prizeId }),
        }
      );

      if (res.ok) {
        fetchDetails(); // Re-fetch details to update the UI
      } else {
        const data = await res.json();
        alert(`奖品发放失败: ${data.message}`);
      }
    } catch (err) {
      console.error('Error awarding prize:', err);
      alert('发放奖品时发生网络错误。');
    } finally {
      setAwarding(null);
    }
  };

  const executeRegistration = useCallback(async (code: string | null) => {
    const token = getToken();
    if (!token) {
      alert('请登录后报名比赛。');
      return;
    }

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tournamentId, registrationCode: code }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`成功报名比赛: ${tournament.name}！`);
        fetchDetails(); // Re-fetch details to update player list
        setIsRegistrationModalOpen(false);
        setRegistrationCodeInput('');
      } else {
        alert(`报名失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('报名时发生网络错误。');
    }
  }, [tournamentId, tournament, fetchDetails]);

  const handleRegisterClick = () => {
    if (tournament.registration_code) {
      setIsRegistrationModalOpen(true);
    } else {
      executeRegistration(null);
    }
  };

  const handleModalSubmit = () => {
    if (!registrationCodeInput) {
      alert('请输入参赛验证码。');
      return;
    }
    executeRegistration(registrationCodeInput);
  };

  const handleWithdrawal = async () => {
    if (!userRegistrationId) {
      alert('无法找到您的报名记录，请刷新页面后重试。');
      return;
    }

    if (!window.confirm('您确定要退出本次比赛吗？退出后在报名截止前仍可重新报名。')) {
      return;
    }

    const token = getToken();
    if (!token) {
      alert('认证失败，请重新登录。');
      return;
    }

    try {
      const res = await fetch(`/api/registrations/${userRegistrationId}/withdraw`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        alert('您已成功退出比赛。');
        fetchDetails(); // Re-fetch details to update UI
      } else {
        const data = await res.json();
        alert(`退出失败: ${data.message}`);
      }
    } catch (err) {
      console.error('Error withdrawing from tournament:', err);
      alert('退出比赛时发生网络错误。');
    }
  };


  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  if (!tournament) {
    return <div className="text-center p-8">加载中...</div>;
  }

  const isOrganizer = currentUser && currentUser.role === 'organizer' && currentUser.id === tournament.organizer_id;
  const isPlayer = currentUser && currentUser.role === 'player';
  const isRegistrationOpen = new Date(tournament.registration_deadline) > new Date();
  const isTournamentUpcoming = new Date(tournament.start_time) > new Date();
  const isTournamentActionable = tournament.status !== 'ongoing' && tournament.status !== 'finished';
  const canRegister = isRegistrationOpen && isTournamentActionable && currentUser && !isOrganizer && !isUserRegistered;
  const canWithdraw = isRegistrationOpen && isTournamentActionable && currentUser && !isOrganizer && isUserRegistered;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 lg:p-12 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-4">{tournament.name}</h1>
      <div className="w-full max-w-full md:max-w-4xl bg-gray-800 rounded-lg shadow-md p-4 md:p-6 mb-8">
        <div className="mb-4 text-center">
          <Image
            src={tournament.cover_image_url ? `/${tournament.cover_image_url.startsWith('/') ? tournament.cover_image_url.substring(1) : tournament.cover_image_url}` : '/images/default_cover.jpg'}
            alt="Tournament Cover"
            width={800}
            height={450}
            className="rounded-lg object-cover mx-auto"
          />
        </div>
        <p><span className="font-bold">开始时间:</span> {new Date(tournament.start_time).toLocaleString()}</p>
        <p><span className="font-bold">状态:</span> {getDynamicTournamentStatusText(tournament)}</p>
        <p><span className="font-bold">最少参赛人数:</span> {tournament.min_players}</p>
        <p><span className="font-bold">最大参赛人数:</span> {tournament.max_players}</p>
        <p><span className="font-bold">说明:</span> <span dangerouslySetInnerHTML={{ __html: tournament.event_description.replace(/\n/g, '<br />') }} /></p>

        <div className="mt-6 text-center">
          {canRegister && (
            <button 
              onClick={handleRegisterClick}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg transform hover:scale-105 transition-transform duration-300"
            >
              立即报名
            </button>
          )}
          {canWithdraw && (
            <button 
              onClick={handleWithdrawal}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg transform hover:scale-105 transition-transform duration-300"
            >
              退出报名
            </button>
          )}
          {isUserRegistered && !isRegistrationOpen && (
            <span className="text-lg font-semibold text-green-400">您已报名</span>
          )}
        </div>

        {isRegistrationModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-11/12 max-w-md border border-yellow-500">
              <h2 className="text-2xl font-bold mb-4 text-yellow-400">需要验证码</h2>
              <p className="mb-6 text-gray-300">此比赛为私密比赛，请输入参赛验证码。</p>
              <input
                type="text"
                placeholder="请输入验证码"
                value={registrationCodeInput}
                onChange={(e) => setRegistrationCodeInput(e.target.value)}
                className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white mb-6 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                required
              />
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsRegistrationModalOpen(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleModalSubmit}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
                >
                  确认报名
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 主办方信息 */}
          <div className="p-4 bg-gray-700 rounded-lg flex items-center space-x-4">
            <Image
              src={tournament.organizer_avatar ? `/avatars/${tournament.organizer_avatar}` : '/avatars/000.webp'}
              alt={tournament.organizer_character_name || '主办方'}
              width={64}
              height={64}
              className="rounded-full border-2 border-purple-500"
            />
            <div>
              <p className="text-lg font-medium">{tournament.organizer_character_name || '未知主办方'}</p>
              {tournament.organizer_stream_url && (
                <p className="text-sm">
                  <Link href={tournament.organizer_stream_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    主办方主页
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* 直播信息 */}
          <div className="p-4 bg-gray-700 rounded-lg flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold mb-2">直播信息</h3>
            {roomDetails && roomDetails.livestreamUrl && tournament.status === 'ongoing' ? (
              <a href={roomDetails.livestreamUrl} target="_blank" rel="noopener noreferrer">
                <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                  正在直播中
                </button>
              </a>
            ) : (
              <p className="text-gray-400">暂无直播</p>
            )}
          </div>
        </div>

        {/* 砺兵台房间信息 */}
        {roomDetails && (roomDetails.room_name || roomDetails.room_number) ? (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg flex flex-col items-center text-center">
            <h3 className="text-xl font-bold mb-2">🛡️ 砺兵台房间信息 🛡️</h3>
            <p>房间名: {roomDetails.room_name}  |  房间ID: {roomDetails.room_number}{roomDetails.room_password && `  |  房间密码: ${roomDetails.room_password}`}</p>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg flex flex-col items-center text-center text-gray-400">
            <h3 className="text-xl font-bold mb-2">🛡️ 砺兵台房间信息 🛡️</h3>
            <p>（由主办方在正式开赛前填写）</p>
          </div>
        )}

        {tournament.prizes && tournament.prizes.length > 0 && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-xl font-bold mb-2">奖品设置</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">奖项</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">排名</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">奖品名称</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">数量</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {(() => {
                    const participationPrize = tournament.prizes.find((p: any) => p.custom_prize_name === '参与奖');
                    const nonParticipationPrizes = tournament.prizes.filter((p: any) => p.custom_prize_name !== '参与奖');

                    const sortedPrizes = nonParticipationPrizes.sort((a: any, b: any) => {
                      // Custom unranked prizes (rank_start: 0, rank_end: 0) should come after ranked prizes
                      const isAUnrankedCustom = a.rank_start === 0 && a.rank_end === 0;
                      const isBUnrankedCustom = b.rank_start === 0 && b.rank_end === 0;

                      if (isAUnrankedCustom && !isBUnrankedCustom) return 1; // A (unranked custom) comes after B (ranked)
                      if (!isAUnrankedCustom && isBUnrankedCustom) return -1; // A (ranked) comes before B (unranked custom)
                      if (isAUnrankedCustom && isBUnrankedCustom) return 0; // Both are unranked custom, maintain original order

                      // For ranked prizes, sort by rank_start
                      return (a.rank_start || Infinity) - (b.rank_start || Infinity);
                    });

                    if (participationPrize) {
                      sortedPrizes.push(participationPrize);
                    }

                    return sortedPrizes.map((prize: any, index: number) => {
                      let awardType = '';
                      let rankDisplay = '';

                      if (prize.custom_prize_name) {
                        awardType = prize.custom_prize_name;
                        if (prize.rank_start !== null && prize.rank_end !== null) {
                          if (prize.rank_start === 0 && prize.rank_end === 0) {
                            rankDisplay = '无';
                          } else if (prize.rank_start === prize.rank_end) {
                            rankDisplay = `第 ${prize.rank_start} 名`;
                          } else {
                            rankDisplay = `第 ${prize.rank_start} 到 ${prize.rank_end} 名`;
                          }
                        } else if (prize.custom_prize_name === '参与奖') {
                          rankDisplay = '所有未获奖者';
                        }
                      } else if (prize.rank_start !== null && prize.rank_end !== null) {
                        if (prize.rank_start === 1) {
                          awardType = '冠军';
                          rankDisplay = '第 1 名';
                        } else if (prize.rank_start === 2) {
                          awardType = '亚军';
                          rankDisplay = '第 2 名';
                        } else if (prize.rank_start === 3) {
                          awardType = '季军';
                          rankDisplay = '第 3 名';
                        } else if (prize.rank_start === 4) {
                          awardType = '第四名';
                          rankDisplay = '第 4 名';
                        } else if (prize.rank_start === 5) {
                          awardType = '第五名';
                          rankDisplay = '第 5 名';
                        } else if (prize.rank_start === prize.rank_end) {
                          awardType = `第 ${prize.rank_start} 名`;
                          rankDisplay = `第 ${prize.rank_start} 名`;
                        } else {
                          awardType = `第 ${prize.rank_start} 到 ${prize.rank_end} 名`;
                          rankDisplay = `第 ${prize.rank_start} 到 ${prize.rank_end} 名`;
                        }
                      }

                      return (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{awardType}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{rankDisplay}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{prize.prize_name}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{prize.quantity}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
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
                  placeholder="请填写在游戏中创建的砺兵台房间名称 (限制9个字符)"
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
                  placeholder="请填写在游戏中创建的砺兵台房间ID (10位数字)"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="roomPassword" className="block mb-2">房间密码 (可选)</label>
                <input
                  id="roomPassword"
                  type="text"
                  value={roomInfo.pass}
                  onChange={(e) => setRoomInfo({ ...roomInfo, pass: e.target.value })}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="请填写房间密码 (4位数字，无密码则留空)"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="livestreamUrl" className="block mb-2">直播网址 (可选)</label>
                <input
                  id="livestreamUrl"
                  type="url"
                  value={roomInfo.livestreamUrl}
                  onChange={(e) => setRoomInfo({ ...roomInfo, livestreamUrl: e.target.value })}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                  placeholder="例如: https://live.douyin.com/244993118346"
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

      

      {tournament.status === 'finished' && tournament.final_rankings && (
        <div className="w-full max-w-4xl bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-3xl font-bold mb-4 text-center text-amber-400">🏆 最终排名 🏆</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">排名</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">玩家</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">奖品</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {tournament.final_rankings.map((player: any) => {
                  const awardedPrize = awardedPrizes.find(ap => ap.player_id === player.player_id);
                  const prizeWonByRank = getPrizeForRank(player.rank, tournament.prizes);

                  return (
                    <tr key={player.player_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-lg font-bold">
                        <span className={`inline-block text-center ${
                          player.rank === 1 ? 'text-yellow-400' :
                          player.rank === 2 ? 'text-gray-300' :
                          player.rank === 3 ? 'text-yellow-600' : ''
                        }`}>
                          第 {player.rank} 名
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <Image
                              src={player.avatar ? `/avatars/${player.avatar}` : (playerAvatars[player.player_id] ? `/avatars/${playerAvatars[player.player_id]}` : '/avatars/000.webp')}
                              alt={player.character_name}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{player.character_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isOrganizer ? (
                          awardedPrize ? (
                            <span className="text-green-400">已发放: {awardedPrize.prize_name}</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                className="p-2 border rounded bg-gray-700 text-white"
                                value={selectedPrizes[player.player_id] || ''}
                                onChange={(e) => handlePrizeSelectionChange(player.player_id, e.target.value)}
                              >
                                <option value="">选择奖品</option>
                                {prizes.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAwardPrize(player.player_id)}
                                disabled={awarding === player.player_id}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-bold disabled:bg-gray-500"
                              >
                                {awarding === player.player_id ? '发放中...' : '确认发放'}
                              </button>
                            </div>
                          )
                        ) : (
                          awardedPrize ? (
                            <span className="text-amber-400">{awardedPrize.prize_name}</span>
                          ) : (
                            <span className="text-gray-400">{prizeWonByRank ? (prizeWonByRank.custom_prize_name || prizeWonByRank.prize_name) : '无'}</span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="text-3xl font-bold mb-4">对阵图</h2>
      <div className="w-full max-w-full md:max-w-4xl px-2 md:px-0">
        {matches.length > 0 ? (
          matches.map(match => (
            <div key={match.id} className="bg-gray-800 p-4 rounded-lg shadow-lg mb-4 border border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                <p className="text-lg font-semibold text-gray-300 mb-2 sm:mb-0">
                  第 {match.round_number} 轮
                  <span className="ml-2 text-sm text-gray-400"> ({getMatchStage(matches.filter(m => m.round_number === match.round_number).length)})</span>
                </p>
                {match.finished_at && (
                  <p className="text-sm text-gray-400">结束时间: {new Date(match.finished_at).toLocaleString()}</p>
                )}
              </div>

              <div className="flex items-center justify-center space-x-6 mb-4">
                <div className="flex flex-col items-center">
                  <Image
                    src={match.player1_avatar ? `/avatars/${match.player1_avatar}` : '/avatars/000.webp'}
                    alt={match.player1_character_name || 'Player 1'}
                    width={64}
                    height={64}
                    className="rounded-full border-2 border-blue-500"
                  />
                  <span className="mt-2 text-lg font-medium text-center">
                    {match.player1_character_name || 'Player 1'}
                    {match.player1_registration_status === 'forfeited' ? ' (弃权)' : ''}
                  </span>
                </div>

                <span className="text-3xl font-bold text-amber-400">VS</span>

                <div className="flex flex-col items-center">
                  <Image
                    src={match.player2_avatar ? `/avatars/${match.player2_avatar}` : '/avatars/000.webp'}
                    alt={match.player2_character_name || 'Player 2'}
                    width={64}
                    height={64}
                    className="rounded-full border-2 border-red-500"
                  />
                  <span className="mt-2 text-lg font-medium text-center">
                    {match.player2_character_name || (match.player2_id === null ? '(轮空)' : 'Player 2')}
                    {match.player2_registration_status === 'forfeited' ? ' (弃权)' : ''}
                  </span>
                </div>
              </div>

              <div className="text-center">
                {match.winner_id ? (
                  <p className="text-xl font-bold text-green-400">
                    胜者: {match.winner_character_name} (赛制: {match.match_format})
                  </p>
                ) : (
                  isOrganizer && match.status === 'pending' ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-2 w-full">
                        <select
                          className="p-2 border rounded bg-gray-700 text-white w-full sm:w-auto"
                          onChange={(e) => handleWinnerSelectionChange(match.id, e.target.value)}
                          value={matchSelections[match.id]?.winnerSelection || ""}
                        >
                          <option value="">选择胜者或弃权</option>
                          {match.player1_id && <option value={match.player1_id}>{match.player1_character_name}</option>}
                          {match.player2_id && <option value={match.player2_id}>{match.player2_character_name}</option>}
                          {match.player1_id && <option value="forfeit_player1">{match.player1_character_name} 弃权</option>}
                          {match.player2_id && <option value="forfeit_player2">{match.player2_character_name} 弃权</option>}
                          <option value="forfeit_both">双方弃权</option>
                        </select>
                        <select
                          className="p-2 border rounded bg-gray-700 text-white w-full sm:w-auto"
                          value={matchSelections[match.id]?.matchFormat || "1局1胜"}
                          onChange={(e) => handleMatchFormatChange(match.id, e.target.value)}
                        >
                          <option value="1局1胜">1局1胜</option>
                          <option value="3局2胜">3局2胜</option>
                          <option value="5局3胜">5局3胜</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleMarkWinner(match)}
                        className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-bold w-full"
                      >
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
                    <p className="text-lg text-gray-400">{match.status === 'forfeited' ? '双方弃权' : '未开始'}</p>
                  )
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center">
            <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-4 rounded-lg text-center my-6">
                <p className="text-xl font-bold">⏳ 对阵尚未生成 ⏳</p>
                <p className="mt-2">正式开赛时将自动生成对阵，请及时关注本页更新。</p>
            </div>
            {registeredPlayers.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xl font-bold mb-2">✨ 已报名玩家 ✨</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {registeredPlayers.map((player: any, idx: number) => (
                    <div key={idx} className="flex flex-col items-center">
                      <Image
                        src={player.avatar ? `/avatars/${player.avatar}` : '/avatars/000.webp'}
                        alt={player.character_name}
                        width={64}
                        height={64}
                        className="inline-block h-16 w-16 rounded-full ring-2 ring-blue-400"
                      />
                      <p className="text-sm mt-1">{player.character_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
