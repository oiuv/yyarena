'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link
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

interface UserStats {
  total_participations: number;
  first_place_count: number;
  second_place_count: number;
  third_place_count: number;
  forfeit_count: number;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [editedStreamUrl, setEditedStreamUrl] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [upgradeUsername, setUpgradeUsername] = useState<string>('');
  const [upgradePassword, setUpgradePassword] = useState<string>('');
  const [upgradeMessage, setUpgradeMessage] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [passwordChangeMessage, setPasswordChangeMessage] = useState<string>('');
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
      setEditedStreamUrl(decodedUser.stream_url || '');
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

    const fetchUserStats = async () => {
      try {
        const res = await fetch('/api/users/me/stats', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const stats = await res.json();
          setUserStats(stats);
        } else {
          console.error('Failed to fetch user stats.');
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    };

    fetchAvatars();
    fetchUserStats();
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
        setMessage('头像更新成功！');
        // Update the user object in state and local storage
        const updatedUser = { ...user, avatar: selectedAvatar };
        setUser(updatedUser);
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60};`; // Store updated token in cookie

      } else {
        setMessage(data.message || '更新头像失败。');
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      setMessage('更新头像时发生错误。');
    }
  };

  const handleStreamUrlUpdate = async () => {
    if (!user) return;

    setMessage('');
    try {
      const token = getToken();
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ stream_url: editedStreamUrl }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('主页地址更新成功！');
        const updatedUser = { ...user, stream_url: editedStreamUrl };
        setUser(updatedUser);
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60};`;
      } else {
        setMessage(data.message || '更新主页地址失败。');
      }
    } catch (error) {
      console.error('Error updating stream URL:', error);
      setMessage('更新主页地址时发生错误。');
    }
  };

  const handleUpgradeToOrganizer = async () => {
    if (!user || !upgradeUsername || !upgradePassword) {
      setUpgradeMessage('请填写用户名和密码。');
      return;
    }

    setUpgradeMessage('');
    try {
      const token = getToken();
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ username: upgradeUsername, password: upgradePassword, role: 'organizer' }),
      });

      const data = await res.json();
      if (res.ok) {
        setUpgradeMessage('恭喜您，已成功升级为主办方！');
        // Update user state and token
        const updatedUser = { ...user, username: upgradeUsername, role: 'organizer' };
        setUser(updatedUser);
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60};`;
        router.push('/my-tournaments'); // Redirect to organizer dashboard
      } else {
        setUpgradeMessage(data.message || '升级失败。');
      }
    } catch (error) {
      console.error('Error upgrading to organizer:', error);
      setUpgradeMessage('升级时发生错误。');
    }
  };

  const handleSubmitPasswordChange = async () => {
    if (!user) return;

    setPasswordChangeMessage('');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordChangeMessage('所有密码字段都不能为空。');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeMessage('新密码和确认密码不匹配。');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordChangeMessage('新密码长度不能少于6位。');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordChangeMessage('密码修改成功！');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setPasswordChangeMessage(data.message || '密码修改失败。');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordChangeMessage('修改密码时发生错误。');
    }
  };

  if (!user) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">加载资料中...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 lg:p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">我的资料</h1>

      <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-md w-full md:max-w-md lg:max-w-4xl">
        <div className="mb-4">
          <p className="text-lg"><strong>角色名称:</strong> {user.character_name}</p>
          <p className="text-lg"><strong>角色编号:</strong> {user.game_id}</p>
          {user.username && user.role === 'organizer' && <p className="text-lg"><strong>用户名:</strong> {user.username}</p>}
          {user.role && <p className="text-lg"><strong>角色身份:</strong> {user.role === 'organizer' ? '比赛主办方' : '玩家'}</p>}

          {userStats && (
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <h2 className="text-2xl font-bold mb-4 text-center">比赛统计</h2>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-600 p-3 rounded-lg">
                  <p className="text-xl font-bold">{userStats.total_participations}</p>
                  <p className="text-sm text-gray-300">参赛次数</p>
                </div>
                <div className="bg-amber-400 p-3 rounded-lg">
                  <p className="text-xl font-bold">{userStats.first_place_count}</p>
                  <p className="text-sm text-gray-800">第一名</p>
                </div>
                <div className="bg-gray-400 p-3 rounded-lg">
                  <p className="text-xl font-bold">{userStats.second_place_count}</p>
                  <p className="text-sm text-gray-800">第二名</p>
                </div>
                <div className="bg-orange-700 p-3 rounded-lg">
                  <p className="text-xl font-bold">{userStats.third_place_count}</p>
                  <p className="text-sm text-gray-300">第三名</p>
                </div>
                <div className="bg-red-700 p-3 rounded-lg col-span-2">
                  <p className="text-xl font-bold">{userStats.forfeit_count}</p>
                  <p className="text-sm text-gray-300">弃权次数</p>
                </div>
              </div>
            </div>
          )}

          <Link href="/match-history">
            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
            >
              查看我的比赛记录
            </button>
          </Link>
          
          {user.role === 'organizer' && (
            <div className="mt-4">
              <label htmlFor="streamUrl" className="block text-lg font-bold mb-2">直播间/主页地址:</label>
              <input
                type="url"
                id="streamUrl"
                value={editedStreamUrl}
                onChange={(e) => setEditedStreamUrl(e.target.value)}
                className="w-full p-2 border rounded bg-gray-700 text-white mb-2"
                placeholder="请输入直播间或主页地址 (可选)"
              />
              <button
                onClick={handleStreamUrlUpdate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                更新主页地址
              </button>
              {message && <p className="mt-4 text-center text-green-500">{message}</p>}
            </div>
          )}

          {user.role === 'organizer' && (
            <div className="mt-8 p-4 bg-gray-700 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">修改密码</h2>
              <div className="mb-4">
                <label htmlFor="currentPassword" className="block text-lg font-bold mb-2">当前密码:</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-800 text-white"
                  placeholder="请输入当前密码"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="newPassword" className="block text-lg font-bold mb-2">新密码:</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-800 text-white"
                  placeholder="请输入新密码"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="confirmNewPassword" className="block text-lg font-bold mb-2">确认新密码:</label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-800 text-white"
                  placeholder="请再次输入新密码"
                  required
                />
              </div>
              <button
                onClick={handleSubmitPasswordChange}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                修改密码
              </button>
              {passwordChangeMessage && <p className="mt-4 text-center text-green-500">{passwordChangeMessage}</p>}
            </div>
          )}

          {user.role === 'player' && (
            <div className="mt-8 p-4 bg-gray-700 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">升级为主办方</h2>
              <p className="mb-4">如果您想组织比赛，可以补充账号密码，将当前玩家身份升级为主办方。</p>
              <div className="mb-4">
                <label htmlFor="upgradeUsername" className="block text-lg font-bold mb-2">设置用户名:</label>
                <input
                  type="text"
                  id="upgradeUsername"
                  value={upgradeUsername}
                  onChange={(e) => setUpgradeUsername(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-800 text-white"
                  placeholder="请输入用户名"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="upgradePassword" className="block text-lg font-bold mb-2">设置密码:</label>
                <input
                  type="password"
                  id="upgradePassword"
                  value={upgradePassword}
                  onChange={(e) => setUpgradePassword(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-800 text-white"
                  placeholder="请输入密码"
                  required
                />
              </div>
              <button
                onClick={handleUpgradeToOrganizer}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                升级为主办方
              </button>
              {upgradeMessage && <p className="mt-4 text-center text-green-500">{upgradeMessage}</p>}
            </div>
          )}
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
