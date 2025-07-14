import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';
import { verifyToken } from '../../../../utils/auth';

// GET a single tournament by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Tournaments WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!tournament) {
      return NextResponse.json({ message: '未找到比赛' }, { status: 404 });
    }
    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json({ message: '获取比赛失败' }, { status: 500 });
  }
}

// PUT (update) a tournament's room info
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { room_name, room_number, room_password } = await request.json();

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: '需要认证' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);

  if (!decodedToken || typeof decodedToken === 'string' || decodedToken.role !== 'organizer') {
    return NextResponse.json({ message: '无权限' }, { status: 403 });
  }

  try {
    // First, verify the organizer owns this tournament
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT organizer_id FROM Tournaments WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '未找到比赛' }, { status: 404 });
    }
    if (tournament.organizer_id !== decodedToken.userId) {
      return NextResponse.json({ message: '无权限修改此比赛' }, { status: 403 });
    }

    // Now, update the tournament
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE Tournaments SET room_name = ?, room_number = ?, room_password = ? WHERE id = ?',
        [room_name, room_number, room_password, id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const updatedTournament = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM Tournaments WHERE id = ?', [id], (err, row) => {
            if(err) reject(err)
            else resolve(row)
        });
    });

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json({ message: '更新比赛失败' }, { status: 500 });
  }
}
