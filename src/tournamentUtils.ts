import { db, query } from './database.mjs';

interface Match {
  tournament_id: number;
  round_number: number;
  player1_id: number;
  player2_id: number | null; // player2_id can be null for bye matches
  winner_id?: number; // winner_id is optional, only for finished matches
  status: string;
  match_format?: string; // Add this line for match format
}

// Helper to convert match format string to a comparable number
function getMatchFormatPriority(format: string): number {
  switch (format) {
    case "1局1胜": return 1;
    case "3局2胜": return 2;
    case "5局3胜": return 3;
    default: return 0; // Should not happen
  }
}

// Helper to convert match format number back to string
function getMatchFormatString(priority: number): string {
  switch (priority) {
    case 1: return "1局1胜";
    case 2: return "3局2胜";
    case 3: return "5局3胜";
    default: return "1局1胜"; // Default to 1局1胜 if invalid
  }
}

export async function generateMatchesAndStartTournament(tournamentId: number) {
  try {
    // Fetch tournament details to get default_match_format
    const tournamentDetails: any[] = await query('SELECT default_match_format FROM Tournaments WHERE id = ?', [tournamentId]);
    const defaultTournamentMatchFormat = tournamentDetails[0]?.default_match_format || "1局1胜";
    const defaultTournamentMatchFormatPriority = getMatchFormatPriority(defaultTournamentMatchFormat);

    // 1. Fetch all active registered players
    const registrations: any[] = await query('SELECT player_id FROM Registrations WHERE tournament_id = ? AND status = ?', [tournamentId, 'active']);

    if (registrations.length < 2) {
      console.warn(`Tournament ${tournamentId} does not have enough players to start.`);
      return;
    }

    // 2. Shuffle players
    const players = registrations.map(reg => reg.player_id);
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    // 3. Create initial match pairings (Round 1)
    const matches: Match[] = [];
    let byePlayer = null;
    if (players.length % 2 !== 0) {
      byePlayer = players.pop(); // Last player gets a bye
    }

    // Determine match format for Round 1, ensuring it's at least the default tournament format
    let round1MatchFormat = "1局1胜"; // Base format for round 1
    const round1MatchFormatPriority = getMatchFormatPriority(round1MatchFormat);
    const finalRound1MatchFormat = getMatchFormatString(Math.max(round1MatchFormatPriority, defaultTournamentMatchFormatPriority));

    for (let i = 0; i < players.length; i += 2) {
      matches.push({
        tournament_id: tournamentId,
        round_number: 1,
        player1_id: players[i],
        player2_id: players[i + 1],
        status: 'pending',
        match_format: finalRound1MatchFormat,
      });
    }

    // Handle bye player if any, by creating a finished match for them
    if (byePlayer) {
      matches.push({
        tournament_id: tournamentId,
        round_number: 1,
        player1_id: byePlayer,
        player2_id: null, // Indicate a bye
        winner_id: byePlayer,
        status: 'finished', // Bye matches are immediately finished
        match_format: finalRound1MatchFormat,
      });
      console.log(`Player ${byePlayer} gets a bye in Tournament ${tournamentId} Round 1.`);
    }

    // 4. Insert these matches into the Matches table
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(
          'INSERT INTO Matches (tournament_id, round_number, player1_id, player2_id, winner_id, status, finished_at, match_format) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        matches.forEach(match => {
          stmt.run(
            match.tournament_id,
            match.round_number,
            match.player1_id,
            match.player2_id,
            match.winner_id || null, // Handle winner_id for bye matches
            match.status,
            match.status === 'finished' ? new Date().toISOString() : null, // Set finished_at for bye
            match.match_format // Use the determined match format
          );
        });
        stmt.finalize();
        db.run('COMMIT', (err: Error | null) => {
          if (err) reject(err);
          resolve(null);
        });
      });
    });

    // 5. Update tournament status to 'ongoing' and set the start time to now
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE Tournaments SET status = ?, start_time = ? WHERE id = ?',
        ['ongoing', new Date().toISOString(), tournamentId],
        function (this: any, err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve(this);
          }
        }
      );
    });
    console.log(`Tournament ${tournamentId} started with ${matches.length} matches in Round 1.`);
  } catch (error) {
    console.error(`Error generating matches for tournament ${tournamentId}:`, error);
  }
}

