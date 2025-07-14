import db from '@/database.js';

export async function generateMatchesAndStartTournament(tournamentId: number) {
  try {
    // 1. Fetch all registered players
    const registrations: any[] = await new Promise((resolve, reject) => {
      db.all('SELECT player_id FROM Registrations WHERE tournament_id = ?', [tournamentId], (err, rows) => {
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
    const matches = [];
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

    // 4. Insert these matches into the Matches table
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(
          'INSERT INTO Matches (tournament_id, round_number, player1_id, player2_id, status) VALUES (?, ?, ?, ?, ?)'
        );
        matches.forEach(match => {
          stmt.run(
            match.tournament_id,
            match.round_number,
            match.player1_id,
            match.player2_id,
            match.status
          );
        });
        stmt.finalize();
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          resolve(null);
        });
      });
    });

    // Handle bye player if any
    if (byePlayer) {
      matches.push({
        tournament_id: tournamentId,
        round_number: 1,
        player1_id: byePlayer,
        player2_id: null, // Indicate a bye
        winner_id: byePlayer,
        status: 'finished', // Bye matches are immediately finished
      });
      console.log(`Player ${byePlayer} gets a bye in Tournament ${tournamentId} Round 1.`);
    }

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
  try {
    // 1. Get all matches for the current round
    const currentRoundMatches: any[] = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM Matches WHERE tournament_id = ? AND round_number = ?', [tournamentId, currentRound], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    // 2. Check if all matches in the current round are finished
    const allMatchesFinished = currentRoundMatches.every(match => match.status === 'finished');

    if (!allMatchesFinished) {
      console.log(`Not all matches in round ${currentRound} for tournament ${tournamentId} are finished.`);
      return;
    }

    // 3. Get all winners from the current round
    const winners = currentRoundMatches.map(match => match.winner_id);

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
      console.log(`Tournament ${tournamentId} finished. Champion: ${championId}`);
      return;
    }

    // 6. Otherwise, create new match pairings for the next round
    const nextRoundMatches = [];
    let byePlayer = null;
    if (winners.length % 2 !== 0) {
      byePlayer = winners.pop(); // Last winner gets a bye
    }

    for (let i = 0; i < winners.length; i += 2) {
      nextRoundMatches.push({
        tournament_id: tournamentId,
        round_number: nextRound,
        player1_id: winners[i],
        player2_id: winners[i + 1],
        status: 'pending',
      });
    }

    // 7. Insert new matches into the Matches table
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(
          'INSERT INTO Matches (tournament_id, round_number, player1_id, player2_id, status) VALUES (?, ?, ?, ?, ?)'
        );
        nextRoundMatches.forEach(match => {
          stmt.run(
            match.tournament_id,
            match.round_number,
            match.player1_id,
            match.player2_id,
            match.status
          );
        });
        stmt.finalize();
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          resolve(null);
        });
      });
    });

    // Handle bye player if any
    if (byePlayer) {
      console.log(`Player ${byePlayer} gets a bye in Tournament ${tournamentId} Round ${nextRound}.`);
    }

    console.log(`Generated ${nextRoundMatches.length} matches for Round ${nextRound} of Tournament ${tournamentId}.`);

  } catch (error) {
    console.error(`Error advancing tournament ${tournamentId} round:`, error);
  }
}
