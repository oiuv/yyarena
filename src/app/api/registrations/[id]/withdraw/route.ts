import { NextRequest, NextResponse } from 'next/server';
import { db, query } from '@/database.mjs';
import { verifyToken } from '@/utils/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const registrationId = parseInt(params.id, 10);

  // 1. Verify Player
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: '需要认证' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);

  if (!decodedToken || typeof decodedToken === 'string' || decodedToken.role !== 'player') {
    return NextResponse.json({ message: '无权限' }, { status: 403 });
  }
  const playerId = decodedToken.id;

  try {
    // 2. Get Registration and Tournament Info
    const registration: any = await new Promise((resolve, reject) => {
      db.get('SELECT r.*, t.registration_deadline, t.status as tournament_status FROM Registrations r JOIN Tournaments t ON r.tournament_id = t.id WHERE r.id = ? AND r.player_id = ?', [registrationId, playerId], (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!registration) {
      return NextResponse.json({ message: '报名记录不存在或无权限' }, { status: 404 });
    }

    // 3. Check if withdrawal is allowed
    const now = new Date();
    const registrationDeadline = new Date(registration.registration_deadline);

    if (now > registrationDeadline || registration.tournament_status === 'ongoing' || registration.tournament_status === 'finished') {
      return NextResponse.json({ message: '比赛已开始或已结束，无法退出报名' }, { status: 400 });
    }

    // If deadline not passed, allow withdrawal
    await new Promise<void>((resolve, reject) => {
      db.run('UPDATE Registrations SET status = ? WHERE id = ?', ['withdrawn', registrationId], function (this: any, err: Error | null) {
        if (err) reject(err);
        else resolve();
      });
    });

    return NextResponse.json({ message: '成功退出报名' }, { status: 200 });

  } catch (error) {
    console.error('Error withdrawing registration:', error);
    return NextResponse.json({ message: '退出报名失败' }, { status: 500 });
  }
}
