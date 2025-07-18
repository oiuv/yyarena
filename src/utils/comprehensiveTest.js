
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
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      args[key.substring(2)] = value;
    }
  });
  return args;
}

// --- API 辅助函数 ---

async function registerOrLoginOrganizer(username, password) {
  // 尝试登录
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log(`主办方账号 '${username}' 登录成功。`);
      return loginData.token;
    }
  } catch (e) { /* 忽略登录错误，继续尝试注册 */ }

  // 登录失败则尝试注册
  try {
    const organizerData = {
      username,
      password,
      game_id: '1234567890', // 固定测试主办方ID
      character_name: '燕子',
      role: 'organizer',
      stream_url: 'https://v.douyin.com/aEtLhQOXrV8/', // 新增主播主页地址
    };
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
      // 如果是因为用户已存在而失败，则尝试直接登录
      if (registerData.message && registerData.message.includes('已存在')) {
        return registerOrLoginOrganizer(username, password);
      }
      throw new Error(registerData.message || '主办方注册失败');
    }
  } catch (error) {
    console.error('主办方设置时出错:', error.message);
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

// --- 测试执行主逻辑 ---

async function runTest() {
  const args = getArgs();
  const numPlayers = parseInt(args.players || '10', 10);
  const minPlayers = parseInt(args.min || '10', 10);
  const maxPlayers = parseInt(args.max || '48', 10);

  console.log('--- 开始综合性自动化测试 ---');
  console.log(`测试场景: 为一个需要 ${minPlayers}-${maxPlayers} 人的比赛注册 ${numPlayers} 名玩家。`);
  console.log('------------------------------------');

  // 1. 确保所有基础玩家都已注册
  console.log('正在检查并注册50名基础玩家...');
  for (const player of PLAYER_POOL) {
      await ensurePlayerExists(player);
  }
  console.log('基础玩家池准备就绪。');

  // 2. 设置主办方
  const organizerToken = await registerOrLoginOrganizer('test', 'test');
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

  console.log('------------------------------------');
  console.log('--- 综合性自动化测试完成 ---');
}

runTest();
