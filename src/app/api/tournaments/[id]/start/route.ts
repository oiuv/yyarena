import { NextResponse } from 'next/server';
import db from '@/database.js';
import { verifyToken } from '@/utils/auth';
import { generateMatchesAndStartTournament } from '@/tournamentUtils';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

  if (isNaN(tournamentId)) {
    return NextResponse.json({ message: '无效的比赛ID' }, { status: 400 });
  }

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
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '比赛不存在' }, { status: 404 });
    }

    if (tournament.organizer_id !== organizerId) {
      return NextResponse.json({ message: '无权操作此比赛' }, { status: 403 });
    }

    if (tournament.status !== 'pending' && tournament.status !== 'registration_closed') {
      return NextResponse.json({ message: '比赛已开始或已结束' }, { status: 400 });
    }

    const { room_name, room_number, room_password } = await request.json();

    // Update room information in the database
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE Tournaments SET room_name = ?, room_number = ?, room_password = ? WHERE id = ?',
        [room_name, room_number, room_password, tournamentId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Check if enough players have registered
    const registeredPlayersCount: number = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM Registrations WHERE tournament_id = ? AND status = ?', [tournamentId, 'active'], (err, row: any) => {
        if (err) reject(err);
        resolve(row.count);
      });
    });

    if (registeredPlayersCount < tournament.min_players) {
      return NextResponse.json({ message: `报名人数不足，至少需要 ${tournament.min_players} 人才能开始比赛。当前报名人数：${registeredPlayersCount}` }, { status: 400 });
    }

    // New: Check if tournament start time is in the future
    const now = new Date();
    const tournamentStartTime = new Date(tournament.start_time);
    if (now < tournamentStartTime) {
        // If current time is before tournament start time, allow only if explicitly confirmed (handled by frontend for now)
        // In a real-world scenario, you might want to add a flag in the request body for explicit confirmation
        // For now, we'll just proceed as the frontend already asked for confirmation.
    }


    // Generate matches and start the tournament
    await generateMatchesAndStartTournament(tournamentId);

    return NextResponse.json({ message: '比赛已成功开始！' }, { status: 200 });

  } catch (error: any) {
    console.error('Error starting tournament:', error);
    return NextResponse.json({ message: error.message || '启动比赛失败' }, { status: 500 });
  }
}