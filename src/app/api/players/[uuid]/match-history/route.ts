import { NextResponse } from 'next/server';
const { db, query } = require('@/database.js');

export async function GET(request: Request, { params }: { params: { uuid: string } }) {
  try {
    const { uuid } = params;

    if (!uuid) {
      return NextResponse.json({ message: 'UUID is required' }, { status: 400 });
    }

    const user = await query('SELECT id FROM Users WHERE uuid = ?', [uuid]);

    if (user.length === 0) {
      return NextResponse.json({ message: 'Player not found' }, { status: 404 });
    }

    const userId = user[0].id;

    const matchHistoryRaw: any[] = await new Promise((resolve, reject) => {
      db.all(
        `SELECT
           R.id AS registration_id,
           R.registration_time,
           R.status AS registration_status,
           T.id AS tournament_id,
           T.name AS tournament_name,
           T.start_time,
           T.registration_deadline,
           T.status AS tournament_status,
           T.cover_image_url,
           U.character_name AS organizer_name,
           M.id AS match_id,
           M.round_number,
           M.player1_id,
           M.player2_id,
           M.winner_id,
           M.status AS match_status,
           M.finished_at,
           P1.character_name AS player1_name,
           P1.avatar AS player1_avatar,
           P1.uuid AS player1_uuid,
           P2.character_name AS player2_name,
           P2.avatar AS player2_avatar,
           P2.uuid AS player2_uuid,
           PW.character_name AS winner_name,
           PW.avatar AS winner_avatar
         FROM Registrations R
         JOIN Tournaments T ON R.tournament_id = T.id
         JOIN Users U ON T.organizer_id = U.id
         LEFT JOIN Matches M ON M.tournament_id = T.id AND (M.player1_id = R.player_id OR M.player2_id = R.player_id)
         LEFT JOIN Users P1 ON M.player1_id = P1.id
         LEFT JOIN Users P2 ON M.player2_id = P2.id
         LEFT JOIN Users PW ON M.winner_id = PW.id
         WHERE R.player_id = ?
         ORDER BY R.registration_time DESC, M.round_number ASC, M.id ASC`,
        [userId],
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });

    // Process raw data to group matches under tournaments
    const matchHistory: any[] = [];
    const tournamentMap = new Map();

    for (const row of matchHistoryRaw) {
      if (!tournamentMap.has(row.tournament_id)) {
        const tournamentEntry = {
          registration_id: row.registration_id,
          registration_time: row.registration_time,
          registration_status: row.registration_status,
          tournament_id: row.tournament_id,
          tournament_name: row.tournament_name,
          start_time: row.start_time,
          registration_deadline: row.registration_deadline,
          tournament_status: row.tournament_status,
          cover_image_url: row.cover_image_url,
          organizer_name: row.organizer_name,
          matches: [],
          awards: [] // This will be populated next
        };
        matchHistory.push(tournamentEntry);
        tournamentMap.set(row.tournament_id, tournamentEntry);
      }

      const currentTournament = tournamentMap.get(row.tournament_id);

      if (row.match_id && !currentTournament.matches.some((m: any) => m.match_id === row.match_id)) {
        currentTournament.matches.push({
          match_id: row.match_id,
          round_number: row.round_number,
          player1_id: row.player1_id,
          player2_id: row.player2_id,
          winner_id: row.winner_id,
          match_status: row.match_status,
          finished_at: row.finished_at,
          player1_name: row.player1_name,
          player1_avatar: row.player1_avatar,
          player1_uuid: row.player1_uuid, // Include player1_uuid
          player2_name: row.player2_name,
          player2_avatar: row.player2_avatar,
          player2_uuid: row.player2_uuid, // Include player2_uuid
          winner_name: row.winner_name,
          winner_avatar: row.winner_avatar,
        });
      }
    }

    // Fetch awards for each tournament
    for (const tournament of matchHistory) {
      const awards: any[] = await query(
        `SELECT P.name AS prize_name, P.description AS prize_description, P.image_url AS prize_image_url, PA.awarded_at
         FROM PlayerAwards PA
         JOIN Prizes P ON PA.prize_id = P.id
         WHERE PA.tournament_id = ? AND PA.player_id = ?`,
        [tournament.tournament_id, userId]
      );
      tournament.awards = awards;
    }

    return NextResponse.json(matchHistory);
  } catch (error: any) {
    console.error('Error fetching match history:', error);
    return NextResponse.json({ message: error.message || '获取比赛记录失败' }, { status: 500 });
  }
}
