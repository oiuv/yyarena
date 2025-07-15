import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';
import { verifyToken } from '@/utils/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

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
  const organizerId = decodedToken.id;

  try {
    // Check if the user is the actual organizer of this tournament
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Tournaments WHERE id = ? AND organizer_id = ?', [tournamentId, organizerId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '无权限或比赛不存在' }, { status: 403 });
    }
    
    if (tournament.status === 'ongoing' || tournament.status === 'finished') {
        return NextResponse.json({ message: '比赛已开始或已结束' }, { status: 400 });
    }

    // 2. Get Registered Players
    const players: any[] = await new Promise((resolve, reject) => {
      db.all('SELECT player_id FROM Registrations WHERE tournament_id = ?', [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (players.length < tournament.min_players) {
      return NextResponse.json({ message: `报名人数不足 ${tournament.min_players} 人，无法开始比赛` }, { status: 400 });
    }

    // 3. Shuffle Players (Fisher-Yates Shuffle)
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    // 4. Create Matches
    const roundNumber = 1;
    const matchesToInsert: { player1: number; player2: number | null }[] = [];
    for (let i = 0; i < players.length; i += 2) {
      if (i + 1 < players.length) {
        matchesToInsert.push({ player1: players[i].player_id, player2: players[i + 1].player_id });
      } else {
        // Handle bye for odd number of players
        matchesToInsert.push({ player1: players[i].player_id, player2: null });
      }
    }

    // 5. Insert Matches and Update Tournament Status in a Transaction
    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION;', (err) => {
            if (err) return reject(err);
        });

        const stmt = db.prepare('INSERT INTO Matches (tournament_id, round_number, player1_id, player2_id, winner_id, status) VALUES (?, ?, ?, ?, ?, ?)');
        for (const match of matchesToInsert) {
          const winnerId = match.player2 === null ? match.player1 : null;
          const status = match.player2 === null ? 'finished' : 'pending';
          stmt.run(tournamentId, roundNumber, match.player1, match.player2, winnerId, status);
        }
        stmt.finalize();

        db.run('UPDATE Tournaments SET status = ? WHERE id = ?', ['ongoing', tournamentId]);

        db.run('COMMIT;', (err) => {
            if (err) {
                db.run('ROLLBACK;');
                reject(err);
            } else {
                resolve();
            }
        });
      });
    });

    return NextResponse.json({ message: '比赛已成功开始，第一轮对阵已生成' }, { status: 200 });

  } catch (error) {
    console.error('Error starting tournament:', error);
    return NextResponse.json({ message: '开始比赛失败' }, { status: 500 });
  }
}
