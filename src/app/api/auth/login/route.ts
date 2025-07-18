import { NextResponse } from 'next/server';
import db from '@/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key'; // It's better to use an environment variable for the secret

export async function POST(request: Request) {
  try {
    const { username, password, game_id, phone_number } = await request.json();
    let user: any = null;

    if (username && password) {
      // Attempt to log in as organizer
      user = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Users WHERE username = ? AND role = 'organizer'`, [username], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (user && !(await bcrypt.compare(password, user.password))) {
        user = null; // Invalid password
      }
    } else if (game_id) {
      // Attempt to log in as player using game_id
      user = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Users WHERE game_id = ? AND role = 'player'`, [game_id], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });
    } else if (phone_number) {
      // Attempt to log in as player using phone_number
      user = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Users WHERE phone_number = ? AND role = 'player'`, [phone_number], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });
    }

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, game_id: user.game_id, character_name: user.character_name, role: user.role, stream_url: user.stream_url, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = NextResponse.json({ message: 'Logged in successfully', role: user.role, username: user.username, game_id: user.game_id, token });
    response.cookies.set('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
