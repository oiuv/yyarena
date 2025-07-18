'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';
import Image from 'next/image'; // Add this line

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

import { getToken } from '@/utils/clientAuth';



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        setIsLoggedIn(true);
        setUserRole(decodedToken.role);
        setCharacterName(decodedToken.character_name || '用户'); // Fallback name
      } catch (error) {
        console.error('Error decoding token:', error);
        setIsLoggedIn(false);
      }
    }
  }, []);

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/';
    setIsLoggedIn(false);
    setUserRole(null);
    setCharacterName(null);
    window.location.reload();
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="w-full flex justify-between items-center mb-8 p-4 bg-gray-900 text-white border-b-2 border-amber-600 shadow-lg">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="燕云砺兵台 LOGO"
              width={150} // 示例宽度，你可以根据实际效果调整
              height={40} // 示例高度，你可以根据实际效果调整
              priority // 优化加载，对于LCP元素很有用
            />
          </Link>
          <div className="flex items-center gap-6">
            {isLoggedIn ? (
              <>
                <span className="text-amber-200">欢迎, {characterName}</span>
                <button onClick={handleLogout} className="text-amber-400 hover:underline transition-colors duration-200">退出登录</button>
                <Link href="/tournamentRegister" className="text-amber-400 hover:underline transition-colors duration-200">报名比赛</Link>
                <Link href="/profile" className="text-amber-400 hover:underline transition-colors duration-200">我的资料</Link>
              </>
            ) : (
              <>
                <Link href="/register" className="text-amber-400 hover:underline transition-colors duration-200">注册</Link>
                <Link href="/login" className="text-amber-400 hover:underline transition-colors duration-200">登录</Link>
              </>
            )}
            {isLoggedIn && (
              <Link href="/my-registrations" className="text-amber-400 hover:underline transition-colors duration-200">我的报名</Link>
            )}
            {userRole === 'organizer' && (
              <>
                <Link href="/my-tournaments" className="text-amber-400 hover:underline transition-colors duration-200">我的比赛</Link>
                <Link href="/prizes/manage" className="text-amber-400 hover:underline transition-colors duration-200">管理奖品</Link>
                <Link href="/tournaments/create" className="text-amber-400 hover:underline transition-colors duration-200">创建比赛</Link>
              </>
            )}
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
