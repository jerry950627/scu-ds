const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { promisify } = require('util');

// 確保數據庫目錄存在
const dbDir = path.dirname(__filename);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(path.join(__dirname, 'scu_ds.db'));

// Promise化數據庫方法
db.get = promisify(db.get.bind(db));
db.all = promisify(db.all.bind(db));

// 自定義 Promise 化的 run 方法，確保返回正確的結果
const originalRun = db.run.bind(db);
db.run = function(sql, params) {
  return new Promise((resolve, reject) => {
    originalRun(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          lastID: this.lastID,
          changes: this.changes
        });
      }
    });
  });
};

db.serialize(() => {
  // 創建用戶表 - 統一使用role欄位
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullname TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 添加遷移邏輯 - 檢查並添加 role 欄位（修正為同步化操作）
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (!err && columns) {
      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('role')) {
        console.log('添加 role 欄位到 users 表');
        db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", (err) => {
          if (err) return console.error('新增 role 欄位失敗:', err);
          
          // 如果有 isAdmin 欄位，遷移數據到 role 欄位
          if (columnNames.includes('isAdmin')) {
            console.log('遷移 isAdmin 數據到 role 欄位');
            db.run("UPDATE users SET role = 'admin' WHERE isAdmin = 1", (err) => {
              if (err) console.error('遷移 admin 用戶失敗:', err);
              
              db.run("UPDATE users SET role = 'user' WHERE isAdmin = 0 OR isAdmin IS NULL", (err) => {
                if (err) console.error('遷移 user 用戶失敗:', err);
                else console.log('用戶角色遷移完成');
              });
            });
          }
        });
      }
    }
  });

  // 創建部門表
  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 創建用戶部門關聯表
  db.run(`CREATE TABLE IF NOT EXISTS user_departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    departmentId INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    year INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (departmentId) REFERENCES departments(id)
  )`);

  // 創建財務表
  db.run(`CREATE TABLE IF NOT EXISTS finances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    receipt TEXT,
    created_by INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // 創建財務記錄表 - 與init.sql保持一致
  db.run(`CREATE TABLE IF NOT EXISTS finance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(50),
    date DATE NOT NULL,
    receipt_url VARCHAR(255),
    created_by INTEGER,
    approved_by INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  )`);

  // 創建會議記錄表 - 與init.sql保持一致
  db.run(`CREATE TABLE IF NOT EXISTS meeting_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_type VARCHAR(50),
    location VARCHAR(200),
    attendees TEXT,
    agenda TEXT,
    minutes TEXT,
    decisions TEXT,
    action_items TEXT,
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // 會議記錄表結構已統一，無需遷移

  // 創建活動詳情表 - 與init.sql保持一致
  db.run(`CREATE TABLE IF NOT EXISTS activity_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_plan_id INTEGER,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    file_size INTEGER,
    order_index INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_plan_id) REFERENCES event_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // 活動詳情表結構已統一，無需遷移

  // 創建設計作品表
  db.run(`CREATE TABLE IF NOT EXISTS design_works (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    file_path TEXT,
    file_name TEXT,
    vendor_id INTEGER,
    rating REAL,
    price REAL,
    vendor_name TEXT,
    created_by INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
  )`);

  // 設計作品表結構已統一，無需遷移

  // 創建公關廠商表
  db.run(`CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    category TEXT,
    description TEXT,
    cooperated INTEGER DEFAULT 0,
    logo TEXT,
    created_by INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  )`);

  // 創建公關活動表
  db.run(`CREATE TABLE IF NOT EXISTS pr_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    vendor_id INTEGER,
    budget REAL,
    actual_cost REAL,
    status TEXT DEFAULT 'planned',
    notes TEXT,
    created_by INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
  )`);

  // 創建活動企劃表 - 與init.sql保持一致
  db.run(`CREATE TABLE IF NOT EXISTS event_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE,
    location VARCHAR(200),
    budget DECIMAL(10,2),
    participant_limit INTEGER,
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    file_size INTEGER,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'completed')),
    created_by INTEGER,
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  )`);

  // 創建活動計劃表
  db.run(`CREATE TABLE IF NOT EXISTS activity_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    location TEXT,
    budget REAL,
    status TEXT DEFAULT 'planning',
    created_by INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // 創建活動詳情表 - 與init.sql保持一致
  db.run(`CREATE TABLE IF NOT EXISTS activity_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_plan_id INTEGER,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    file_size INTEGER,
    order_index INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_plan_id) REFERENCES event_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // 活動詳情表結構已統一，無需額外遷移

  // 創建歷史記錄表 - 修正外鍵定義
  db.run(`CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    old_data TEXT,
    new_data TEXT,
    user_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // 插入預設部門
  const departments = [
    ['活動部', '負責規劃和執行各種學生活動'],
    ['公關部', '負責對外聯絡和合作事務'],
    ['美宣部', '負責視覺設計和宣傳工作'],
    ['秘書部', '負責會議記錄和文書處理'],
    ['財務部', '負責財務管理和預算控制']
  ];

  departments.forEach(async ([name, description]) => {
    try {
      await db.run(
        'INSERT OR IGNORE INTO departments (name, description) VALUES (?, ?)',
        [name, description]
      );
    } catch (error) {
      console.error('創建預設部門失敗:', error);
    }
  });

  // 創建預設管理員帳號 - 修正非同步問題
  const defaultUsers = [
    {
      username: 'admin',
      password: 'admin123',
      fullname: '系統管理員',
      role: 'admin'
    },
    {
      username: 'jerry',
      password: 'jerry123',
      fullname: 'Jerry 管理員',
      role: 'admin'
    },
    {
      username: 'scuds',
      password: '13173149',
      fullname: '東吳大學資料科學系學生會',
      role: 'admin'
    },
    {
      username: 'scuds13173149',
      password: '5028',
      fullname: '東吳大學資料科學系學生會管理員',
      role: 'admin'
    }
  ];

  // 改進的用戶創建過程 - 使用Promise確保完成
  async function createDefaultUsers() {
    console.log('開始創建預設用戶...');
    
    for (const user of defaultUsers) {
      try {
        // 檢查用戶是否已存在
        const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [user.username]);
        if (existingUser) {
          console.log(`用戶 ${user.username} 已存在，跳過創建`);
          continue;
        }
        
        // 加密密碼
        const hash = await new Promise((resolve, reject) => {
          bcrypt.hash(user.password, 10, (err, hash) => {
            if (err) reject(err);
            else resolve(hash);
          });
        });
        
        // 創建用戶
        await db.run(
          'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
          [user.username, hash, user.fullname, user.role]
        );
        
        console.log(`✅ 預設用戶 ${user.username} 創建成功`);
      } catch (error) {
        console.error(`❌ 創建用戶 ${user.username} 失敗:`, error);
      }
    }
    
    console.log('✅ 預設用戶創建程序完成');
  }
  
  // 執行用戶創建
  createDefaultUsers().catch(err => {
    console.error('用戶創建過程發生錯誤:', err);
  });
  
  console.log('預設用戶創建程序已啟動');
});

module.exports = db;

// === 可選：偵錯用，列出 meeting_records 表格結構與資料 === 
async function checkMeetingRecords() { 
  try { 
    const tableInfo = await db.all("PRAGMA table_info(meeting_records)"); 
    console.log('meeting_records 欄位:', tableInfo.map(row => row.name)); 
    console.log('完整欄位信息:', tableInfo);

    const sampleData = await db.all("SELECT * FROM meeting_records LIMIT 5"); 
    console.log('資料範例:', JSON.stringify(sampleData, null, 2)); 

    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'"); 
    console.log('所有資料表:', tables.map(t => t.name)); 
  } catch (error) { 
    console.error('檢查資料庫時發生錯誤:', error); 
  } 
} 

// 若要使用，取消以下註解執行 
// checkMeetingRecords();