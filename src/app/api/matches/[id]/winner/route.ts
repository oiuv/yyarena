import { NextResponse } from 'next/server';
import db from '@/database.js';
import { advanceTournamentRound } from '@/tournamentUtils';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  console.error('--- NEW winner.ts loaded ---'); // Unique debug statement

  const match_id = parseInt(params.id, 10); // Get match_id from URL params
  const { winner_id, match_format } = await request.json();

  if (isNaN(match_id) || !winner_id || !match_format) {
    return NextResponse.json({ error: 'Match ID (from URL), Winner ID, and Match Format are required.' }, { status: 400 });
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

    // 2. Validate winner_id
    if (match.player1_id !== winner_id && match.player2_id !== winner_id) {
      return NextResponse.json({
        error: `Winner ID ${winner_id} is not a player in this match. Players are ${match.player1_id} and ${match.player2_id}.`
      }, { status: 400 });
    }

    // 3. Update match with winner, status, finished_at timestamp, and match_format
    const now = new Date().toISOString();
    let changes = 0;
    try {
      changes = await new Promise((resolve, reject) => {
        db.run(
          'UPDATE Matches SET winner_id = ?, status = ?, finished_at = ?, match_format = ? WHERE id = ?',
          [winner_id, 'finished', now, match_format, match_id],
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
