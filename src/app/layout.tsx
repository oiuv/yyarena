'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';
import Image from 'next/image';

import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

import { getToken } from '@/utils/clientAuth';
import { Toaster } from 'react-hot-toast';

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

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/';
    setIsLoggedIn(false);
    setUserRole(null);
    setCharacterName(null);
    setIsMenuOpen(false);
    window.location.reload();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster
          toastOptions={{
            style: {
              background: '#1A1A1A', // 深숯灰
              color: '#F5F5F5', // 象牙白
              border: '1px solid #B89766', // 暗金边框
            },
            success: {
              iconTheme: {
                primary: '#B89766', // 暗金图标
                secondary: '#1A1A1A', // 深숯灰背景
              },
            },
            error: {
              iconTheme: {
                primary: '#C83C23', // 朱砂红图标
                secondary: '#1A1A1A', // 深숯灰背景
              },
            },
          }}
        />
        <nav className="w-full flex justify-between items-center p-4 bg-gray-900 text-white border-b-2 border-amber-600 shadow-lg relative z-50">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="燕云砺兵台 LOGO"
              width={150} // 示例宽度，你可以根据实际效果调整
              height={40} // 示例高度，你可以根据实际效果调整
              priority // 优化加载，对于LCP元素很有用
            />
          </Link>
          
          {/* 汉堡菜单按钮 - 移动端显示 */}
          <button 
            onClick={toggleMenu}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label="切换菜单"
          >
            <span className={`block w-6 h-0.5 bg-amber-400 mb-1 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-amber-400 mb-1 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-amber-400 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </button>

          {/* 桌面端导航 */}
          <div className="hidden md:flex items-center gap-6">
            {isLoggedIn ? (
              <>
                <span className="text-amber-200">欢迎, {characterName}</span>
                <button onClick={handleLogout} className="text-amber-400 hover:underline transition-colors duration-200">退出登录</button>
                <Link href="/tournamentRegister" className="text-amber-400 hover:underline transition-colors duration-200">报名比赛</Link>
                {isLoggedIn && (
                  <Link href="/my-registrations" className="text-amber-400 hover:underline transition-colors duration-200">我的报名</Link>
                )}
                <Link href="/profile" className="text-amber-400 hover:underline transition-colors duration-200">我的资料</Link>
              </>
            ) : (
              <>
                <Link href="/register" className="text-amber-400 hover:underline transition-colors duration-200">注册</Link>
                <Link href="/login" className="text-amber-400 hover:underline transition-colors duration-200">登录</Link>
              </>
            )}
            {userRole === 'organizer' && (
              <>
                <Link href="/my-tournaments" className="text-amber-400 hover:underline transition-colors duration-200">我的比赛</Link>
                <Link href="/tournaments/create" className="text-amber-400 hover:underline transition-colors duration-200">创建比赛</Link>
              </>
            )}
          </div>

          {/* 移动端菜单 */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full bg-gray-900 border-b-2 border-amber-600 shadow-lg z-40">
              <div className="flex flex-col p-4 space-y-3">
                {isLoggedIn ? (
                  <>
                    <span className="text-amber-200 py-2">欢迎, {characterName}</span>
                    <button onClick={handleLogout} className="text-amber-400 hover:text-amber-300 py-2 text-left transition-colors duration-200">退出登录</button>
                    <Link href="/tournamentRegister" onClick={closeMenu} className="text-amber-400 hover:text-amber-300 py-2 transition-colors duration-200">报名比赛</Link>
                    <Link href="/my-registrations" onClick={closeMenu} className="text-amber-400 hover:text-amber-300 py-2 transition-colors duration-200">我的报名</Link>
                    <Link href="/profile" onClick={closeMenu} className="text-amber-400 hover:text-amber-300 py-2 transition-colors duration-200">我的资料</Link>
                  </>
                ) : (
                  <>
                    <Link href="/register" onClick={closeMenu} className="text-amber-400 hover:text-amber-300 py-2 transition-colors duration-200">注册</Link>
                    <Link href="/login" onClick={closeMenu} className="text-amber-400 hover:text-amber-300 py-2 transition-colors duration-200">登录</Link>
                  </>
                )}
                {userRole === 'organizer' && (
                  <>
                    <div className="border-t border-amber-600/30 my-2"></div>
                    <Link href="/my-tournaments" onClick={closeMenu} className="text-amber-400 hover:text-amber-300 py-2 transition-colors duration-200">我的比赛</Link>
                    <Link href="/tournaments/create" onClick={closeMenu} className="text-amber-400 hover:text-amber-300 py-2 transition-colors duration-200">创建比赛</Link>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>
        {children}
      </body>
    </html>
  );
}
