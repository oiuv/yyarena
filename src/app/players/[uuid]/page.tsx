import PlayerProfile from '@/components/PlayerProfile';

export default function PublicPlayerProfilePage({
  params,
}: { params: { uuid: string } }) {
  return <PlayerProfile playerUuid={params.uuid} />;
}
