'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Helper to get token from cookie
function getToken() {
  const name = 'token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}



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
        <nav className="w-full flex justify-end gap-4 mb-8 p-4 bg-gray-800 text-white">
          {isLoggedIn ? (
            <>
              <span className="text-gray-300">欢迎, {characterName}</span>
              <button onClick={handleLogout} className="text-blue-400 hover:underline">退出登录</button>
            </>
          ) : (
            <>
              <Link href="/register" className="text-blue-400 hover:underline">注册</Link>
              <Link href="/login" className="text-blue-400 hover:underline">登录</Link>
            </>
          )}
          <Link href="/tournamentRegister" className="text-blue-400 hover:underline">报名比赛</Link>
          {isLoggedIn && (
            <Link href="/my-registrations" className="text-blue-400 hover:underline">我的报名</Link>
          )}
          {userRole === 'organizer' && (
            <Link href="/prizes/manage" className="text-blue-400 hover:underline">管理奖品</Link>
          )}
        </nav>
        {children}
      </body>
    </html>
  );
}
