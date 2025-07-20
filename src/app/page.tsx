'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Reusable Tournament Card Component
const TournamentCard = ({ tournament, registeredPlayersAvatars, statusConfig }: any) => {
  const { color, label, status } = statusConfig;

  const renderCardButton = () => {
    switch (status) {
      case 'ongoing':
        return <div className="bg-brand-red hover:bg-opacity-80 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 text-center">观看比赛</div>;
      case 'openForRegistration':
        return <div className="bg-brand-gold hover:bg-opacity-80 text-brand-charcoal font-bold py-2 px-4 rounded-lg transition-colors duration-300 text-center">了解详情</div>;
      case 'finished':
        return <div className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 text-center">赛事回顾</div>;
      case 'failed':
      case 'registrationClosed':
        return null; // No button for these states
      default:
        return null;
    }
  };

  return (
    <Link href={`/tournaments/details?id=${tournament.id}`} className="flex flex-col bg-brand-charcoal/60 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg border border-brand-gold/20 hover:border-brand-gold/60 transition-all duration-300 group">
      <div className="relative w-full h-48">
        <Image
          src={tournament.cover_image_url || '/images/default_cover.jpg'}
          alt={tournament.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-bold text-white bg-${color}-500/80`}>
          {label}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
          <h3 className="text-xl font-bold text-brand-ivory mb-2 truncate">{tournament.name}</h3>
          <p className="text-sm text-brand-ivory/70 mb-1">开赛时间: {new Date(tournament.start_time).toLocaleString()}</p>
          <p className="text-sm text-brand-ivory/70 mb-3">报名截止: {new Date(tournament.registration_deadline).toLocaleString()}</p>
          
          {/* Player Avatars */}
          {registeredPlayersAvatars[tournament.id] && registeredPlayersAvatars[tournament.id].length > 0 && (
            <div className="flex items-center -space-x-2 mb-4 flex-wrap">
              {registeredPlayersAvatars[tournament.id].slice(0, 20).map((player: any, idx: number) => (
                <Image
                  key={idx}
                  src={player.avatar ? `/avatars/${player.avatar}` : '/avatars/000.webp'}
                  alt={player.character_name}
                  width={24}
                  height={24}
                  className="rounded-full ring-2 ring-brand-charcoal"
                />
              ))}
              {tournament.registeredPlayersCount > 20 && (
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-brand-gold/80 text-xs text-brand-charcoal ring-2 ring-brand-charcoal">+{tournament.registeredPlayersCount - 20}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4">
          <span className="text-sm font-semibold text-brand-gold">{tournament.registeredPlayersCount || 0} / {tournament.max_players} 人</span>
          {renderCardButton()}
        </div>
      </div>
    </Link>
  );
};


export default function Home() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [registeredPlayersAvatars, setRegisteredPlayersAvatars] = useState<{ [key: number]: any[] }>({});

  const fetchRegisteredPlayersAvatars = useCallback(async (tournamentId: number) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/registered-players-avatars?limit=20`);
      if (res.ok) {
        const avatars = await res.json();
        setRegisteredPlayersAvatars(prev => ({ ...prev, [tournamentId]: avatars }));
      }
    } catch (error) {
      console.error(`Error fetching registered players avatars for tournament ${tournamentId}:`, error);
    }
  }, []);

  const fetchTournaments = useCallback(async () => {
    try {
      const tournamentsRes = await fetch('/api/tournaments');
      const tournamentsData = await tournamentsRes.json();
      setTournaments(tournamentsData);
      tournamentsData.forEach((t: any) => fetchRegisteredPlayersAvatars(t.id));
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  }, [fetchRegisteredPlayersAvatars]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const categorizeTournaments = () => {
    const now = new Date();
    const ongoing: any[] = [];
    const openForRegistration: any[] = [];
    const registrationClosed: any[] = [];
    const finished: any[] = [];
    const failed: any[] = [];

    tournaments.forEach((tournament: any) => {
      const startTime = new Date(tournament.start_time);
      const registrationDeadline = new Date(tournament.registration_deadline);

      if (tournament.status === 'ongoing') ongoing.push(tournament);
      else if (tournament.status === 'finished') finished.push(tournament);
      else if (tournament.status === 'failed') failed.push(tournament);
      else if (now < registrationDeadline) openForRegistration.push(tournament);
      else if (now >= registrationDeadline && now < startTime) registrationClosed.push(tournament);
      else if (now >= startTime && (tournament.registeredPlayersCount || 0) >= tournament.min_players) ongoing.push(tournament);
      else failed.push(tournament);
    });

    return { ongoing, openForRegistration, registrationClosed, finished, failed };
  };

  const { ongoing, openForRegistration, registrationClosed, finished, failed } = categorizeTournaments();

  const renderSection = (title: string, tournaments: any[], statusConfig: any) => {
    if (tournaments.length === 0) return null;
    return (
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-brand-gold mb-6 border-b-2 border-brand-gold/30 pb-3">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(t => (
            <TournamentCard
              key={t.id}
              tournament={t}
              registeredPlayersAvatars={registeredPlayersAvatars}
              statusConfig={statusConfig}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-brand-charcoal text-brand-ivory">
      {/* Hero Section */}
      <div className="relative h-[45vh] min-h-[350px] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/default_cover.jpg" // Replace with a proper hero image
            alt="背景-水墨江湖"
            fill
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal via-transparent to-brand-charcoal/50"></div>
        </div>
        <div className="relative z-10 p-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight tracking-wider text-balance text-wrap">
            天地为炉，以身化剑
          </h1>
          <p className="text-lg md:text-xl text-brand-ivory/80 max-w-2xl mx-auto">
            旧的英雄，已随烽烟与传说远去；新的侠客面对浩瀚江湖，又将去向何处？
          </p>
          <div className="mt-8">
            <Link href="#tournaments" className="bg-brand-gold text-brand-charcoal font-bold py-3 px-8 rounded-lg text-lg hover:bg-opacity-90 transition-all duration-300 shadow-lg shadow-brand-gold/20">
                查看赛事
            </Link>
          </div>
        </div>
      </div>

      {/* Tournaments Section */}
      <div id="tournaments" className="container mx-auto px-4">
        {renderSection("⚔️ 激战正酣", ongoing, { color: 'brand-red', label: '进行中', status: 'ongoing' })}
        {renderSection("🔥 火热报名中", openForRegistration, { color: 'brand-gold', label: '报名中', status: 'openForRegistration' })}
        {renderSection("⏳ 报名已截止", registrationClosed, { color: 'gray', label: '即将开始', status: 'registrationClosed' })}
        {renderSection("🏆 比赛已结束", finished, { color: 'gray', label: '已结束', status: 'finished' })}
        {renderSection("💔 组织失败", failed, { color: 'gray', label: '已失败', status: 'failed' })}
      </div>

    </main>
  );
}
