import { NextResponse } from 'next/server';
import { db, query } from '@/database.mjs';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-default-secret-key');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Prize ID is required.' }, { status: 400 });
  }

  try {
    const prize = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Prizes WHERE id = ?', [id], (err: Error | null, row: any) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!prize) {
      return NextResponse.json({ error: 'Prize not found.' }, { status: 404 });
    }

    return NextResponse.json(prize);
  } catch (error) {
    console.error('Error fetching prize:', error);
    return NextResponse.json({ error: 'Failed to fetch prize.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const { name, description, image_url } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Prize ID is required.' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;

    if (userRole !== 'organizer') { // Assuming organizer can manage prizes for now, ideally admin
      return NextResponse.json({ error: 'Forbidden: Only organizers can update prizes.' }, { status: 403 });
    }

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE Prizes SET name = ?, description = ?, image_url = ? WHERE id = ?',
        [name, description, image_url, id],
        function (this: any, err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve(this);
          }
        }
      );
    });
    return NextResponse.json({ message: 'Prize updated successfully.' });
  } catch (error) {
    console.error('Error updating prize:', error);
    return NextResponse.json({ error: 'Failed to update prize.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Prize ID is required.' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;

    if (userRole !== 'organizer') { // Assuming organizer can manage prizes for now, ideally admin
      return NextResponse.json({ error: 'Forbidden: Only organizers can delete prizes.' }, { status: 403 });
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM Prizes WHERE id = ?', [id], function (this: any, err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
    return NextResponse.json({ message: 'Prize deleted successfully.' });
  } catch (error) {
    console.error('Error deleting prize:', error);
    return NextResponse.json({ error: 'Failed to delete prize.' }, { status: 500 });
  }
}
