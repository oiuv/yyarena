
const fetch = require('node-fetch').default;
const FormData = require('form-data');

// --- 固定的50名玩家数据池 ---
const PLAYER_POOL = [
  { game_id: '1000000001', character_name: '楚风雪' },
  { game_id: '1000000002', character_name: '猫步香水' },
  { game_id: '1000000003', character_name: '周红线' },
  { game_id: '1000000004', character_name: '寒香寻' },
  { game_id: '1000000005', character_name: '江晏' },
  { game_id: '1000000006', character_name: '褚清泉' },
  { game_id: '1000000007', character_name: '小十七' },
  { game_id: '1000000008', character_name: '陈子奚' },
  { game_id: '1000000009', character_name: '千夜' },
  { game_id: '1000000010', character_name: '盈盈' },
  { game_id: '1000000011', character_name: '叶万山' },
  { game_id: '1000000012', character_name: '时一墨' },
  { game_id: '1000000013', character_name: '伊刀' },
  { game_id: '1000000014', character_name: '道主' },
  { game_id: '1000000015', character_name: '无相皇' },
  { game_id: '1000000016', character_name: '仇越海' },
  { game_id: '1000000017', character_name: '寻心' },
  { game_id: '1000000018', character_name: '唐新词' },
  { game_id: '1000000019', character_name: '贺万春' },
  { game_id: '1000000020', character_name: '柳青衣' },
  { game_id: '1000000021', character_name: '皮影师' },
  { game_id: '1000000022', character_name: '田英' },
  { game_id: '1000000023', character_name: '河伯' },
  { game_id: '1000000024', character_name: '东阙公子' },
  { game_id: '1000000025', character_name: '黑财神' },
  { game_id: '1000000026', character_name: '容鸢' },
  { game_id: '1000000027', character_name: '寄棺主' },
  { game_id: '1000000028', character_name: '阿依奴' },
  { game_id: '1000000029', character_name: '周蔷' },
  { game_id: '1000000030', character_name: '秦弱兰' },
  { game_id: '1000000031', character_name: '曹敬观音' },
  { game_id: '1000000032', character_name: '张议潮' },
  { game_id: '1000000033', character_name: '朱邪骨勒' },
  { game_id: '1000000034', character_name: '望月婵媛' },
  { game_id: '1000000035', character_name: '醉拳客' },
  { game_id: '1000000036', character_name: '魏芷昔' },
  { game_id: '1000000037', character_name: '赵承宗' },
  { game_id: '1000000038', character_name: '睡道人' },
  { game_id: '1000000039', character_name: '舞狮兄弟' },
  { game_id: '1000000040', character_name: '冯如之' },
  { game_id: '1000000041', character_name: '郑鄂' },
  { game_id: '1000000042', character_name: '无名将军' },
  { game_id: '1000000043', character_name: '鬼公子' },
  { game_id: '1000000044', character_name: '蛇郎中' },
  { game_id: '1000000045', character_name: '缺口袋把戏团' },
  { game_id: '1000000046', character_name: '舞马人' },
  { game_id: '1000000047', character_name: '白狼主' },
  { game_id: '1000000048', character_name: '郭昕将军' },
  { game_id: '1000000049', character_name: '煞地神' },
  { game_id: '1000000050', character_name: '黎蓁蓁' },
].map((player, index) => ({
  ...player,
  avatar: `${(index + 1).toString().padStart(3, '0')}.png`,
}));

// 辅助函数：解析命令行参数
function getArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const parts = arg.substring(2).split('=');
      const key = parts[0];
      const value = parts.length > 1 ? parts[1] : true; // If no '=', set to true
      args[key] = value;
    }
  });
  return args;
}

function displayHelp() {
  console.log('\n用法: node comprehensiveTest.js [选项]');
  console.log('模拟比赛创建、玩家注册和比赛进程。');
  console.log('\n选项:');
  console.log('  --players=<数量>    要注册的玩家数量 (默认: 10, 最大: 50)');
  console.log('  --min=<数量>        比赛所需的最少玩家数量 (默认: 10)');
  console.log('  --max=<数量>        比赛所需的最大玩家数量 (默认: 48)');
  console.log('  --start             自动启动比赛 (默认: false)');
  console.log('  --win               自动设置比赛获胜者 (默认: false, 仅在自动启动比赛时有效)');
  console.log('  --help              显示此帮助信息');
  console.log('\n示例:');
  console.log('  node comprehensiveTest.js --players=20');
  console.log('  node comprehensiveTest.js --players=30 --min=15 --max=30');
  process.exit(0);
}

// --- API 辅助函数 ---

