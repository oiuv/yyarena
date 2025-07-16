'use client';

import dynamicImport from 'next/dynamic';

const TournamentDetailsClient = dynamicImport(() => import('./TournamentDetailsClient'), { ssr: false });

export const dynamic = 'force-dynamic';

export default function TournamentDetailsPage() {
  return <TournamentDetailsClient />;
}