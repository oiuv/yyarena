const fetch = require('node-fetch').default; // Ensure correct import for node-fetch

async function loginPlayer(gameId) {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ game_id: gameId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Login failed for ${gameId}: ${errorData.message}`);
    }

    // Extract token from 'set-cookie' header
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
      if (tokenMatch && tokenMatch[1]) {
        return tokenMatch[1];
      }
    }
    throw new Error('Token not found in login response');

  } catch (error) {
    console.error(`Error logging in player ${gameId}:`, error.message);
    return null;
  }
}

async function registerPlayerForTournament(token, tournamentId) {
  try {
    const response = await fetch('http://localhost:3000/api/registrations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tournamentId }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Registration failed for tournament ${tournamentId}: ${data.message}`);
    }
    console.log(`成功报名比赛 ${tournamentId}: ${data.message}`);
    return true;
  } catch (error) {
    console.error(`Error registering for tournament ${tournamentId}:`, error.message);
    return false;
  }
}

async function getAllPlayers() {
  // This is a simplified way to get players. In a real scenario, you might have an API endpoint for this.
  // For now, let's assume the game_ids are sequential from 1000000001 to 1000000020
  const players = [];
  for (let i = 1; i <= 20; i++) {
    players.push(`10000000${String(i).padStart(2, '0')}`);
  }
  return players;
}

async function getAvailableTournaments() {
  try {
    const response = await fetch('http://localhost:3000/api/tournaments');
    if (!response.ok) {
      const errorText = await response.text(); // Get raw text to debug
      console.error('Raw response for tournaments:', errorText);
      throw new Error(`Failed to fetch tournaments: ${response.status} ${response.statusText}`);
    }
    const tournaments = await response.json();
    // Filter for 'pending' or 'extended_registration' status
    const now = new Date();
    return tournaments.filter(t => {
      const registrationDeadline = new Date(t.registration_deadline);
      return now < registrationDeadline && (t.status === 'pending' || t.status === 'extended_registration');
    });
  } catch (error) {
    console.error('Error fetching available tournaments:', error.message);
    return [];
  }
}

async function autoRegister() {
  console.log('开始自动化报名...');

  const playersGameIds = await getAllPlayers();
  if (playersGameIds.length === 0) {
    console.log('没有找到测试玩家。请先运行 registerTestPlayers.js 脚本。');
    return;
  }

  const availableTournaments = await getAvailableTournaments();
  if (availableTournaments.length === 0) {
    console.log('没有找到可报名的比赛。请先创建比赛。');
    return;
  }

  // For simplicity, let's pick the first available tournament
  const targetTournament = availableTournaments[0];
  console.log(`将为所有玩家报名比赛: ${targetTournament.name} (ID: ${targetTournament.id})`);

  for (const gameId of playersGameIds) {
    console.log(`尝试登录玩家: ${gameId}`);
    const token = await loginPlayer(gameId);
    if (token) {
      console.log(`玩家 ${gameId} 登录成功，尝试报名比赛 ${targetTournament.id}`);
      await registerPlayerForTournament(token, targetTournament.id);
    } else {
      console.log(`玩家 ${gameId} 登录失败，跳过报名。`);
    }
  }
  console.log('自动化报名完成。');
}

autoRegister();