async function registerOrLoginOrganizer(username, password = '123456') {

  const organizerData = {
    username,
    password,
    game_id: '1234567890', // 固定测试主办方ID
    character_name: '燕子',
    role: 'organizer',
    stream_url: 'https://v.douyin.com/aEtLhQOXrV8/', // 新增主播主页地址
  };

  // 尝试登录
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const loginData = await loginResponse.json();
    if (loginResponse.ok) {
      console.log(`主办方账号 '${username}' 登录成功。`);
      return loginData.token;
    } else if (loginData.message && loginData.message.includes('不存在') || loginData.message.includes('密码不正确')) {
      console.log(`主办方账号 '${username}' 登录失败: ${loginData.message}。尝试注册...`);
    } else {
      console.error(`主办方账号 '${username}' 登录时发生未知错误: ${loginData.message}`);
      return null;
    }
  } catch (e) {
    console.error(`尝试登录主办方账号 '${username}' 时发生网络错误: ${e.message}。尝试注册...`);
  }

  // 登录失败则尝试注册
  try {
    const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(organizerData),
    });
    const registerData = await registerResponse.json();
    if (registerResponse.ok) {
      console.log(`主办方账号 '${username}' 注册并登录成功。`);
      return registerData.token;
    } else {
      console.error(`主办方账号 '${username}' 注册失败: ${registerData.message}`);
      return null;
    }
  } catch (error) {
    console.error('主办方注册时发生网络错误:', error.message);
    return null;
  }
}

async function createTournament(token, { minPlayers, maxPlayers }) {
  const formData = new FormData();
  formData.append('name', `燕云武道大会 - ${new Date().toLocaleDateString()}`);
  formData.append('start_time', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString());
  formData.append('registration_deadline', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  formData.append('min_players', minPlayers);
  formData.append('max_players', maxPlayers);
  formData.append('event_description', `这是一场自动化测试比赛，需要 ${minPlayers} 至 ${maxPlayers} 名玩家。`);

  try {
    const response = await fetch('http://localhost:3000/api/tournaments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`创建比赛失败: ${errorText}`);
    }
    const data = await response.json();
    console.log(`成功创建比赛: ${data.name} (ID: ${data.id})`);
    return data.id;
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

async function ensurePlayerExists(player) {
    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...player, role: 'player', avatar: player.avatar }),
        });
        const data = await response.json();
        if (!response.ok && !data.message.includes('已存在')) {
             console.log(`注册玩家 ${player.character_name} 失败: ${data.message}`);
        }
    } catch (e) { /* 忽略网络等错误 */ }
}

async function loginPlayer(gameId) {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game_id: gameId }),
        });
        if (!response.ok) throw new Error('登录失败');
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
            if (tokenMatch && tokenMatch[1]) {
                return tokenMatch[1];
            }
        }
        throw new Error('未找到Token');
    } catch (error) {
        console.error(`登录玩家ID ${gameId} 失败:`, error.message);
        return null;
    }
}

async function registerPlayerForTournament(token, tournamentId, characterName) {
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
      console.error(`玩家 ${characterName} 报名比赛 (ID: ${tournamentId}) 失败: ${data.message}`);
    } else {
      console.log(`玩家 ${characterName} 成功报名比赛 (ID: ${tournamentId})。`);
    }
  } catch (error) {
    console.error(`报名比赛时出错:`, error.message);
  }
}

