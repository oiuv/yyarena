import db from '@/database.js';

interface Match {
  tournament_id: number;
  round_number: number;
  player1_id: number;
  player2_id: number | null; // player2_id can be null for bye matches
  winner_id?: number; // winner_id is optional, only for finished matches
  status: string;
  match_format?: string; // Add this line for match format
}

export async function generateMatchesAndStartTournament(tournamentId: number) {
  try {
    // 1. Fetch all active registered players
    const registrations: any[] = await new Promise((resolve, reject) => {
      db.all('SELECT player_id FROM Registrations WHERE tournament_id = ? AND status = ?', [tournamentId, 'active'], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

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

    for (let i = 0; i < players.length; i += 2) {
      matches.push({
        tournament_id: tournamentId,
        round_number: 1,
        player1_id: players[i],
        player2_id: players[i + 1],
        status: 'pending',
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
        match_format: "1局1胜",
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
            match.match_format || "1局1胜" // Default match format
          );
        });
        stmt.finalize();
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          resolve(null);
        });
      });
    });

    // 5. Update tournament status to 'ongoing'
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE Tournaments SET status = ? WHERE id = ?',
        ['ongoing', tournamentId],
        function (err) {
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

export async function advanceTournamentRound(tournamentId: number, currentRound: number) {
  console.log(`[advanceTournamentRound] Advancing tournament ${tournamentId}, current round: ${currentRound}`);
  try {
    // 1. Get all matches for the current round
    const currentRoundMatches: any[] = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM Matches WHERE tournament_id = ? AND round_number = ?', [tournamentId, currentRound], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
    console.log(`[advanceTournamentRound] Current round matches fetched: ${currentRoundMatches.length}`);

    // 2. Check if all matches in the current round are finished
    const allMatchesFinished = currentRoundMatches.every(match => match.status === 'finished' || match.status === 'forfeited'); // Added forfeited status
    console.log(`[advanceTournamentRound] All matches in current round finished: ${allMatchesFinished}`); // Added log

    if (!allMatchesFinished) {
      console.log(`[advanceTournamentRound] Not all matches in round ${currentRound} for tournament ${tournamentId} are finished. Skipping advance.`);
      return;
    }

    // 3. Get all valid winners from the current round
    const winners = currentRoundMatches
      .filter(match => match.winner_id !== null && match.winner_id !== undefined) // Filter out null/undefined winners
      .map(match => match.winner_id);
    console.log(`[advanceTournamentRound] Valid winners from current round: ${winners.length}`); // Added log

    // 4. Determine the next round number
    const nextRound = currentRound + 1;

    // 5. If only one winner remains, declare them the tournament champion
    if (winners.length === 1) {
      const championId = winners[0];
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE Tournaments SET status = ?, winner_id = ? WHERE id = ?',
          ['finished', championId, tournamentId],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve(this);
            }
          }
        );
      });
      console.log(`[advanceTournamentRound] Tournament ${tournamentId} finished. Champion: ${championId}`);

      // Calculate and store final rankings with tie-breaking based on opponent strength
      const allMatches: any[] = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM Matches WHERE tournament_id = ? ORDER BY round_number DESC', [tournamentId], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });

      const allRegistrations: any[] = await new Promise((resolve, reject) => {
        db.all(`SELECT r.player_id, u.character_name, u.avatar, r.status as registration_status FROM Registrations r JOIN Users u ON r.player_id = u.id WHERE r.tournament_id = ? AND (r.status = 'active' OR r.status = 'forfeited')`, [tournamentId], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });

      const playerStats = new Map();
      for (const reg of allRegistrations) {
        playerStats.set(reg.player_id, {
          character_name: reg.character_name,
          avatar: reg.avatar, // Include avatar
          elimination_round: 0, // Default for players with no matches played or no losses
          lost_to_player_id: null, // ID of the player they lost to
          is_forfeited_registration: reg.registration_status === 'forfeited', // New flag
        });
      }

      for (const match of allMatches) {
        if (match.winner_id === null || match.winner_id === undefined) continue;
        const loserId = match.player1_id === match.winner_id ? match.player2_id : match.player1_id;
        if (loserId) {
          const stats = playerStats.get(loserId);
          if (stats && stats.elimination_round === 0) { // Only record the first loss
            stats.elimination_round = match.round_number;
            stats.lost_to_player_id = match.winner_id;
          }
        }
      }

      const championStats = playerStats.get(championId);
      if (championStats) {
        const maxRound = allMatches.length > 0 ? Math.max(...allMatches.map(m => m.round_number)) : 0;
        championStats.elimination_round = maxRound + 1; // Give champion the highest round
      }

      // Sort players based on elimination round, then by opponent's elimination round, and finally by forfeited status
      const sortedPlayers = Array.from(playerStats.entries()).sort(([, a], [, b]) => {
        // Primary sort: Forfeited registrations come last
        if (a.is_forfeited_registration && !b.is_forfeited_registration) return 1;
        if (!a.is_forfeited_registration && b.is_forfeited_registration) return -1;

        // If both are forfeited or both are not forfeited, then sort by elimination_round
        if (a.elimination_round !== b.elimination_round) {
          return b.elimination_round - a.elimination_round;
        }

        // If elimination_round is same (and not forfeited), then tie-breaker: Opponent's strength
        // This part only applies to players who actually lost a match
        if (!a.is_forfeited_registration && !b.is_forfeited_registration) {
          const opponentAStats = a.lost_to_player_id ? playerStats.get(a.lost_to_player_id) : null;
          const opponentBStats = b.lost_to_player_id ? playerStats.get(b.lost_to_player_id) : null;
          return (opponentBStats?.elimination_round || 0) - (opponentAStats?.elimination_round || 0);
        }

        // If both are forfeited and elimination_round is same, maintain original order (or sort by ID if needed)
        return 0;
      });

      const finalRankings: any[] = [];
      let currentRank = 0;
      let lastEliminationRound = -1;
      let lastOpponentRound = -1;
      let lastForfeitedStatus = false;

      for (let i = 0; i < sortedPlayers.length; i++) {
        const [playerId, stats] = sortedPlayers[i];
        const opponentStats = stats.lost_to_player_id ? playerStats.get(stats.lost_to_player_id) : null;
        const opponentRound = opponentStats?.elimination_round || 0;

        // Determine rank - only advance rank if primary or secondary sort criteria change
        if (stats.elimination_round !== lastEliminationRound || 
            opponentRound !== lastOpponentRound || 
            stats.is_forfeited_registration !== lastForfeitedStatus) {
          currentRank = i + 1;
        }

        finalRankings.push({
          rank: currentRank,
          player_id: playerId,
          character_name: stats.character_name + (stats.is_forfeited_registration ? ' (弃权)' : ''),
          avatar: stats.avatar, // Include avatar
        });

        lastEliminationRound = stats.elimination_round;
        lastOpponentRound = opponentRound;
        lastForfeitedStatus = stats.is_forfeited_registration;
      }

      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE Tournaments SET final_rankings = ? WHERE id = ?',
          [JSON.stringify(finalRankings), tournamentId],
          function (err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
      console.log(`[advanceTournamentRound] Final rankings stored for tournament ${tournamentId}.`);
      return;
    }

    // If no winners, or odd number of winners (after filtering), handle bye or end tournament
    if (winners.length === 0) {
        console.log(`[advanceTournamentRound] No winners in round ${currentRound} for tournament ${tournamentId}. Ending tournament.`);
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE Tournaments SET status = ? WHERE id = ?',
                ['finished', tournamentId], // Mark as finished without a winner
                function (err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });
        return;
    }


    // 6. Otherwise, create new match pairings for the next round
    const nextRoundMatches: Match[] = [];
    let byePlayer = null;

    // Shuffle winners to ensure the bye is random
    for (let i = winners.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [winners[i], winners[j]] = [winners[j], winners[i]];
    }

    if (winners.length % 2 !== 0) {
      byePlayer = winners.pop(); // Last winner gets a bye
      console.log(`[advanceTournamentRound] Player ${byePlayer} gets a bye in Tournament ${tournamentId} Round ${nextRound}.`);
    }

    // Determine match format for the next round (simplified for now, can be more complex later)
    let nextRoundMatchFormat = "1局1胜"; // Default
    if (winners.length <= 2) { // Example: Finals or semi-finals
        nextRoundMatchFormat = "5局3胜";
    } else if (winners.length <= 6) { // Example: Quarter-finals
        nextRoundMatchFormat = "3局2胜";
    }
    console.log(`[advanceTournamentRound] Next round match format: ${nextRoundMatchFormat}`);


    for (let i = 0; i < winners.length; i += 2) {
      nextRoundMatches.push({
        tournament_id: tournamentId,
        round_number: nextRound,
        player1_id: winners[i],
        player2_id: winners[i + 1],
        status: 'pending',
        match_format: nextRoundMatchFormat,
      });
    }
    console.log(`[advanceTournamentRound] Generated ${nextRoundMatches.length} new matches for Round ${nextRound}.`);


    // 7. Insert new matches into the Matches table
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
            null, // winner_id is null initially
            match.status,
            null,
            match.match_format
          );
        });
        stmt.finalize();
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          resolve(null);
        });
      });
    });

    // Handle bye player if any (insert as a finished match)
    if (byePlayer) {
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO Matches (tournament_id, round_number, player1_id, player2_id, winner_id, status, finished_at, match_format) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [tournamentId, nextRound, byePlayer, null, byePlayer, 'finished', new Date().toISOString(), nextRoundMatchFormat],
                function (err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });
    }

    console.log(`Generated ${nextRoundMatches.length} matches for Round ${nextRound} of Tournament ${tournamentId}.`);

  } catch (error) {
    console.error(`Error advancing tournament ${tournamentId} round:`, error);
  }
}