import { NextResponse } from 'next/server';
import { db, query } from '@/database.mjs';
import { verifyToken } from '@/utils/auth';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
      db.get('SELECT * FROM Tournaments WHERE id = ?', [tournamentId], (err: Error | null, row: any) => {
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

    if (tournament.status !== 'pending') {
      return NextResponse.json({ message: '比赛已开始或已结束，无法修改房间信息' }, { status: 400 });
    }

    const { room_name, room_number, room_password, livestream_url } = await request.json();

    // 验证必填字段
    if (!room_name || !room_number) {
      return NextResponse.json({ message: '房间名和房间ID为必填项' }, { status: 400 });
    }

    // 更新房间信息
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE Tournaments SET room_name = ?, room_number = ?, room_password = ?, livestream_url = ? WHERE id = ?',
        [room_name, room_number, room_password || null, livestream_url || null, tournamentId],
        function (this: any, err: Error | null) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return NextResponse.json({ message: '比赛信息更新成功！' }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating tournament room info:', error);
    return NextResponse.json({ message: error.message || '更新比赛信息失败' }, { status: 500 });
  }
}