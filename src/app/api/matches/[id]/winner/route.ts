import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';
import { verifyToken } from '@/utils/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const matchId = parseInt(params.id, 10);
  const { winnerId } = await request.json();

  // 1. Verify Organizer
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: '需要认证' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);

  if (!decodedToken || typeof decodedToken === 'string' || decodedToken.role !== 'organizer') {
    return NextResponse.json({ message: '无权限' }, { status: 403 });
  }
  const currentOrganizerId = decodedToken.id;

  try {
    // 2. Get Match and Tournament Info
    const match: any = await new Promise((resolve, reject) => {
      db.get('SELECT m.*, t.organizer_id FROM Matches m JOIN Tournaments t ON m.tournament_id = t.id WHERE m.id = ?', [matchId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!match) {
      return NextResponse.json({ message: '对局不存在' }, { status: 404 });
    }

    if (match.organizer_id !== currentOrganizerId) {
      return NextResponse.json({ message: '无权限操作此对局' }, { status: 403 });
    }

    if (match.status === 'finished') {
      return NextResponse.json({ message: '对局已结束，无法更改' }, { status: 400 });
    }

    // 3. Validate Winner ID
    if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
      return NextResponse.json({ message: '获胜者ID无效' }, { status: 400 });
    }

    // 4. Update Match and Handle Next Round in a Transaction
    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION;', (err) => {
          if (err) return reject(err);
        });

        db.run('UPDATE Matches SET winner_id = ?, status = ? WHERE id = ?', [winnerId, 'finished', matchId], async function (err) {
          if (err) {
            db.run('ROLLBACK;');
            return reject(err);
          }

          try {
            // Check if all matches in the current round are finished
            const currentRoundMatches: any[] = await new Promise((res, rej) => {
              db.all('SELECT * FROM Matches WHERE tournament_id = ? AND round_number = ?', [match.tournament_id, match.round_number], (err, rows) => {
                if (err) rej(err);
                else res(rows);
              });
            });

            const allMatchesFinishedInRound = currentRoundMatches.every(m => m.status === 'finished');

            if (allMatchesFinishedInRound) {
              // Collect winners for the next round
              const winners: any[] = await new Promise((res, rej) => {
                db.all('SELECT winner_id FROM Matches WHERE tournament_id = ? AND round_number = ? AND winner_id IS NOT NULL', [match.tournament_id, match.round_number], (err, rows) => {
                  if (err) rej(err);
                  else res(rows);
                });
              });

              const winnerPlayerIds = winners.map(w => w.winner_id);

              if (winnerPlayerIds.length === 1) {
                // Tournament finished, one winner
                db.run('UPDATE Tournaments SET winner_id = ?, status = ? WHERE id = ?', [winnerPlayerIds[0], 'finished', match.tournament_id]);
              } else if (winnerPlayerIds.length > 1) {
                // Generate next round matches
                // Shuffle winners
                for (let i = winnerPlayerIds.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [winnerPlayerIds[i], winnerPlayerIds[j]] = [winnerPlayerIds[j], winnerPlayerIds[i]];
                }

                const nextRoundNumber = match.round_number + 1;
                const nextMatchesToInsert: { player1: number; player2: number | null }[] = [];
                for (let i = 0; i < winnerPlayerIds.length; i += 2) {
                  if (i + 1 < winnerPlayerIds.length) {
                    nextMatchesToInsert.push({ player1: winnerPlayerIds[i], player2: winnerPlayerIds[i + 1] });
                  } else {
                    // Handle bye for odd number of players
                    nextMatchesToInsert.push({ player1: winnerPlayerIds[i], player2: null });
                  }
                }

                const stmt = db.prepare('INSERT INTO Matches (tournament_id, round_number, player1_id, player2_id, winner_id, status) VALUES (?, ?, ?, ?, ?, ?)');
                for (const nextMatch of nextMatchesToInsert) {
                  const nextWinnerId = nextMatch.player2 === null ? nextMatch.player1 : null;
                  const nextStatus = nextMatch.player2 === null ? 'finished' : 'pending';
                  stmt.run(match.tournament_id, nextRoundNumber, nextMatch.player1, nextMatch.player2, nextWinnerId, nextStatus);
                }
                stmt.finalize();
              }
            }
            db.run('COMMIT;', (err) => {
              if (err) {
                db.run('ROLLBACK;');
                reject(err);
              } else {
                resolve();
              }
            });
          } catch (innerError) {
            db.run('ROLLBACK;');
            reject(innerError);
          }
        });
      });
    });

    return NextResponse.json({ message: '获胜者已标记' }, { status: 200 });

  } catch (error) {
    console.error('Error marking winner:', error);
    return NextResponse.json({ message: '标记获胜者失败' }, { status: 500 });
  }
}
