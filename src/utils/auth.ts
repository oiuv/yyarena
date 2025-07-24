import jwt from 'jsonwebtoken';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export function verifyToken(token: string): { id: number; role: string; character_name: string; game_id: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded as { id: number; role: string; character_name: string; game_id: string };
  } catch (error) {
    console.error('Invalid token', error);
    return null;
  }
}
