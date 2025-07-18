import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const avatarsDirectory = path.join(process.cwd(), 'public', 'avatars');
    const filenames = await fs.promises.readdir(avatarsDirectory);
    const avatarFiles = filenames.filter(name => /\.(webp|png|jpg|jpeg|gif)$/i.test(name));
    return NextResponse.json(avatarFiles, { status: 200 });
  } catch (error) {
    console.error('Error fetching avatars:', error);
    return NextResponse.json({ message: 'Failed to fetch avatars' }, { status: 500 });
  }
}
