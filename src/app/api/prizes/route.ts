import { NextResponse } from 'next/server';
import db from '@/database.js';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-default-secret-key');

export async function GET() {
  try {
    const prizes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM Prizes', (err, rows) => {
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
    return NextResponse.json({ error: 'Failed to fetch prizes.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { name, description, image_url } = await request.json();

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;

    if (userRole !== 'organizer') { // Assuming organizer can manage prizes for now, ideally admin
      return NextResponse.json({ error: 'Forbidden: Only organizers can create prizes.' }, { status: 403 });
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Prizes (name, description, image_url) VALUES (?, ?, ?)',
        [name, description, image_url],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating prize:', error);
    return NextResponse.json({ error: 'Failed to create prize.' }, { status: 500 });
  }
}
