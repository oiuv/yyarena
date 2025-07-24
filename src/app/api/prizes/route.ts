import { NextRequest, NextResponse } from 'next/server';
import { db, query } from '@/database.mjs';

export async function GET(req: NextRequest) {
  try {
    const prizes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM Prizes', [], (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    return NextResponse.json(prizes);
  } catch (error) {
    console.error('Error fetching prizes:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}