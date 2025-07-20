import { NextRequest, NextResponse } from 'next/server';
const { db, query } = require('@/database');

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