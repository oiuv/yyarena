const fetch = require('node-fetch').default;

async function registerPlayer(gameId, characterName) {
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        game_id: gameId,
        character_name: characterName,
        role: 'player',
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log(`成功注册玩家: ${characterName} (Game ID: ${gameId})`);
    } else {
      console.error(`注册玩家失败: ${characterName} (Game ID: ${gameId}) - ${data.message}`);
    }
  } catch (error) {
    console.error(`注册玩家时发生网络错误: ${characterName} (Game ID: ${gameId}) - ${error.message}`);
  }
}

async function registerTestPlayers(count) {
  for (let i = 1; i <= count; i++) {
    const gameId = `10000000${String(i).padStart(2, '0')}`;
    const characterName = `测试玩家${i}号`;
    await registerPlayer(gameId, characterName);
  }
}

// 注册 20 个测试玩家
registerTestPlayers(20);
