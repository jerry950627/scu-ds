const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// 數據庫配置
const config = {
    dbPath: process.env.DB_PATH || path.join(__dirname, 'scu_ds.db'),
    bcryptRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
};

// 創建數據庫連接
class Database {
    constructor() {
        this.db = null;
        this.isConnected = false;
    }

    // 連接數據庫
    async connect() {
        if (this.isConnected) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(config.dbPath, (err) => {
                if (err) {
                    console.error('❌ 數據庫連接失敗:', err);
                    reject(err);
                } else {
                    console.log('✅ 數據庫連接成功:', config.dbPath);
                    this.isConnected = true;
                    
                    // 啟用外鍵約束
                    this.db.run('PRAGMA foreign_keys = ON');
                    
                    resolve(this.db);
                }
            });
        });
    }

    // 執行 SQL 語句
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // 查詢單行
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 查詢多行
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 關閉數據庫連接
    async close() {
        if (!this.isConnected) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ 關閉數據庫時發生錯誤:', err);
                    reject(err);
                } else {
                    console.log('✅ 數據庫連接已關閉');
                    this.isConnected = false;
                    resolve();
                }
            });
        });
    }

    // 初始化數據庫表
    async initializeTables() {
        console.log('📋 開始初始化數據庫表...');
        
        const tables = [
            // 用戶表
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // 部門表
            `CREATE TABLE IF NOT EXISTS departments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // 用戶部門關聯表
            `CREATE TABLE IF NOT EXISTS user_departments (
                user_id INTEGER,
                department_id INTEGER,
                role TEXT DEFAULT 'member',
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, department_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
            )`,
            
            // 注意：財務記錄表、會議記錄表和活動記錄表已在 init.sql 中定義
            // 這裡不再重複定義以避免衝突
            
            // 設計作品表
            `CREATE TABLE IF NOT EXISTS design_works (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                type TEXT NOT NULL,
                description TEXT,
                file_path TEXT NOT NULL,
                thumbnail_path TEXT,
                tags TEXT,
                status TEXT DEFAULT 'draft',
                designer_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (designer_id) REFERENCES users(id)
            )`,
            
            // 公關宣傳表
            `CREATE TABLE IF NOT EXISTS pr_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                type TEXT NOT NULL,
                target_audience TEXT,
                platforms TEXT,
                budget DECIMAL(10,2),
                start_date DATE,
                end_date DATE,
                status TEXT DEFAULT 'planning',
                metrics TEXT,
                materials TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )`,
            
            // 系統日誌表
            `CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                description TEXT,
                ip_address TEXT,
                user_agent TEXT,
                data TEXT,
                module TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`,
            
            // 通知表
            `CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT,
                link TEXT,
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                read_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`
        ];

        // 創建索引
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
            // 注意：finance_records 和 event_plans 表的索引已在 init.sql 中定義
            // 這裡只創建 db.js 中定義的表的索引
            'CREATE INDEX IF NOT EXISTS idx_system_logs_user ON system_logs(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(created_at)'
        ];

        // 執行建表語句
        for (const sql of tables) {
            try {
                await this.run(sql);
                const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
                console.log(`  ✓ 表 ${tableName} 已創建或已存在`);
            } catch (error) {
                console.error(`  ✗ 創建表失敗:`, error);
                throw error;
            }
        }

        // 創建索引
        for (const sql of indexes) {
            try {
                await this.run(sql);
                const indexName = sql.match(/CREATE INDEX IF NOT EXISTS (\w+)/)[1];
                console.log(`  ✓ 索引 ${indexName} 已創建或已存在`);
            } catch (error) {
                console.error(`  ✗ 創建索引失敗:`, error);
            }
        }

        console.log('✅ 數據庫表初始化完成');
    }

    // 初始化默認數據
    async initializeDefaultData() {
        console.log('📝 開始初始化默認數據...');
        
        try {
            // 檢查是否已有用戶
            const userCount = await this.get('SELECT COUNT(*) as count FROM users');
            
            if (userCount.count === 0) {
                console.log('  創建默認用戶...');
                
                // 默認用戶
                const defaultUsers = [
                    { username: 'admin', password: 'admin123', role: 'admin' },
                    { username: 'jerry', password: 'jerry123', role: 'user' },
                    { username: 'scuds', password: 'scuds123', role: 'admin' }
                ];
                
                for (const user of defaultUsers) {
                    const hashedPassword = await bcrypt.hash(user.password, config.bcryptRounds);
                    await this.run(
                        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                        [user.username, hashedPassword, user.role]
                    );
                    console.log(`    ✓ 用戶 ${user.username} 已創建`);
                }
            }
            
            // 檢查是否已有部門
            const deptCount = await this.get('SELECT COUNT(*) as count FROM departments');
            
            if (deptCount.count === 0) {
                console.log('  創建默認部門...');
                
                const departments = [
                    { name: '會長室', description: '負責統籌系學會所有事務' },
                    { name: '副會長室', description: '協助會長處理系學會事務' },
                    { name: '秘書處', description: '負責會議記錄、文書處理等行政事務' },
                    { name: '財務部', description: '負責系學會財務管理、預算編列與執行' },
                    { name: '活動部', description: '負責籌辦各項活動' },
                    { name: '公關部', description: '負責對外聯繫、贊助洽談等事務' },
                    { name: '設計部', description: '負責活動海報、網站視覺設計等' },
                    { name: '資訊部', description: '負責系統維護、網站管理等技術支援' }
                ];
                
                for (const dept of departments) {
                    await this.run(
                        'INSERT INTO departments (name, description) VALUES (?, ?)',
                        [dept.name, dept.description]
                    );
                    console.log(`    ✓ 部門 ${dept.name} 已創建`);
                }
            }
            
            console.log('✅ 默認數據初始化完成');
            
        } catch (error) {
            console.error('❌ 初始化默認數據失敗:', error);
            throw error;
        }
    }

    // 執行事務
    async transaction(callback) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    callback()
                        .then(result => {
                            this.db.run('COMMIT', (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(result);
                                }
                            });
                        })
                        .catch(error => {
                            this.db.run('ROLLBACK', () => {
                                reject(error);
                            });
                        });
                });
            });
        });
    }


}

// 創建單例實例
const database = new Database();

// 初始化函數
async function initializeDatabase() {
    try {
        console.log('🚀 開始初始化數據庫...');
        
        // 連接數據庫
        await database.connect();
        
        // 初始化表結構
        await database.initializeTables();
        
        // 初始化默認數據
        await database.initializeDefaultData();
        
        // 設置全局數據庫實例
        global.db = database;
        
        console.log('✅ 數據庫初始化完成');
        
        return database;
    } catch (error) {
        console.error('❌ 數據庫初始化失敗:', error);
        throw error;
    }
}

// 導出
module.exports = {
    database,
    initializeDatabase,
    Database
};