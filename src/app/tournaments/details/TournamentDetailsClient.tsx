'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';
import Image from 'next/image';

import { getToken } from '@/utils/clientAuth';
import { getTournamentStatusText, getDynamicTournamentStatusText } from '@/utils/statusTranslators';
import toast from 'react-hot-toast';
import ConfirmationToast from '@/components/ConfirmationToast';

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
  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{ name: string, number: string, pass: string, livestreamUrl: string }>({ name: '', number: '', pass: '', livestreamUrl: '' });
  const [roomDetails, setRoomDetails] = useState<{ room_name: string, room_number: string, room_password: string, livestreamUrl: string } | null>(null);
  const [registeredPlayers, setRegisteredPlayers] = useState<any[]>([]); // New state for registered players when no matches
  const [playerAvatars, setPlayerAvatars] = useState<{ [key: string]: string }>({});
  const [prizes, setPrizes] = useState<any[]>([]);
  const [awardedPrizes, setAwardedPrizes] = useState<any[]>([]);
  const [selectedPrizes, setSelectedPrizes] = useState<{ [playerId: string]: string }>({});
  const [prizeRemarks, setPrizeRemarks] = useState<{ [playerId: string]: string }>({}); // New state for prize remarks
  const [awarding, setAwarding] = useState<string | null>(null);
  const [editingAwardId, setEditingAwardId] = useState<number | null>(null); // New state for editing award
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [registrationCodeInput, setRegistrationCodeInput] = useState('');
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [userRegistrationId, setUserRegistrationId] = useState<number | null>(null);
  const [extraAwards, setExtraAwards] = useState<any[]>([]);
  const [editingExtraAward, setEditingExtraAward] = useState<any | null>(null);
  const [editGameId, setEditGameId] = useState('');
  const [editPrizeId, setEditPrizeId] = useState('');
  const [editPrizeDesc, setEditPrizeDesc] = useState('');
  const [editRemark, setEditRemark] = useState('');

  // Derived states - these depend on other states and should be re-calculated on each render
  const isOrganizer = currentUser && currentUser.role === 'organizer' && tournament && currentUser.id === tournament.organizer_id;
  const isPlayer = currentUser && currentUser.role === 'player';
  const isRegistrationOpen = tournament ? new Date(tournament.registration_deadline) > new Date() : false;
  const isTournamentUpcoming = tournament ? new Date(tournament.start_time) > new Date() : false;
  const isTournamentActionable = tournament ? tournament.status !== 'ongoing' && tournament.status !== 'finished' : false;
  const canRegister = isRegistrationOpen && isTournamentActionable && currentUser && !isOrganizer && !isUserRegistered;
  const canWithdraw = isRegistrationOpen && isTournamentActionable && currentUser && !isOrganizer && isUserRegistered;

  const fetchDetails = useCallback(async () => {
    if (!tournamentId) return;
    const token = getToken();

    try {
      const promises = [
        fetch(`/api/tournaments/${tournamentId}`),
        fetch(`/api/tournaments/${tournamentId}/matches`),
        fetch(`/api/prizes`),
        fetch(`/api/tournaments/${tournamentId}/awards`),
        fetch(`/api/tournaments/${tournamentId}/extra-awards`)
      ];

      // 添加房间信息获取
      if (token && (isOrganizer || isUserRegistered)) {
        promises.push(fetch(`/api/tournaments/${tournamentId}/room-info`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }));
      } else {
        promises.push(Promise.resolve(new Response(null, { status: 404 })));
      }

      // 添加报名状态获取
      if (token) {
        promises.push(fetch(`/api/tournaments/${tournamentId}/registration-status`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        }));
      } else {
        promises.push(Promise.resolve(new Response(null, { status: 404 })));
      }

      const [
        tournamentRes, 
        matchesRes, 
        prizesRes, 
        awardedPrizesRes, 
        extraAwardsRes,
        roomInfoRes,
        registrationStatusRes
      ] = await Promise.all(promises);

      const tournamentData = await tournamentRes.json();
      const matchesData = await matchesRes.json();
      const prizesData = await prizesRes.json();
      const awardedPrizesData = await awardedPrizesRes.json();
      const extraAwardsData = await extraAwardsRes.json();

      console.log('Tournament Data:', tournamentData);
      console.log('Tournament Status:', tournamentData.status);
      console.log('Registration Deadline:', tournamentData.registration_deadline);
      console.log('Start Time:', tournamentData.start_time);
      console.log('Registered Players Count:', tournamentData.registeredPlayersCount);
      console.log('Min Players:', tournamentData.min_players);

      setTournament(tournamentData);
      setMatches(matchesData);
      setPrizes(prizesData);
      setAwardedPrizes(awardedPrizesData);
      setExtraAwards(extraAwardsData);

      // 处理房间信息
      if (roomInfoRes && roomInfoRes.ok) {
        const roomData = await roomInfoRes.json();
        setRoomDetails(roomData);
      } else {
        setRoomDetails(null);
      }

      // 处理报名状态
      if (registrationStatusRes && registrationStatusRes.ok) {
        const regData = await registrationStatusRes.json();
        setIsUserRegistered(regData.isRegistered);
        setUserRegistrationId(regData.registrationId);
      } else {
        setIsUserRegistered(false);
        setUserRegistrationId(null);
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
      // 只有当错误不是预期的 403 时才设置全局错误
      if (err instanceof Error && err.message.includes('Failed to fetch room info with status: 403')) {
        console.warn('Expected 403 error during fetchDetails, not setting global error.');
      } else {
        setError('Failed to fetch tournament details.');
      }
    }
  }, [tournamentId, isOrganizer, isUserRegistered]);

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
    }
  }, [tournamentId, fetchDetails, isOrganizer, isUserRegistered]);

  const handleStartTournament = async () => {
    setIsRoomModalOpen(true);
  };

  const handleEditRoomInfo = async () => {
    // 预填充现有信息
    setRoomInfo({
      name: roomDetails?.room_name || '',
      number: roomDetails?.room_number || '',
      pass: roomDetails?.room_password || '',
      livestreamUrl: roomDetails?.livestreamUrl || ''
    });
    setIsEditRoomModalOpen(true);
  };

  const handleSubmitRoomInfoAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
        toast.error('请先登录');
        return;
    }

    const now = new Date();
    const tournamentStartTime = new Date(tournament.start_time);

    if (now < tournamentStartTime) {
      toast.custom((t) => (
        <ConfirmationToast
          t={t}
          message="比赛尚未到开始时间，确定要提前开始吗？"
          onConfirm={async () => {
            toast.dismiss(t.id);
            await proceedWithStart();
          }}
          onCancel={() => toast.dismiss(t.id)}
        />
      ));
      return;
    }

    // 如果不需要确认，直接执行开始
    await proceedWithStart();
  };

  const proceedWithStart = async () => {
    const token = getToken();
    if (!token) {
        toast.error('请先登录');
        return;
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
            toast.success('比赛已成功开始！');
            window.location.reload();
        } else {
            toast.error(`错误: ${data.message}`);
        }
    } catch (err) {
        toast.error('一个未知错误发生');
    }
  };

  const handleSubmitRoomInfoOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
        toast.error('请先登录');
        return;
    }

    try {
        const res = await fetch(`/api/tournaments/${tournamentId}/room-info-update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
                room_name: roomInfo.name, 
                room_number: roomInfo.number, 
                room_password: roomInfo.pass, 
                livestream_url: roomInfo.livestreamUrl 
            }),
        });

        const data = await res.json();
        if (res.ok) {
            toast.success('比赛信息更新成功！');
            setIsEditRoomModalOpen(false);
            fetchDetails(); // 重新获取数据以更新显示
        } else {
            toast.error(`错误: ${data.message}`);
        }
    } catch (err) {
        toast.error('一个未知错误发生');
    }
  };

  const handleMarkWinner = async (match: any) => {
    const currentSelection = matchSelections[match.id];
    if (!currentSelection || !currentSelection.winnerSelection) {
      toast.error('请选择一个获胜者或弃权类型。');
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error('请先登录');
      return;
    }

    let winnerIdToSend: number | null = null;
    let forfeitType: string | null = null;
    let actionDescription = '';

    // Determine winnerIdToSend and forfeitType based on winnerSelection
    if (typeof currentSelection.winnerSelection === 'number') {
      winnerIdToSend = currentSelection.winnerSelection;
      const winner = match.player1_id === currentSelection.winnerSelection ? match.player1_character_name : match.player2_character_name;
      actionDescription = `确认 ${winner} 为本场比赛胜者`;
    } else if (currentSelection.winnerSelection === 'forfeit_player1') {
      winnerIdToSend = match.player2_id;
      forfeitType = 'player1';
      actionDescription = `确认 ${match.player1_character_name} 弃权，${match.player2_character_name} 获胜`;
    } else if (currentSelection.winnerSelection === 'forfeit_player2') {
      winnerIdToSend = match.player1_id;
      forfeitType = 'player2';
      actionDescription = `确认 ${match.player2_character_name} 弃权，${match.player1_character_name} 获胜`;
    } else if (currentSelection.winnerSelection === 'forfeit_both') {
      winnerIdToSend = null;
      forfeitType = 'both';
      actionDescription = '确认双方弃权';
    }

    // 使用promise-based的确认弹窗
    const confirmContent = (
      <div className="text-left">
        <p className="font-bold text-lg mb-2 text-[#B89766]">确认比赛结果</p>
        <p className="mb-2 text-[#F5F5F5]">{actionDescription}</p>
        <p className="text-sm text-gray-300 mb-2">
          比赛：第 {match.round_number} 轮 - {getMatchStage(matches.filter(m => m.round_number === match.round_number).length)}
        </p>
        <p className="text-sm text-gray-300 mb-3">
          赛制：{currentSelection.matchFormat}
        </p>
        <div className="bg-red-900/30 border border-red-500 text-red-200 p-2 rounded text-sm">
          ⚠️ 确认后无法修改，请仔细核对！
        </div>
      </div>
    );

    const confirmed = await new Promise((resolve) => {
      toast.custom((t) => (
        <ConfirmationToast
          t={t}
          message={confirmContent}
          onConfirm={() => {
            toast.dismiss(t.id);
            resolve(true);
          }}
          onCancel={() => {
            toast.dismiss(t.id);
            resolve(false);
          }}
        />
      ));
    });

    if (confirmed) {
      try {
        const res = await fetch(`/api/matches/${match.id}/winner`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            winner_id: winnerIdToSend,
            match_format: currentSelection.matchFormat,
            forfeit_type: forfeitType,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          await fetchDetails();
          const updatedMatchElement = document.getElementById(`match-${match.id}`);
          if (updatedMatchElement) {
            updatedMatchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          toast.error(`设置失败：${data.error || data.message}`);
        }
      } catch (err) {
        console.error('设置比赛结果错误:', err);
        toast.error('网络错误，请重试');
      }
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

  const [addGameId, setAddGameId] = useState('');
  const [addPrizeId, setAddPrizeId] = useState('');
  const [addPrizeDesc, setAddPrizeDesc] = useState('');
  const [addRemark, setAddRemark] = useState('');

  const handleAddExtraAward = async () => {
    const token = getToken();
    if (!token) {
      toast.error('请先登录');
      return;
    }

    if (!addGameId || !addPrizeId) {
      toast.error('请填写游戏角色编号并选择奖品');
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/extra-awards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_id: addGameId,
          prize_id: parseInt(addPrizeId),
          prize_description: addPrizeDesc,
          remark: addRemark,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('额外奖品添加成功！');
        fetchDetails(); // 重新获取数据
        // 清空表单
        setAddGameId('');
        setAddPrizeId('');
        setAddPrizeDesc('');
        setAddRemark('');
      } else {
        toast.error(`错误: ${data.message}`);
      }
    } catch (err) {
      toast.error('添加失败，请检查游戏角色编号是否正确');
    }
  };

  const handleEditExtraAward = (award: any) => {
    setEditingExtraAward(award);
    setEditGameId(award.game_id);
    setEditPrizeId(award.prize_id?.toString() || '');
    setEditPrizeDesc(award.prize_description || '');
    setEditRemark(award.remark || '');
  };

  const handleUpdateExtraAward = async () => {
    const token = getToken();
    if (!token || !editingExtraAward) return;

    if (!editGameId || !editPrizeId) {
      toast.error('请填写游戏角色编号并选择奖品');
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/extra-awards/${editingExtraAward.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_id: editGameId,
          prize_id: parseInt(editPrizeId),
          prize_description: editPrizeDesc,
          remark: editRemark,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('额外奖品更新成功！');
        fetchDetails();
        setEditingExtraAward(null);
      } else {
        toast.error(`错误: ${data.message}`);
      }
    } catch (err) {
      toast.error('更新失败，请检查游戏角色编号是否正确');
    }
  };

  const handleDeleteExtraAward = async (awardId: number) => {
    const token = getToken();
    if (!token) return;

    toast.custom((t) => (
      <ConfirmationToast
        t={t}
        message="确定要删除这条额外奖品记录吗？"
        onConfirm={async () => {
          try {
            const res = await fetch(`/api/tournaments/${tournamentId}/extra-awards/${awardId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            const data = await res.json();
            if (res.ok) {
              toast.success('额外奖品删除成功！');
              fetchDetails();
            } else {
              toast.error(`错误: ${data.message}`);
            }
          } catch (err) {
            toast.error('删除失败');
          }
        }}
        onCancel={() => toast.dismiss(t.id)}
      />
    ));
  };

  const handleCancelEdit = () => {
    setEditingExtraAward(null);
  };

  const handlePrizeSelectionChange = (playerId: string, prizeId: string) => {
    setSelectedPrizes(prev => ({
      ...prev,
      [playerId]: prizeId,
    }));
  };

  const handlePrizeRemarkChange = (playerId: string, remark: string) => {
    setPrizeRemarks(prev => ({
      ...prev,
      [playerId]: remark,
    }));
  };

  const handleEditAward = (award: any) => {
    setEditingAwardId(award.id);
    setSelectedPrizes(prev => ({ ...prev, [award.player_id]: award.prize_id }));
    setPrizeRemarks(prev => ({ ...prev, [award.player_id]: award.remark || '' }));
  };

  const handleCancelAwardEdit = () => {
    setEditingAwardId(null);
    // Optionally clear selectedPrizes and prizeRemarks for the cancelled edit
  };

  const handleAwardPrize = async (playerId: string, awardId: number | null = null) => {
    const prizeId = selectedPrizes[playerId];
    const remark = prizeRemarks[playerId] || ''; // Get remark from state
    if (!prizeId) {
      toast.error('请为玩家选择一个奖品。');
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error('认证失败，请重新登录。');
      return;
    }

    setAwarding(playerId);

    try {
      const method = awardId ? 'PUT' : 'POST';
      const url = awardId ? `/api/player-awards/${awardId}` : `/api/tournaments/${tournamentId}/award`;

      const res = await fetch(url,
        {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ player_id: playerId, prize_id: prizeId, remark: remark }), // Pass remark to API
        }
      );

      if (res.ok) {
        fetchDetails(); // Re-fetch details to update the UI
        setEditingAwardId(null); // Exit editing mode
      } else {
        const data = await res.json();
        toast.error(`奖品发放/修改失败: ${data.message}`);
      }
    } catch (err) {
      console.error('Error awarding prize:', err);
      toast.error('发放/修改奖品时发生网络错误。');
    } finally {
      setAwarding(null);
    }
  };

  const executeRegistration = useCallback(async (code: string | null) => {
    const token = getToken();
    if (!token) {
      toast.error('请登录后报名比赛。');
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
        toast.success(`成功报名比赛: ${tournament.name}！`);
        fetchDetails(); // Re-fetch details to update player list
        setIsRegistrationModalOpen(false);
        setRegistrationCodeInput('');
      } else {
        toast.error(`报名失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('报名时发生网络错误。');
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
      toast.error('请输入参赛验证码。');
      return;
    }
    executeRegistration(registrationCodeInput);
  };

  const handleWithdrawal = async () => {
    if (!userRegistrationId) {
      toast.error('无法找到您的报名记录，请刷新页面后重试。');
      return;
    }

    toast.custom((t) => (
      <ConfirmationToast
        t={t}
        message="您确定要退出本次比赛吗？退出后在报名截止前仍可重新报名。"
        onConfirm={async () => {
          toast.dismiss(t.id);
          const token = getToken();
          if (!token) {
            toast.error('认证失败，请重新登录。');
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
              toast.success('您已成功退出比赛。');
              fetchDetails(); // Re-fetch details to update UI
            } else {
              const data = await res.json();
              toast.error(`退出失败: ${data.message}`);
            }
          } catch (err) {
            console.error('Error withdrawing from tournament:', err);
            toast.error('退出比赛时发生网络错误。');
          }
        }}
        onCancel={() => toast.dismiss(t.id)}
      />
    ));
  };


  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  if (!tournament) {
    return <div className="text-center p-8">加载中...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 lg:p-12 bg-[#1A1A1A] text-[#F5F5F5]">
      <h1 className="text-4xl font-bold mb-4 text-[#B89766]">{tournament.name}</h1>

      <div className="w-full max-w-6xl bg-[#2A2A2A] rounded-lg shadow-md p-4 md:p-6 mb-8 border border-[#B89766]/50">
        <div className="mb-4 text-center">
          <Image
            src={tournament.cover_image_url ? `/${tournament.cover_image_url.startsWith('/') ? tournament.cover_image_url.substring(1) : tournament.cover_image_url}` : '/images/default_cover.jpg'}
            alt="Tournament Cover"
            width={800}
            height={450}
            className="rounded-lg object-cover mx-auto border-2 border-[#B89766]/80"
          />
        </div>

        {/* Refactored Info Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
          <div className="bg-[#1A1A1A] p-4 rounded-lg">
            <p className="text-sm text-[#B89766]">开赛时间</p>
            <p className="text-lg font-semibold">{new Date(tournament.start_time).toLocaleString()}</p>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-lg">
            <p className="text-sm text-[#B89766]">比赛状态</p>
            <p className="text-lg font-semibold">{getDynamicTournamentStatusText(tournament)}</p>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-lg">
            <p className="text-sm text-[#B89766]">最少人数</p>
            <p className="text-lg font-semibold">{tournament.min_players}</p>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-lg">
            <p className="text-sm text-[#B89766]">最大人数</p>
            <p className="text-lg font-semibold">{tournament.max_players}</p>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg mb-6">
          <p className="text-lg font-bold text-[#B89766] mb-2">赛事说明</p>
          <div className="text-[#F5F5F5]" dangerouslySetInnerHTML={{ __html: tournament.event_description.replace(/\n/g, '<br />') }} />
        </div>

        {/* Important Notice for Players - New Position */}
        <div className="w-full bg-[#C83C23]/20 border border-[#C83C23] text-[#F5F5F5] p-4 rounded-lg mb-6 text-left">
          <p className="text-base">
            <span className="text-lg font-bold text-[#C83C23]">重要提示：</span>
            已报名的玩家请务必准时参赛。如因时间原因无法参加，请在报名截止前2小时退出，否则将按弃赛处理。玩家弃赛达3次后，将无法报名平台上的任何比赛。
          </p>
        </div>

        <div className="mt-6 text-center">
          {canRegister && (
            <button 
              onClick={handleRegisterClick}
              className="bg-[#B89766] hover:bg-[#C83C23] text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg transform hover:scale-105 transition-transform duration-300"
            >
              立即报名
            </button>
          )}
          {canWithdraw && (
            <button 
              onClick={handleWithdrawal}
              className="bg-[#C83C23] hover:bg-[#B89766] text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg transform hover:scale-105 transition-transform duration-300"
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
            <div className="bg-[#2A2A2A] p-8 rounded-lg shadow-xl w-11/12 max-w-md border border-[#B89766]">
              <h2 className="text-2xl font-bold mb-4 text-[#B89766]">需要验证码</h2>
              <p className="mb-6 text-[#F5F5F5]">此比赛为私密比赛，请输入参赛验证码。</p>
              <input
                type="text"
                placeholder="请输入验证码"
                value={registrationCodeInput}
                onChange={(e) => setRegistrationCodeInput(e.target.value)}
                className="w-full p-3 border border-[#B89766]/50 rounded bg-[#1A1A1A] text-white mb-6 focus:ring-2 focus:ring-[#B89766] focus:outline-none"
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
                  className="bg-[#B89766] hover:bg-[#C83C23] text-white font-bold py-2 px-4 rounded transition-colors duration-300"
                >
                  确认报名
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 主办方信息 */}
          <div className="p-4 bg-[#2A2A2A] rounded-lg flex items-center space-x-4 border border-[#B89766]/50">
            <Image
              src={tournament.organizer_avatar ? `/avatars/${tournament.organizer_avatar}` : '/avatars/000.webp'}
              alt={tournament.organizer_character_name || '主办方'}
              width={64}
              height={64}
              className="rounded-full border-2 border-[#B89766]"
            />
            <div>
              <p className="text-lg font-medium text-[#F5F5F5]">{tournament.organizer_character_name || '未知主办方'}</p>
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
          <div className="p-4 bg-[#2A2A2A] rounded-lg flex flex-col items-center justify-center text-center border border-[#B89766]/50">
            <h3 className="text-xl font-bold mb-2 text-[#B89766]">直播信息</h3>
            {tournament && tournament.livestream_url ? (
              tournament.status === 'ongoing' ? (
                <a href={tournament.livestream_url} target="_blank" rel="noopener noreferrer">
                  <button className="bg-[#C83C23] hover:bg-[#B89766] text-white font-bold py-2 px-4 rounded">
                    正在直播中
                  </button>
                </a>
              ) : (
                <a href={tournament.livestream_url} target="_blank" rel="noopener noreferrer">
                  <button className="bg-[#B89766] hover:bg-[#C83C23] text-white font-bold py-2 px-4 rounded">
                    进入直播间
                  </button>
                </a>
              )
            ) : (
              <p className="text-gray-400">暂无直播</p>
            )}
          </div>
        </div>

        {/* 砺兵台房间信息 */}
        {roomDetails && (roomDetails.room_name || roomDetails.room_number) ? (
          <div className="mt-4 p-4 bg-[#2A2A2A] rounded-lg flex flex-col items-center text-center border border-[#B89766]/50">
            <h3 className="text-xl font-bold mb-2 text-[#B89766]">🛡️ 砺兵台房间信息 🛡️</h3>
            <p>房间名: {roomDetails.room_name}  |  房间ID: {roomDetails.room_number}{roomDetails.room_password && `  |  房间密码: ${roomDetails.room_password}`}</p>
            {isOrganizer && tournament.status === 'pending' && (
              <button 
                onClick={handleEditRoomInfo} 
                className="mt-3 bg-[#1A1A1A] border border-[#B89766] hover:bg-[#B89766] text-[#B89766] hover:text-white font-bold py-2 px-4 rounded transition-colors duration-300 text-sm"
              >
                编辑房间信息
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 p-4 bg-[#2A2A2A] rounded-lg flex flex-col items-center text-center text-gray-400 border border-[#B89766]/50">
            <h3 className="text-xl font-bold mb-2 text-[#B89766]">🛡️ 砺兵台房间信息 🛡️</h3>
            { (currentUser && (isOrganizer || isUserRegistered)) ? (
                <>
                  <p>（由主办方在正式开赛前填写）</p>
                  {isOrganizer && tournament.status === 'pending' && (
                    <button 
                      onClick={handleEditRoomInfo} 
                      className="mt-3 bg-[#1A1A1A] border border-[#B89766] hover:bg-[#B89766] text-[#B89766] hover:text-white font-bold py-2 px-4 rounded transition-colors duration-300 text-sm"
                    >
                      填写房间信息
                    </button>
                  )}
                </>
              ) : (
                <p>（房间信息仅对已报名玩家开放，请登录并报名后查看）</p>
              )
            }
          </div>
        )}

        {tournament.prizes && tournament.prizes.length > 0 && (
          <div className="mt-4 p-4 bg-[#2A2A2A] rounded-lg border border-[#B89766]/50">
            <h3 className="text-xl font-bold mb-2 text-[#B89766]">奖品设置</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-[#1A1A1A]">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">奖项</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">排名</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">奖品名称</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">数量</th>
                  </tr>
                </thead>
                <tbody className="bg-[#2A2A2A] divide-y divide-gray-700">
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
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-[#F5F5F5]">{awardType}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-[#F5F5F5]">{rankDisplay}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-[#F5F5F5]">{prize.prize_name}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-[#F5F5F5]">{prize.quantity}</td>
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
        <div className="flex gap-4 mb-8">
          <button 
            onClick={handleStartTournament} 
            className="bg-[#B89766] hover:bg-[#C83C23] text-white font-bold py-2 px-4 rounded"
          >
            {isTournamentUpcoming ? '提前开始比赛' : '开始比赛'}
          </button>
        </div>
      )}

      {isRoomModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-[#2A2A2A] p-8 rounded-lg shadow-xl border border-[#B89766]/50">
            <h2 className="text-2xl font-bold mb-4 text-[#B89766]">完善砺兵台房间信息</h2>
            <form onSubmit={handleSubmitRoomInfoAndStart}>
              <div className="mb-4">
                <label htmlFor="roomName" className="block mb-2 text-[#B89766]">房间名</label>
                <input
                  id="roomName"
                  type="text"
                  value={roomInfo.name}
                  onChange={(e) => setRoomInfo({ ...roomInfo, name: e.target.value })}
                  className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                  maxLength={9}
                  placeholder="请填写在游戏中创建的砺兵台房间名称 (限制9个字符)"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="roomNumber" className="block mb-2 text-[#B89766]">房间ID</label>
                <input
                  id="roomNumber"
                  type="text"
                  value={roomInfo.number}
                  onChange={(e) => setRoomInfo({ ...roomInfo, number: e.target.value })}
                  className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                  maxLength={10}
                  pattern="\d{10}"
                  placeholder="请填写在游戏中创建的砺兵台房间ID (10位数字)"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="roomPassword" className="block mb-2 text-[#B89766]">房间密码 (可选)</label>
                <input
                  id="roomPassword"
                  type="text"
                  value={roomInfo.pass}
                  onChange={(e) => setRoomInfo({ ...roomInfo, pass: e.target.value })}
                  className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="请填写房间密码 (4位数字，无密码则留空)"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="livestreamUrl" className="block mb-2 text-[#B89766]">直播网址 (可选)</label>
                <input
                  id="livestreamUrl"
                  type="url"
                  value={roomInfo.livestreamUrl}
                  onChange={(e) => setRoomInfo({ ...roomInfo, livestreamUrl: e.target.value })}
                  className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                  placeholder="例如: https://live.douyin.com/244993118346"
                />
              </div>
              <p className="text-sm text-gray-400 mb-4">提示：创建房间的玩法类型必须是1V1，挑战模式必须是管理模式。</p>
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setIsRoomModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                  取消
                </button>
                <button type="submit" className="bg-[#B89766] hover:bg-[#C83C23] text-white font-bold py-2 px-4 rounded">
                  确认并开始比赛
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditRoomModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-[#2A2A2A] p-8 rounded-lg shadow-xl border border-[#B89766]/50">
            <h2 className="text-2xl font-bold mb-4 text-[#B89766]">{roomDetails?.room_name ? '编辑砺兵台房间信息' : '填写砺兵台房间信息'}</h2>
            <form onSubmit={handleSubmitRoomInfoOnly}>
              <div className="mb-4">
                <label htmlFor="editRoomName" className="block mb-2 text-[#B89766]">房间名</label>
                <input
                  id="editRoomName"
                  type="text"
                  value={roomInfo.name}
                  onChange={(e) => setRoomInfo({ ...roomInfo, name: e.target.value })}
                  className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                  maxLength={9}
                  placeholder="请填写在游戏中创建的砺兵台房间名称 (限制9个字符)"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="editRoomNumber" className="block mb-2 text-[#B89766]">房间ID</label>
                <input
                  id="editRoomNumber"
                  type="text"
                  value={roomInfo.number}
                  onChange={(e) => setRoomInfo({ ...roomInfo, number: e.target.value })}
                  className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                  maxLength={10}
                  pattern="\d{10}"
                  placeholder="请填写在游戏中创建的砺兵台房间ID (10位数字)"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="editRoomPassword" className="block mb-2 text-[#B89766]">房间密码 (可选)</label>
                <input
                  id="editRoomPassword"
                  type="text"
                  value={roomInfo.pass}
                  onChange={(e) => setRoomInfo({ ...roomInfo, pass: e.target.value })}
                  className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="请填写房间密码 (4位数字，无密码则留空)"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="editLivestreamUrl" className="block mb-2 text-[#B89766]">直播网址 (可选)</label>
                <input
                  id="editLivestreamUrl"
                  type="url"
                  value={roomInfo.livestreamUrl}
                  onChange={(e) => setRoomInfo({ ...roomInfo, livestreamUrl: e.target.value })}
                  className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                  placeholder="例如: https://live.douyin.com/244993118346"
                />
              </div>
              <p className="text-sm text-gray-400 mb-4">提示：创建房间的玩法类型必须是1V1，挑战模式必须是管理模式。</p>
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setIsEditRoomModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                  取消
                </button>
                <button type="submit" className="bg-[#B89766] hover:bg-[#C83C23] text-white font-bold py-2 px-4 rounded">
                  确认更新
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!currentUser && tournament.status === 'pending' && (
        <Link href="/login">
          <button className="bg-[#B89766] hover:bg-[#C83C23] text-white font-bold py-2 px-4 rounded mb-8">
            登录后报名
          </button>
        </Link>
      )}

      

      {tournament.status === 'finished' && tournament.final_rankings && (

        <div className="w-full max-w-6xl bg-[#2A2A2A] rounded-lg shadow-md p-6 mb-8 border border-[#B89766]/50">
          <h2 className="text-3xl font-bold mb-4 text-center text-[#B89766]">🏆 最终排名 🏆</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-[#1A1A1A]">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">排名</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">玩家</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">奖品</th>
                </tr>
              </thead>
              <tbody className="bg-[#2A2A2A] divide-y divide-gray-700">
                {tournament.final_rankings.map((player: any) => {
                  const awardedPrize = awardedPrizes.find(ap => ap.player_id === player.player_id);
                  // If a player has forfeited, they are not eligible for any rank-based or participation prizes.
                  const prizeWonByRank = player.is_forfeited ? null : getPrizeForRank(player.rank, tournament.prizes);

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
                            <div className="text-sm font-medium text-[#F5F5F5]">
                              {player.character_name}
                              {player.is_forfeited && <span className="text-red-500 ml-2 text-xs">(弃权)</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isOrganizer ? (
                          editingAwardId === awardedPrize?.id ? (
                            <div className="flex items-center gap-2">
                                <select
                                  className="p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                                  value={selectedPrizes[player.player_id] || ''}
                                  onChange={(e) => handlePrizeSelectionChange(player.player_id, e.target.value)}
                                >
                                  <option value="">选择奖品</option>
                                  {prizes.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="备注 (例如: 穿云游雪、月中诗)"
                                  value={prizeRemarks[player.player_id] || ''}
                                  onChange={(e) => handlePrizeRemarkChange(player.player_id, e.target.value)}
                                  className="p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white flex-grow"
                                />
                                <button
                                  onClick={() => handleAwardPrize(player.player_id, awardedPrize.id)}
                                  disabled={awarding === player.player_id}
                                  className="p-2 bg-[#B89766] text-white rounded-lg hover:bg-[#C83C23] transition-colors duration-200 font-bold disabled:bg-gray-500"
                                >
                                  {awarding === player.player_id ? '保存中...' : '保存'}
                                </button>
                                <button
                                  onClick={handleCancelAwardEdit}
                                  className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-bold"
                                >
                                  取消
                                </button>
                            </div>
                          ) : (
                            awardedPrize ? (
                              <div className="flex items-center gap-2">
                                <span className="text-green-400">已发放: {awardedPrize.prize_name} {awardedPrize.remark && `(${awardedPrize.remark})`}</span>
                                <button
                                  onClick={() => handleEditAward(awardedPrize)}
                                  className="p-1 bg-[#B89766] text-white rounded-lg hover:bg-[#a3865e] transition-colors duration-200 text-xs"
                                >
                                  编辑
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  className="p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                                  value={selectedPrizes[player.player_id] || ''}
                                  onChange={(e) => handlePrizeSelectionChange(player.player_id, e.target.value)}
                                >
                                  <option value="">选择奖品</option>
                                  {prizes.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="备注 (例如: 穿云游雪、月中诗)"
                                  value={prizeRemarks[player.player_id] || ''}
                                  onChange={(e) => handlePrizeRemarkChange(player.player_id, e.target.value)}
                                  className="p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white flex-grow"
                                />
                                <button
                                  onClick={() => handleAwardPrize(player.player_id)}
                                  disabled={awarding === player.player_id}
                                  className="p-2 bg-[#B89766] text-white rounded-lg hover:bg-[#C83C23] transition-colors duration-200 font-bold disabled:bg-gray-500"
                                >
                                  {awarding === player.player_id ? '发放中...' : '确认发放'}
                                </button>
                              </div>
                            )
                          )
                        ) : (
                          awardedPrize ? (
                            <span className="text-amber-400">{awardedPrize.prize_name} {awardedPrize.remark && `(${awardedPrize.remark})`}</span>
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

      {/* 额外奖品展示 */}
      {tournament.status === 'finished' && (
        <div className="w-full max-w-6xl bg-[#2A2A2A] rounded-lg shadow-md p-6 mb-8 border border-[#B89766]/50">
          <h2 className="text-3xl font-bold mb-4 text-center text-[#B89766]">🎁 额外奖品 🎁</h2>
          
          {isOrganizer && (
            <div className="mb-6 p-4 border border-[#B89766]/30 rounded-lg">
              <p className="text-sm text-gray-300 mb-3">说明：此区域用于记录直播间抽奖、解说互动奖、特殊贡献奖等非比赛标准奖品的发放。</p>
              
              {editingExtraAward ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-[#B89766] mb-2">编辑额外奖品</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#B89766] mb-2">游戏角色编号</label>
                      <input
                        type="text"
                        placeholder="请输入玩家游戏角色编号"
                        value={editGameId}
                        onChange={(e) => setEditGameId(e.target.value)}
                        className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#B89766] mb-2">奖品</label>
                      <select
                        value={editPrizeId}
                        onChange={(e) => setEditPrizeId(e.target.value)}
                        className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                      >
                        <option value="">选择奖品</option>
                        {prizes.map(prize => (
                          <option key={prize.id} value={prize.id}>{prize.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#B89766] mb-2">具体奖品</label>
                      <input
                        type="text"
                        placeholder="具体奖品详情（如：时装红尘书）"
                        value={editPrizeDesc}
                        onChange={(e) => setEditPrizeDesc(e.target.value)}
                        className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#B89766] mb-2">备注</label>
                      <input
                        type="text"
                        placeholder="奖励来源（如：直播间抽奖）"
                        value={editRemark}
                        onChange={(e) => setEditRemark(e.target.value)}
                        className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={handleUpdateExtraAward}
                      className="bg-[#B89766] hover:bg-[#C83C23] text-white font-bold py-2 px-6 rounded transition-colors duration-300"
                    >
                      保存修改
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors duration-300"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#B89766] mb-2">游戏角色编号</label>
                      <input
                        type="text"
                        placeholder="请输入玩家游戏角色编号"
                        value={addGameId}
                        onChange={(e) => setAddGameId(e.target.value)}
                        className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#B89766] mb-2">奖品</label>
                      <select
                        value={addPrizeId}
                        onChange={(e) => setAddPrizeId(e.target.value)}
                        className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                      >
                        <option value="">选择奖品</option>
                        {prizes.map(prize => (
                          <option key={prize.id} value={prize.id}>{prize.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#B89766] mb-2">具体奖品</label>
                      <input
                        type="text"
                        placeholder="具体奖品详情（如：时装红尘书）"
                        value={addPrizeDesc}
                        onChange={(e) => setAddPrizeDesc(e.target.value)}
                        className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#B89766] mb-2">备注</label>
                      <input
                        type="text"
                        placeholder="奖励来源（如：直播间抽奖）"
                        value={addRemark}
                        onChange={(e) => setAddRemark(e.target.value)}
                        className="w-full p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={handleAddExtraAward}
                      className="bg-[#B89766] hover:bg-[#C83C23] text-white font-bold py-2 px-6 rounded transition-colors duration-300 min-w-[120px]"
                    >
                      添加额外奖品记录
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {extraAwards.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-[#1A1A1A]">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">玩家</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">奖品</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">备注</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">时间</th>
                    {isOrganizer && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#B89766] uppercase tracking-wider">操作</th>}
                  </tr>
                </thead>
                <tbody className="bg-[#2A2A2A] divide-y divide-gray-700">
                  {extraAwards.map((award: any) => (
                    <tr key={award.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <Image
                              src={award.avatar ? `/avatars/${award.avatar}` : '/avatars/000.webp'}
                              alt={award.character_name}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-[#F5F5F5]">{award.character_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F5F5F5]">{award.prize_name} {award.prize_description && `(${award.prize_description})`}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{award.remark || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(award.awarded_at).toLocaleString()}</td>
                      {isOrganizer && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F5F5F5]">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditExtraAward(award)}
                              className="text-blue-400 hover:text-blue-300 font-medium"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteExtraAward(award.id)}
                              className="text-red-400 hover:text-red-300 font-medium"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {extraAwards.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <p>暂无额外奖品</p>
            </div>
          )}
        </div>
      )}

      <h2 className="text-3xl font-bold mb-4 text-[#B89766]">对阵图</h2>
      <div className="w-full max-w-6xl px-2 md:px-0">
        {matches.length > 0 ? (
          matches.map(match => (
            <div key={match.id} className="bg-[#2A2A2A] p-4 rounded-lg shadow-lg mb-4 border border-[#B89766]/50">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                <p className="text-lg font-semibold text-[#B89766] mb-2 sm:mb-0">
                  第 {match.round_number} 轮
                  <span className="ml-2 text-sm text-gray-400"> ({getMatchStage(matches.filter(m => m.round_number === match.round_number).length)})</span>
                </p>
                {match.finished_at && (
                  <p className="text-sm text-gray-400">结束时间: {new Date(match.finished_at).toLocaleString()}</p>
                )}
              </div>

              <div className="flex items-center justify-center space-x-6 mb-4">
                <div className="flex flex-col items-center">
                  {match.player1_uuid ? (
                    <Link href={`/players/${match.player1_uuid}`}>
                      <Image
                        src={match.player1_avatar ? `/avatars/${match.player1_avatar}` : '/avatars/000.webp'}
                        alt={match.player1_character_name || 'Player 1'}
                        width={64}
                        height={64}
                        className="rounded-full border-2 border-blue-500 cursor-pointer"
                      />
                    </Link>
                  ) : (
                    <Image
                      src={match.player1_avatar ? `/avatars/${match.player1_avatar}` : '/avatars/000.webp'}
                      alt={match.player1_character_name || 'Player 1'}
                      width={64}
                      height={64}
                      className="rounded-full border-2 border-blue-500"
                    />
                  )}
                  <span className={`mt-2 text-lg font-medium text-center ${
                    match.player1_registration_status === 'forfeited' 
                      ? 'text-red-400 line-through' 
                      : 'text-[#F5F5F5]'
                  }`}>
                    {match.player1_character_name || 'Player 1'}
                    {match.player1_registration_status === 'forfeited' && 
                      <span className="ml-1 text-red-400 font-bold">(弃权)</span>
                    }
                  </span>
                </div>

                <span className="text-3xl font-bold text-[#B89766]">VS</span>

                <div className="flex flex-col items-center">
                  {match.player2_uuid ? (
                    <Link href={`/players/${match.player2_uuid}`}>
                      <Image
                        src={match.player2_avatar ? `/avatars/${match.player2_avatar}` : '/avatars/000.webp'}
                        alt={match.player2_character_name || 'Player 2'}
                        width={64}
                        height={64}
                        className="rounded-full border-2 border-[#C83C23] cursor-pointer"
                      />
                    </Link>
                  ) : (
                    <Image
                      src={match.player2_avatar ? `/avatars/${match.player2_avatar}` : '/avatars/000.webp'}
                      alt={match.player2_character_name || 'Player 2'}
                      width={64}
                      height={64}
                      className="rounded-full border-2 border-[#C83C23]"
                    />
                  )}
                  <span className={`mt-2 text-lg font-medium text-center ${
                    match.player2_registration_status === 'forfeited' 
                      ? 'text-red-400 line-through' 
                      : 'text-[#F5F5F5]'
                  }`}>
                    {match.player2_character_name || (match.player2_id === null ? '(轮空)' : 'Player 2')}
                    {match.player2_registration_status === 'forfeited' && 
                      <span className="ml-1 text-red-400 font-bold">(弃权)</span>
                    }
                  </span>
                </div>
              </div>

              <div className="text-center">
                {match.winner_id ? (
                  <p className="text-xl font-bold text-green-400">
                    胜者: {match.winner_character_name} (赛制: {match.match_format})
                  </p>
                ) : match.status === 'forfeited' ? (
                  <p className="text-xl font-bold text-red-400">
                    双方弃权
                  </p>
                ) : (
                  isOrganizer && match.status === 'pending' ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-2 w-full">
                        <select
                          className="p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white w-full sm:w-auto"
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
                          className="p-2 border rounded bg-[#1A1A1A] border-[#B89766]/50 text-white w-full sm:w-auto"
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
                        className="p-3 bg-[#B89766] hover:bg-[#C83C23] text-white rounded-lg transition-colors duration-200 font-bold w-full"
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
            <div className="bg-[#B89766]/10 border border-[#B89766]/50 text-[#B89766] p-4 rounded-lg text-center my-6">
                <p className="text-xl font-bold">⏳ 对阵尚未生成 ⏳</p>
                <p className="mt-2">正式开赛时将自动生成对阵，请及时关注本页更新。</p>
            </div>
            {registeredPlayers.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xl font-bold mb-2 text-[#B89766]">✨ 已报名玩家 ✨</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {registeredPlayers.map((player: any, idx: number) => (
                    <div key={idx} className="flex flex-col items-center">
                      {player.uuid ? (
                        <Link href={`/players/${player.uuid}`}>
                          <Image
                            src={player.avatar ? `/avatars/${player.avatar}` : '/avatars/000.webp'}
                            alt={player.character_name}
                            width={64}
                            height={64}
                            className="inline-block h-16 w-16 rounded-full ring-2 ring-[#B89766] cursor-pointer"
                          />
                        </Link>
                      ) : (
                        <Image
                          src={player.avatar ? `/avatars/${player.avatar}` : '/avatars/000.webp'}
                          alt={player.character_name}
                          width={64}
                          height={64}
                          className="inline-block h-16 w-16 rounded-full ring-2 ring-[#B89766]"
                        />
                      )}
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
