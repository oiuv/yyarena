import { NextRequest, NextResponse } from 'next/server';
const { db, query } = require('@/database');
import { verifyToken } from '@/utils/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'organizer') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const awardId = params.id;
  const { prize_id, remark } = await req.json();

  if (!prize_id) {
    return NextResponse.json({ message: 'Missing prize_id' }, { status: 400 });
  }

  try {
    // Verify that the award belongs to a tournament organized by the current organizer
    const award: any = await new Promise((resolve, reject) => {
      db.get(
        `SELECT pa.tournament_id, t.organizer_id
         FROM PlayerAwards pa
         JOIN Tournaments t ON pa.tournament_id = t.id
         WHERE pa.id = ?`,
        [awardId],
        (err: Error | null, row: any) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    if (!award || award.organizer_id !== decoded.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Update the award in the database
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE PlayerAwards SET prize_id = ?, remark = ? WHERE id = ?',
        [prize_id, remark || null, awardId],
        function (this: any, err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });

    return NextResponse.json({ message: 'Award updated successfully' });
  } catch (error) {
    console.error('Error updating award:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
