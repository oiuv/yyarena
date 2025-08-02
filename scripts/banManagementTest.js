const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// 数据库路径
const dbPath = path.join(process.cwd(), 'database.db');
const db = new sqlite3.Database(dbPath);

// 检查管理员是否存在
async function ensureAdminExists() {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM Users WHERE role = ?', ['admin'], (err, row) => {
      if (err) return reject(err);
      
      if (!row) {
        // 创建管理员用户
        const adminData = {
          username: 'system_admin',
          password: bcrypt.hashSync('system_admin', 10),
          game_id: '0000000000',
          character_name: '系统管理员',
          role: 'admin'
        };
        
        db.run(
          'INSERT INTO Users (username, password, game_id, character_name, role) VALUES (?, ?, ?, ?, ?)',
          [adminData.username, adminData.password, adminData.game_id, adminData.character_name, adminData.role],
          function(err) {
            if (err) return reject(err);
            console.log('✅ 创建系统管理员用户');
            resolve(this.lastID);
          }
        );
      } else {
        resolve(row.id);
      }
    });
  });
}

// 通过game_id获取用户ID
async function getUserIdByGameId(gameId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM Users WHERE game_id = ?', [gameId], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error(`未找到game_id为 ${gameId} 的用户`));
      resolve(row.id);
    });
  });
}

// 检查用户是否被封禁
async function isUserBanned(userId) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT * FROM UserBans 
      WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY banned_at DESC LIMIT 1
    `, [userId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// 封禁用户
async function banUser(userId, adminId, reason = '测试封禁') {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO UserBans (user_id, reason, banned_by) VALUES (?, ?, ?)',
      [userId, reason, adminId],
      function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

// 解封用户
async function unbanUser(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE UserBans SET expires_at = datetime("now") WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime("now"))',
      [userId],
      function(err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
}

// 获取用户信息
async function getUserInfo(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT game_id, character_name, role FROM Users WHERE id = ?', [userId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// 显示封禁列表
async function showBanList() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT u.game_id, u.character_name, u.role, ub.reason, ub.banned_at, ub.expires_at
      FROM Users u
      JOIN UserBans ub ON u.id = ub.user_id
      WHERE ub.expires_at IS NULL OR ub.expires_at > datetime('now')
      ORDER BY ub.banned_at DESC
    `, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const gameId = args[1];

  if (!command || (command !== 'list' && !gameId)) {
    console.log('\n📋 封禁管理测试脚本');
    console.log('使用方法:');
    console.log('  node scripts/banManagementTest.js ban <game_id> [reason]    # 封禁用户，可选填写理由');
    console.log('  node scripts/banManagementTest.js unban <game_id>           # 解封用户');
    console.log('  node scripts/banManagementTest.js list                      # 查看封禁列表');
    console.log('\n示例:');
    console.log('  node scripts/banManagementTest.js ban 1234567890');
    console.log('  node scripts/banManagementTest.js ban 1234567890 恶意报名');
    console.log('  node scripts/banManagementTest.js unban 1234567890');
    process.exit(1);
  }

  try {
    console.log('🔧 初始化系统...');
    const adminId = await ensureAdminExists();
    
    if (command === 'list') {
      console.log('\n📊 当前封禁列表:');
      const bans = await showBanList();
      if (bans.length === 0) {
        console.log('  暂无封禁用户');
      } else {
        bans.forEach((ban, index) => {
          console.log(`  ${index + 1}. ${ban.character_name || ban.game_id} (${ban.role})`);
          console.log(`     原因: ${ban.reason}`);
          console.log(`     时间: ${new Date(ban.banned_at).toLocaleString('zh-CN')}`);
          console.log(`     状态: ${ban.expires_at ? '已解封' : '封禁中'}`);
          console.log('');
        });
      }
      return;
    }

    const userId = await getUserIdByGameId(gameId);
    const userInfo = await getUserInfo(userId);
    
    console.log(`👤 找到用户: ${userInfo.character_name || gameId} (${userInfo.role})`);

    if (command === 'ban') {
      const existingBan = await isUserBanned(userId);
      if (existingBan) {
        console.log('⚠️  用户已处于封禁状态');
        console.log(`   原因: ${existingBan.reason}`);
        console.log(`   时间: ${new Date(existingBan.banned_at).toLocaleString('zh-CN')}`);
        return;
      }

      // 获取封禁理由
      const reason = args[2] || '管理员测试封禁';
      const banId = await banUser(userId, adminId, reason);
      console.log(`✅ 封禁成功！记录ID: ${banId}`);
      console.log(`   原因: ${reason}`);
      
    } else if (command === 'unban') {
      const existingBan = await isUserBanned(userId);
      if (!existingBan) {
        console.log('⚠️  用户当前未被封禁');
        return;
      }

      const changes = await unbanUser(userId);
      if (changes > 0) {
        console.log('✅ 解封成功！');
      } else {
        console.log('⚠️  解封失败，用户可能已解封');
      }
    }

  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  } finally {
    db.close();
  }
}

// 运行主程序
main().catch(console.error);