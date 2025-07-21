import { NextRequest, NextResponse } from 'next/server';
const { db, query } = require('@/database.js');
import { verifyToken } from '@/utils/auth';

export async function POST(request: NextRequest) {
  const { tournamentId, registrationCode } = await request.json();

  // 1. Verify Player
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: '需要认证' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);

  if (!decodedToken || typeof decodedToken === 'string' || (decodedToken.role !== 'player' && decodedToken.role !== 'organizer')) {
    return NextResponse.json({ message: '无权限' }, { status: 403 });
  }
  const playerId = decodedToken.id;
  const characterName = decodedToken.character_name;
  const characterId = decodedToken.game_id; // Assuming game_id is the character_id
  const currentUserRole = decodedToken.role;

  console.log(`Attempting to register player ID: ${playerId}, Character Name: ${characterName}, Game ID: ${characterId} for Tournament ID: ${tournamentId}`);

  if (!tournamentId) {
    return NextResponse.json({ message: '缺少比赛ID' }, { status: 400 });
  }

  // Fetch player's forfeit_count
  const player: any = await new Promise((resolve, reject) => {
    db.get('SELECT forfeit_count FROM Users WHERE id = ?', [playerId], (err: Error | null, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!player) {
    return NextResponse.json({ message: '玩家不存在' }, { status: 404 });
  }

  const FORFEIT_LIMIT = 3; // Define the forfeit limit
  if (player.forfeit_count >= FORFEIT_LIMIT) {
    return NextResponse.json({ message: `您的弃赛次数过多（${player.forfeit_count}次），无法报名新的比赛。` }, { status: 403 });
  }

  try {
    // 2. Check Tournament Status and Availability
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Tournaments WHERE id = ?', [tournamentId], (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '比赛不存在' }, { status: 404 });
    }

    // Check registration code if required
    if (tournament.registration_code && tournament.registration_code !== registrationCode) {
      return NextResponse.json({ message: '参赛验证码不正确' }, { status: 400 });
    }

    // Prevent organizer from registering for their own tournament
    if (currentUserRole === 'organizer' && tournament.organizer_id === playerId) {
      return NextResponse.json({ message: '您不能报名自己组织的比赛' }, { status: 400 });
    }

    const now = new Date();
    const registrationDeadline = new Date(tournament.registration_deadline);
    if (now > registrationDeadline) {
        return NextResponse.json({ message: '报名已截止' }, { status: 400 });
    }
    if (tournament.status !== 'pending' && tournament.status !== 'extended_registration') {
      return NextResponse.json({ message: '比赛当前不可报名' }, { status: 400 });
    }

    // Check if the tournament is full
    const registrationCount: any = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM Registrations WHERE tournament_id = ? AND status = ?', [tournamentId, 'active'], (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (registrationCount.count >= tournament.max_players) {
      return NextResponse.json({ message: '比赛报名人数已满' }, { status: 400 });
    }

    // 3. Check for existing registration and update or insert
    const existingRegistration: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Registrations WHERE tournament_id = ? AND player_id = ?', [tournamentId, playerId], (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingRegistration) {
      if (existingRegistration.status === 'active') {
        return NextResponse.json({ message: '您已经报名过此比赛' }, { status: 400 });
      } else if (existingRegistration.status === 'forfeited') {
        return NextResponse.json({ message: '您已弃权，无法重新报名' }, { status: 400 });
      } else { // withdrawn, allow re-registration
        const result: any = await new Promise((resolve, reject) => {
          db.run(
            'UPDATE Registrations SET status = ?, registration_time = ? WHERE id = ?',
            ['active', new Date().toISOString(), existingRegistration.id],
            function (this: any, err: Error | null) {
              if (err) reject(err);
              else resolve({ id: existingRegistration.id });
            }
          );
        });
        return NextResponse.json({ message: '重新报名成功', registrationId: result.id }, { status: 200 });
      }
    } else {
      // No existing registration, insert new one
      const result: any = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO Registrations (tournament_id, player_id, character_name, character_id, registration_time, status) VALUES (?, ?, ?, ?, ?, ?)',
          [tournamentId, playerId, characterName, characterId, new Date().toISOString(), 'active'],
          function (this: any, err: Error | null) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
          }
        );
      });
      return NextResponse.json({ message: '报名成功', registrationId: result.id }, { status: 201 });
    }

  } catch (error: any) {
    console.error('Error creating registration:', error);
    return NextResponse.json({ message: error.message || '报名失败' }, { status: 500 });
  }
}
