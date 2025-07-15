import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your-default-secret-key';

export function verifyToken(token: string): { id: number; role: string; character_name: string } | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded as { userId: number; role: string; character_name: string };
  } catch (error) {
    console.error('Invalid token', error);
    return null;
  }
}