export async function calculateAndStoreFinalRankings(tournamentId: number) {
  console.log(`[calculateAndStoreFinalRankings] Starting for tournament ${tournamentId}`);
  const allMatches: any[] = await query('SELECT * FROM Matches WHERE tournament_id = ? ORDER BY round_number DESC', [tournamentId]);
  const allRegistrations: any[] = await query(`SELECT r.player_id, u.character_name, u.avatar, r.status as registration_status FROM Registrations r JOIN Users u ON r.player_id = u.id WHERE r.tournament_id = ? AND (r.status = 'active' OR r.status = 'forfeited')`, [tournamentId]);

  const playerStats = new Map();
  for (const reg of allRegistrations) {
    playerStats.set(reg.player_id, {
      character_name: reg.character_name,
      avatar: reg.avatar,
      elimination_round: 0,
      lost_to_player_id: null,
      is_forfeited_registration: reg.registration_status === 'forfeited',
      eliminated_in_forfeited_match: false,
    });
  }

  for (const match of allMatches) {
    if (match.status === 'forfeited') {
      if (match.player1_id) {
        const stats1 = playerStats.get(match.player1_id);
        if (stats1 && stats1.elimination_round === 0) {
          stats1.elimination_round = match.round_number;
          stats1.eliminated_in_forfeited_match = true;
        }
      }
      if (match.player2_id) {
        const stats2 = playerStats.get(match.player2_id);
        if (stats2 && stats2.elimination_round === 0) {
          stats2.elimination_round = match.round_number;
          stats2.eliminated_in_forfeited_match = true;
        }
      }
      continue;
    }

    if (match.winner_id !== null && match.winner_id !== undefined) {
      const loserId = match.player1_id === match.winner_id ? match.player2_id : match.player1_id;
      if (loserId) {
        const stats = playerStats.get(loserId);
        if (stats && stats.elimination_round === 0) {
          stats.elimination_round = match.round_number;
          stats.lost_to_player_id = match.winner_id;
        }
      }
    }
  }

  // Find the champion to correctly set their elimination round
  const tournament: any = await query('SELECT winner_id FROM Tournaments WHERE id = ?', [tournamentId]);
  const championId = tournament[0]?.winner_id;

  if (championId) {
    const championStats = playerStats.get(championId);
    if (championStats) {
      const maxRound = allMatches.length > 0 ? Math.max(...allMatches.map(m => m.round_number)) : 0;
      championStats.elimination_round = maxRound + 1;
    }
  }

  const sortedPlayers = Array.from(playerStats.entries()).sort(([, a], [, b]) => {
    const a_is_forfeited = a.is_forfeited_registration || a.eliminated_in_forfeited_match;
    const b_is_forfeited = b.is_forfeited_registration || b.eliminated_in_forfeited_match;

    if (a_is_forfeited && !b_is_forfeited) return 1;
    if (!a_is_forfeited && b_is_forfeited) return -1;

    if (a.elimination_round !== b.elimination_round) {
      return b.elimination_round - a.elimination_round;
    }

    if (!a_is_forfeited && !b_is_forfeited) {
      const opponentAStats = a.lost_to_player_id ? playerStats.get(a.lost_to_player_id) : null;
      const opponentBStats = b.lost_to_player_id ? playerStats.get(b.lost_to_player_id) : null;
      return (opponentBStats?.elimination_round || 0) - (opponentAStats?.elimination_round || 0);
    }
    return 0;
  });

  const finalRankings: any[] = [];
  let currentRank = 0;
  let lastPlayerSignature = '';

  for (let i = 0; i < sortedPlayers.length; i++) {
    const [playerId, stats] = sortedPlayers[i];
    const opponentStats = stats.lost_to_player_id ? playerStats.get(stats.lost_to_player_id) : null;
    const opponentRound = opponentStats?.elimination_round || 0;
    const isForfeited = stats.is_forfeited_registration || stats.eliminated_in_forfeited_match;

    const currentPlayerSignature = isForfeited
      ? `${isForfeited}-${stats.elimination_round}`
      : `${isForfeited}-${stats.elimination_round}-${opponentRound}`;

    if (currentPlayerSignature !== lastPlayerSignature) {
      currentRank = i + 1;
      lastPlayerSignature = currentPlayerSignature;
    }

    finalRankings.push({
      rank: currentRank,
      player_id: playerId,
      character_name: stats.character_name,
      avatar: stats.avatar,
      is_forfeited: isForfeited,
    });
  }

  await query('UPDATE Tournaments SET final_rankings = ? WHERE id = ?', [JSON.stringify(finalRankings), tournamentId]);
  console.log(`[calculateAndStoreFinalRankings] Final rankings stored for tournament ${tournamentId}.`);

  // Update player stats (1st, 2nd, 3rd place)
  // Reset counts first to avoid double counting on regeneration
  const playerIds = finalRankings.map(p => p.player_id);
  if (playerIds.length > 0) {
    const placeholders = playerIds.map(() => '?').join(',');
    await query(`UPDATE Users SET first_place_count = 0, second_place_count = 0, third_place_count = 0 WHERE id IN (${placeholders})`, playerIds);
  }

  for (const player of finalRankings) {
    if (player.rank === 1) {
      await query('UPDATE Users SET first_place_count = first_place_count + 1 WHERE id = ?', [player.player_id]);
    } else if (player.rank === 2) {
      await query('UPDATE Users SET second_place_count = second_place_count + 1 WHERE id = ?', [player.player_id]);
    } else if (player.rank === 3) {
      await query('UPDATE Users SET third_place_count = third_place_count + 1 WHERE id = ?', [player.player_id]);
    }
  }
  console.log(`[calculateAndStoreFinalRankings] Player stats updated for tournament ${tournamentId}.`);
}

