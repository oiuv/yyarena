import { NextResponse } from 'next/server';
const { db, query } = require('@/database.js');
import { verifyToken } from '@/utils/auth';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key';

export async function PUT(request: Request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { avatar } = await request.json();

    if (!avatar) {
      return NextResponse.json({ message: 'Avatar filename is required' }, { status: 400 });
    }

    // Validate if the avatar file exists in public/avatars
    const avatarPath = path.join(process.cwd(), 'public', 'avatars', avatar);
    if (!fs.existsSync(avatarPath)) {
      return NextResponse.json({ message: 'Invalid avatar filename' }, { status: 400 });
    }

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE Users SET avatar = ? WHERE id = ?',
        [avatar, decodedToken.id],
        function (this: any, err: Error | null) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error('User not found or avatar not changed'));
          } else {
            resolve(this);
          }
        }
      );
    });

    // Fetch the updated user to generate a new token
    const updatedUser: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Users WHERE id = ?', [decodedToken.id], (err: Error | null, row: any) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found after update' }, { status: 404 });
    }

    const newToken = jwt.sign(
      { id: updatedUser.id, username: updatedUser.username, game_id: updatedUser.game_id, character_name: updatedUser.character_name, role: updatedUser.role, stream_url: updatedUser.stream_url, avatar: updatedUser.avatar },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = NextResponse.json({ message: 'Avatar updated successfully!', token: newToken }, { status: 200 });
    response.cookies.set('token', newToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error updating avatar:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