async function startTournament(token, tournamentId) {
  console.log(`\n尝试启动比赛 (ID: ${tournamentId})...`);
  try {
    const response = await fetch(`http://localhost:3000/api/tournaments/${tournamentId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        room_name: '测试砺兵台',
        room_number: '1234567890',
        room_password: '1234',
        livestream_url: 'https://live.douyin.com/244993118346'
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error(`启动比赛失败: ${data.message}`);
      return false;
    } else {
      console.log(`比赛 (ID: ${tournamentId}) 成功启动。`);
      return true;
    }
  } catch (error) {
    console.error(`启动比赛时出错:`, error.message);
    return false;
  }
}

async function getTournamentMatches(tournamentId) {
  try {
    const response = await fetch(`http://localhost:3000/api/tournaments/${tournamentId}/matches`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`获取比赛对阵信息失败: ${errorText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

async function setMatchWinner(token, matchId, winnerId) {
  try {
    const response = await fetch(`http://localhost:3000/api/matches/${matchId}/winner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ winner_id: winnerId, match_format: '1局1胜' }), // Added match_format
    });
    const data = await response.json();
    if (!response.ok) {
      console.error(`设置对阵 (ID: ${matchId}) 获胜者失败: ${data.message || JSON.stringify(data)}`);
      return false;
    } else {
      console.log(`对阵 (ID: ${matchId}) 获胜者设置为 ${winnerId}。`);
      return true;
    }
  } catch (error) {
    console.error(`设置获胜者时出错:`, error.message);
    return false;
  }
}

// --- 测试执行主逻辑 ---

async function runTest() {
  const args = getArgs();

  if (args.help) {
    displayHelp();
    return; 
  }

  const numPlayers = parseInt(args.players || '10', 10);
  const minPlayers = parseInt(args.min || '10', 10);
  const maxPlayers = parseInt(args.max || '48', 10);
  const autoStartTournament = args['start'] === true;
  const autoSetWinners = args['win'] === true;

  console.log('--- 开始综合性自动化测试 ---');
  console.log('调试信息: args =', args);
  console.log('调试信息: autoStartTournament =', autoStartTournament);
  console.log(`测试场景: 为一个需要 ${minPlayers}-${maxPlayers} 人的比赛注册 ${numPlayers} 名玩家。`);
  console.log('------------------------------------');

  // 1. 确保所有基础玩家都已注册
  console.log('正在检查并注册50名基础玩家...');
  for (const player of PLAYER_POOL) {
      await ensurePlayerExists(player);
  }
  console.log('基础玩家池准备就绪。');

  // 2. 设置主办方
  const organizerToken = await registerOrLoginOrganizer('test'); // 使用默认密码
  if (!organizerToken) {
    console.error('无法设置主办方账号，测试中止。');
    return;
  }

  // 3. 创建比赛
  const tournamentId = await createTournament(organizerToken, { minPlayers, maxPlayers });
  if (!tournamentId) {
    console.error('无法创建比赛，测试中止。');
    return;
  }

  // 4. 从玩家池中随机选择玩家并报名
  console.log(`正在从 ${PLAYER_POOL.length} 名玩家中随机选择 ${numPlayers} 名...`);
  const shuffledPlayers = [...PLAYER_POOL].sort(() => 0.5 - Math.random());
  const selectedPlayers = shuffledPlayers.slice(0, numPlayers);

  console.log('开始为选定玩家报名...');
  for (let i = 0; i < selectedPlayers.length; i++) {
    const player = selectedPlayers[i];
    console.log(`\n处理第 ${i + 1}/${numPlayers} 位玩家 (角色名: ${player.character_name}, ID: ${player.game_id})`);

    const playerToken = await loginPlayer(player.game_id);
    if (playerToken) {
      await registerPlayerForTournament(playerToken, tournamentId, player.character_name);
    } else {
      console.log(`因登录失败，跳过为玩家 ${player.character_name} 报名比赛。`);
    }
  }

  // 5. 启动比赛 (可选)
  if (autoStartTournament) {
    const tournamentStarted = await startTournament(organizerToken, tournamentId);
    if (!tournamentStarted) {
      console.error('无法启动比赛，测试中止。');
      return;
    }

    // 6. 模拟比赛进程：设置第一轮的获胜者 (可选，仅在自动启动比赛时有效)
    if (autoSetWinners) {
      console.log('\n开始模拟比赛进程...');
      let currentMatches = await getTournamentMatches(tournamentId);
      if (currentMatches && currentMatches.length > 0) {
        const firstRoundMatches = currentMatches.filter(match => match.round_number === 1);
        console.log(`发现 ${firstRoundMatches.length} 场第一轮对阵。`);

        for (const match of firstRoundMatches) {
          if (match.player1_id && match.player2_id) {
            // 随机选择一个获胜者
            const winnerId = Math.random() > 0.5 ? match.player1_id : match.player2_id;
            await setMatchWinner(organizerToken, match.id, winnerId);
          } else if (match.player1_id) {
            // 只有player1，则player1获胜 (另一方弃权)
            await setMatchWinner(organizerToken, match.id, match.player1_id);
          } else if (match.player2_id) {
            // 只有player2，则player2获胜 (另一方弃权)
            await setMatchWinner(organizerToken, match.id, match.player2_id);
          } else {
            console.log(`对阵 (ID: ${match.id}) 双方均未到场或已弃权，跳过设置获胜者。`);
          }
        }
      } else {
        console.log('未找到任何对阵信息。');
      }
    }
  } else {
    console.log('\n根据参数设置，跳过自动启动比赛和设置获胜者。');
    console.log('如需启用，请使用 --start 和 --win 参数。');
  }

  console.log('------------------------------------');
  console.log('--- 综合性自动化测试完成 ---');
}

runTest();