export async function advanceTournamentRound(tournamentId: number, currentRound: number) {
  console.log(`[advanceTournamentRound] Advancing tournament ${tournamentId}, current round: ${currentRound}`);
  try {
    // Fetch tournament details to get default_match_format
    const tournamentDetails: any[] = await query('SELECT default_match_format FROM Tournaments WHERE id = ?', [tournamentId]);
    const defaultTournamentMatchFormat = tournamentDetails[0]?.default_match_format || "1局1胜";
    const defaultTournamentMatchFormatPriority = getMatchFormatPriority(defaultTournamentMatchFormat);

    // 1. Get all matches for the current round
    const currentRoundMatches: any[] = await query('SELECT * FROM Matches WHERE tournament_id = ? AND round_number = ?', [tournamentId, currentRound]);
    console.log(`[advanceTournamentRound] Current round matches fetched: ${currentRoundMatches.length}`);

    // 2. Check if all matches in the current round are finished
    const allMatchesFinished = currentRoundMatches.every(match => match.status === 'finished' || match.status === 'forfeited');
    console.log(`[advanceTournamentRound] All matches in current round finished: ${allMatchesFinished}`);

    if (!allMatchesFinished) {
      console.log(`[advanceTournamentRound] Not all matches in round ${currentRound} for tournament ${tournamentId} are finished. Skipping advance.`);
      return;
    }

    // 3. Get all valid winners from the current round
    const winners = currentRoundMatches
      .filter(match => match.winner_id !== null && match.winner_id !== undefined)
      .map(match => match.winner_id);
    console.log(`[advanceTournamentRound] Valid winners from current round: ${winners.length}`);

    // 4. Determine the next round number
    const nextRound = currentRound + 1;

    // 5. If only one winner remains, declare them the tournament champion
    if (winners.length === 1) {
      const championId = winners[0];
      await query('UPDATE Tournaments SET status = ?, winner_id = ? WHERE id = ?', ['finished', championId, tournamentId]);
      console.log(`[advanceTournamentRound] Tournament ${tournamentId} finished. Champion: ${championId}`);

      // Calculate and store final rankings
      await calculateAndStoreFinalRankings(tournamentId);

      return;
    }

    if (winners.length === 0) {
        console.log(`[advanceTournamentRound] No winners in round ${currentRound} for tournament ${tournamentId}. Ending tournament.`);
        await query('UPDATE Tournaments SET status = ? WHERE id = ?', ['finished', tournamentId]);
        return;
    }

    const nextRoundMatches: Match[] = [];
    let byePlayer = null;

    for (let i = winners.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [winners[i], winners[j]] = [winners[j], winners[i]];
    }

    if (winners.length % 2 !== 0) {
      byePlayer = winners.pop();
      console.log(`[advanceTournamentRound] Player ${byePlayer} gets a bye in Tournament ${tournamentId} Round ${nextRound}.`);
    }

    // Determine suggested match format based on number of winners
    let suggestedMatchFormat = "1局1胜";
    if (winners.length <= 2) {
        suggestedMatchFormat = "5局3胜"; // Final or semi-final with 2 players
    } else if (winners.length <= 6) {
        suggestedMatchFormat = "3局2胜";
    }

    // Compare suggested format with default tournament format and take the higher priority one
    const suggestedMatchFormatPriority = getMatchFormatPriority(suggestedMatchFormat);
    const finalNextRoundMatchFormat = getMatchFormatString(Math.max(suggestedMatchFormatPriority, defaultTournamentMatchFormatPriority));

    // Special rule: Final must be 5局3胜
    const isFinalRound = winners.length === 2; // Assuming 2 players means it's the final
    const actualNextRoundMatchFormat = isFinalRound ? "5局3胜" : finalNextRoundMatchFormat;

    console.log(`[advanceTournamentRound] Next round match format: ${actualNextRoundMatchFormat}`);

    for (let i = 0; i < winners.length; i += 2) {
      nextRoundMatches.push({
        tournament_id: tournamentId,
        round_number: nextRound,
        player1_id: winners[i],
        player2_id: winners[i + 1],
        status: 'pending',
        match_format: actualNextRoundMatchFormat,
      });
    }
    console.log(`[advanceTournamentRound] Generated ${nextRoundMatches.length} new matches for Round ${nextRound}.`);

    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(
          'INSERT INTO Matches (tournament_id, round_number, player1_id, player2_id, winner_id, status, finished_at, match_format) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        nextRoundMatches.forEach(match => {
          stmt.run(
            match.tournament_id,
            match.round_number,
            match.player1_id,
            match.player2_id,
            null,
            match.status,
            null,
            match.match_format
          );
        });
        stmt.finalize();
        db.run('COMMIT', (err: Error | null) => {
          if (err) reject(err);
          resolve(null);
        });
      });
    });

    if (byePlayer) {
        await query(
            'INSERT INTO Matches (tournament_id, round_number, player1_id, player2_id, winner_id, status, finished_at, match_format) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [tournamentId, nextRound, byePlayer, null, byePlayer, 'finished', new Date().toISOString(), actualNextRoundMatchFormat]
        );
    }

    console.log(`Generated ${nextRoundMatches.length} matches for Round ${nextRound} of Tournament ${tournamentId}.`);

  } catch (error) {
    console.error(`Error advancing tournament ${tournamentId} round:`, error);
  }
}
