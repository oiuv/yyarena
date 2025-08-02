import { query } from '@/database.mjs';

export async function isUserBanned(userId) {
  try {
    const bans = await query(`
      SELECT * FROM UserBans 
      WHERE user_id = ? 
      AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY banned_at DESC 
      LIMIT 1
    `, [userId]);
    
    return bans.length > 0 ? bans[0] : null;
  } catch (error) {
    console.error('Error checking user ban status:', error);
    return null;
  }
}

export async function getBannedUsers() {
  try {
    const bannedUsers = await query(`
      SELECT u.id, u.username, u.game_id, u.character_name, u.role, 
             ub.reason, ub.banned_at, ub.expires_at,
             admin.username as banned_by_username
      FROM Users u
      JOIN UserBans ub ON u.id = ub.user_id
      JOIN Users admin ON ub.banned_by = admin.id
      WHERE ub.expires_at IS NULL OR ub.expires_at > datetime('now')
      ORDER BY ub.banned_at DESC
    `);
    
    return bannedUsers;
  } catch (error) {
    console.error('Error getting banned users:', error);
    return [];
  }
}