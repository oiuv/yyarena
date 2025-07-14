import db from '@/database.js';
import { advanceTournamentRound } from '@/tournamentUtils';

export async function POST(request: Request) {
  const { match_id, winner_id } = await request.json();

  if (!match_id || !winner_id) {
    return NextResponse.json({ error: 'Match ID and Winner ID are required.' }, { status: 400 });
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
      return NextResponse.json({ error: 'Winner ID is not a player in this match.' }, { status: 400 });
    }

    // 3. Update match with winner and status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE Matches SET winner_id = ?, status = ? WHERE id = ?',
        [winner_id, 'finished', match_id],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this);
          }
        }
      );
    });

    console.log(`Match ${match_id} finished. Winner: ${winner_id}.`);

    // 4. Advance tournament round
    await advanceTournamentRound(match.tournament_id, match.round_number);

    return NextResponse.json({ message: 'Match winner updated successfully.' });
  } catch (error) {
    console.error('Error updating match winner:', error);
    return NextResponse.json({ error: 'Failed to update match winner.' }, { status: 500 });
  }
}
