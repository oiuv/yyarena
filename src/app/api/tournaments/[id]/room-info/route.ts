import { NextResponse } from 'next/server';
import db from '@/database.js';
import { verifyToken } from '@/utils/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
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

  if (!decodedToken || typeof decodedToken === 'string') {
    return NextResponse.json({ message: '认证失败' }, { status: 401 });
  }

  try {
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT organizer_id, room_name, room_number, room_password FROM Tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '比赛不存在' }, { status: 404 });
    }

    // Check if the user is the organizer
    if (decodedToken.id === tournament.organizer_id) {
      return NextResponse.json({ room_name: tournament.room_name, room_number: tournament.room_number, room_password: tournament.room_password });
    }

    // Check if the user is a registered player in this tournament
    const isRegisteredPlayer: any = await new Promise((resolve, reject) => {
      db.get('SELECT 1 FROM Registrations WHERE tournament_id = ? AND player_id = ? AND status = ?', [tournamentId, decodedToken.id, 'active'], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (isRegisteredPlayer) {
      return NextResponse.json({ room_name: tournament.room_name, room_number: tournament.room_number, room_password: tournament.room_password });
    }

    return NextResponse.json({ message: '无权查看房间信息' }, { status: 403 });

  } catch (error: any) {
    console.error('Error fetching room info:', error);
    return NextResponse.json({ message: error.message || '获取房间信息失败' }, { status: 500 });
  }
}