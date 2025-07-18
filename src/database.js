const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE, -- For organizers
      password TEXT, -- For organizers
      game_id TEXT UNIQUE, -- For players
      character_name TEXT UNIQUE, -- For players
      phone_number TEXT, -- Optional for players
      role TEXT NOT NULL CHECK(role IN ('organizer', 'player')),
      stream_url TEXT, -- 主播直播间/主页地址，可选
      avatar TEXT DEFAULT '000.webp' -- Add avatar column with default value
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS Tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizer_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      registration_deadline TEXT NOT NULL, -- 报名截止时间
      min_players INTEGER NOT NULL,
      max_players INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'registration_closed', 'ongoing', 'finished', 'failed', 'extended_registration')) DEFAULT 'pending',
      prize_settings TEXT, -- JSON string for prize allocation
      event_description TEXT,
      wechat_qr_code_url TEXT, -- 存储图片URL，可选
      room_name TEXT,
      room_number TEXT,
      room_password TEXT,
      winner_id INTEGER,
      default_match_format TEXT,
      final_rankings TEXT, -- Add this line for final rankings
      cover_image_url TEXT, -- Add this line for tournament cover image
      FOREIGN KEY (organizer_id) REFERENCES Users(id),
      FOREIGN KEY (winner_id) REFERENCES Users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS Prizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT
    )
  `);

  const defaultPrizes = [
    { name: '八音窍', description: '' },
    { name: '2680长鸣珠时装', description: '' },
    { name: '1280长鸣珠时装/武学特效/坐骑', description: '' },
    { name: '980长鸣珠奇术特效', description: '' },
    { name: '680长鸣珠时装/武器外观/坐骑', description: '' },
    { name: '60长鸣珠时装/武器外观/坐骑', description: '' },
    { name: '128元典藏战令', description: '' },
    { name: '68元精英战令', description: '' },
    { name: '30元月卡', description: '' },
  ];

  defaultPrizes.forEach(prize => {
    db.run(
      'INSERT OR IGNORE INTO Prizes (name, description) VALUES (?, ?)',
      [prize.name, prize.description],
      function (err) {
        if (err) {
          console.error(`Error inserting default prize ${prize.name}:`, err);
        }
      }
    );
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS Registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      character_name TEXT NOT NULL,
      character_id TEXT NOT NULL,
      registration_time TEXT, -- Added registration_time
      status TEXT NOT NULL CHECK(status IN ('active', 'withdrawn', 'forfeited')) DEFAULT 'active',
      FOREIGN KEY (tournament_id) REFERENCES Tournaments(id),
      FOREIGN KEY (player_id) REFERENCES Users(id),
      UNIQUE (tournament_id, player_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS Matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      player1_id INTEGER,
      player2_id INTEGER,
      winner_id INTEGER,
      status TEXT NOT NULL CHECK(status IN ('pending', 'finished', 'forfeited')) DEFAULT 'pending',
      finished_at TEXT,
      match_format TEXT, -- Add this line for match format
      FOREIGN KEY (tournament_id) REFERENCES Tournaments(id),
      FOREIGN KEY (player1_id) REFERENCES Users(id),
      FOREIGN KEY (player2_id) REFERENCES Users(id),
      FOREIGN KEY (winner_id) REFERENCES Users(id)
    )
  `);
});

module.exports = db;
