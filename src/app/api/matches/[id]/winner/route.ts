import { NextResponse } from 'next/server';
import db from '@/database.js';
import { advanceTournamentRound } from '@/tournamentUtils';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  console.error('--- NEW winner.ts loaded ---'); // Unique debug statement

  const match_id = parseInt(params.id, 10);
  const { winner_id, match_format, forfeit_type } = await request.json(); // Added forfeit_type

  if (isNaN(match_id) || !match_format) { // winner_id can be null for forfeit_both
    return NextResponse.json({ error: 'Match ID (from URL) and Match Format are required.' }, { status: 400 });
  }

  if (!winner_id && !forfeit_type) { // Either winner_id or forfeit_type must be present
    return NextResponse.json({ error: 'Winner ID or Forfeit Type is required.' }, { status: 400 });
  }

  try {
    // 1. Get match details
    const match: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Matches WHERE id = ?', [match_id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
    }

    if (match.status === 'finished') {
      return NextResponse.json({ error: 'Match already finished.' }, { status: 400 });
    }

    let finalWinnerId: number | null = null;
    let finalStatus: string = 'finished';

    if (forfeit_type === 'both') {
      finalWinnerId = null;
      finalStatus = 'forfeited';
    } else if (forfeit_type === 'player1') {
      finalWinnerId = match.player2_id;
      finalStatus = 'finished';
      // Update player1's registration status to forfeited
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE Registrations SET status = ? WHERE tournament_id = ? AND player_id = ?',
          ['forfeited', match.tournament_id, match.player1_id],
          function (err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    } else if (forfeit_type === 'player2') {
      finalWinnerId = match.player1_id;
      finalStatus = 'finished';
      // Update player2's registration status to forfeited
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE Registrations SET status = ? WHERE tournament_id = ? AND player_id = ?',
          ['forfeited', match.tournament_id, match.player2_id],
          function (err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    } else { // Normal winner selection
      // 2. Validate winner_id
      if (match.player1_id !== winner_id && match.player2_id !== winner_id) {
        return NextResponse.json({
          error: `Winner ID ${winner_id} is not a player in this match. Players are ${match.player1_id} and ${match.player2_id}.`
        }, { status: 400 });
      }
      finalWinnerId = winner_id;
    }

    // 3. Update match with winner, status, finished_at timestamp, and match_format
    const now = new Date().toISOString();
    let changes = 0;
    try {
      changes = await new Promise((resolve, reject) => {
        db.run(
          'UPDATE Matches SET winner_id = ?, status = ?, finished_at = ?, match_format = ? WHERE id = ?',
          [finalWinnerId, finalStatus, now, match_format, match_id],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.changes);
            }
          }
        );
      });
    } catch (dbError: any) {
      console.error('Database update error during db.run:', dbError);
      return NextResponse.json({ error: `Failed to update match in DB: ${dbError.message}` }, { status: 500 });
    }

    // 4. Re-query the database to confirm the update and get the full updated record
    const updatedMatch: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Matches WHERE id = ?', [match_id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    // 5. Advance tournament round
    await advanceTournamentRound(match.tournament_id, match.round_number);

    return NextResponse.json({
      message: 'Match winner updated successfully.',
      updatedMatch: updatedMatch, // Full updated match object
      dbChanges: changes, // Number of rows affected by the DB update
      timestampAttempted: now // The timestamp we attempted to write
    });
  } catch (error: any) {
    console.error('Error updating match winner (general catch):', error);
    return NextResponse.json({ error: `Failed to update match winner: ${error.message}` }, { status: 500 });
  }
}