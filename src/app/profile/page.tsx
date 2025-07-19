'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/utils/clientAuth';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: number;
  username?: string;
  game_id: string;
  character_name: string;
  role: string;
  stream_url?: string;
  avatar?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const decodedUser = jwtDecode<User>(token);
      setUser(decodedUser);
      setSelectedAvatar(decodedUser.avatar || '000.webp');
    } catch (error) {
      console.error('Failed to decode token:', error);
      router.push('/login');
      return;
    }

    const fetchAvatars = async () => {
      try {
        const res = await fetch('/api/avatars');
        if (res.ok) {
          const avatars = await res.json();
          setAvailableAvatars(avatars);
        } else {
          setMessage('Failed to fetch available avatars.');
        }
      } catch (error) {
        console.error('Error fetching avatars:', error);
        setMessage('Error fetching available avatars.');
      }
    };

    fetchAvatars();
  }, [router]);

  const handleAvatarChange = async () => {
    if (!user || !selectedAvatar) return;

    setMessage('');
    try {
      const token = getToken();
      const res = await fetch('/api/users/me/avatar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: selectedAvatar }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Avatar updated successfully!');
        // Update the user object in state and local storage
        const updatedUser = { ...user, avatar: selectedAvatar };
        setUser(updatedUser);
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60};`; // Store updated token in cookie

      } else {
        setMessage(data.message || 'Failed to update avatar.');
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      setMessage('Error updating avatar.');
    }
  };

  if (!user) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">Loading profile...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 lg:p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">我的资料</h1>

      <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-md w-full md:max-w-md lg:max-w-4xl">
        <div className="mb-4">
          <p className="text-lg"><strong>角色名称:</strong> {user.character_name}</p>
          <p className="text-lg"><strong>角色编号:</strong> {user.game_id}</p>
          {user.username && <p className="text-lg"><strong>用户名:</strong> {user.username}</p>}
          {user.role && <p className="text-lg"><strong>角色身份:</strong> {user.role === 'organizer' ? '比赛主办者' : '玩家'}</p>}
          {user.stream_url && <p className="text-lg"><strong>直播间/主页:</strong> <a href={user.stream_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">点击访问</a></p>}
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-4">角色图像</h2>
          <div className="flex flex-col items-center mb-4">
            <Image
              src={`/avatars/${selectedAvatar}`}
              alt="Current Avatar"
              width={96}
              height={96}
              className="w-24 h-24 rounded-lg object-cover mb-4 border-2 border-blue-500"
            />
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 w-full">
              {availableAvatars.map((avatar) => (
                <div
                  key={avatar}
                  className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${
                    selectedAvatar === avatar ? 'ring-4 ring-green-500 scale-105' : 'ring-2 ring-gray-600 hover:ring-blue-400'
                  }`}
                  onClick={() => setSelectedAvatar(avatar)}
                >
                  <Image
                    src={`/avatars/${avatar}`}
                    alt={avatar}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleAvatarChange}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            更新头像
          </button>
          {message && <p className="mt-4 text-center text-green-500">{message}</p>}
        </div>
      </div>
    </main>
  );
}
