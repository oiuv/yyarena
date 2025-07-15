import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';
import { verifyToken } from '@/utils/auth';

export async function POST(request: NextRequest) {
  const { tournamentId } = await request.json();

  // 1. Verify Player
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: '需要认证' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);

  if (!decodedToken || typeof decodedToken === 'string' || decodedToken.role !== 'player') {
    return NextResponse.json({ message: '只有玩家才能报名' }, { status: 403 });
  }
  const playerId = decodedToken.id;
  const characterName = decodedToken.character_name;
  const characterId = decodedToken.game_id; // Assuming game_id is the character_id

  if (!tournamentId) {
    return NextResponse.json({ message: '缺少比赛ID' }, { status: 400 });
  }

  try {
    // 2. Check Tournament Status and Availability
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '比赛不存在' }, { status: 404 });
    }

    const now = new Date();
    const registrationDeadline = new Date(tournament.registration_deadline);
    if (now > registrationDeadline) {
        return NextResponse.json({ message: '报名已截止' }, { status: 400 });
    }
    if (tournament.status !== 'pending' && tournament.status !== 'extended_registration') {
      return NextResponse.json({ message: '比赛当前不可报名' }, { status: 400 });
    }

    // 3. Insert Registration
    const result: any = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Registrations (tournament_id, player_id, character_name, character_id) VALUES (?, ?, ?, ?)',
        [tournamentId, playerId, characterName, characterId],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                reject(new Error('您已经报名过此比赛'));
            } else {
                reject(err);
            }
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });

    return NextResponse.json({ message: '报名成功', registrationId: result.id }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating registration:', error);
    return NextResponse.json({ message: error.message || '报名失败' }, { status: 500 });
  }
}
