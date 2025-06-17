/**
 * 資料庫初始化腳本
 * 用於創建資料庫表格和插入初始資料
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

class DatabaseInitializer {
    constructor() {
        this.dbPath = process.env.DB_PATH || './database/scu_ds.db';
        this.sqlPath = path.join(__dirname, 'init.sql');
    }

    /**
     * 初始化資料庫
     */
    async initialize() {
        try {
            console.log('🚀 開始初始化資料庫...');
            
            // 確保資料庫目錄存在
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
                console.log(`📁 創建資料庫目錄: ${dbDir}`);
            }

            // 連接資料庫
            const db = await this.connectDatabase();
            
            // 執行 SQL 初始化腳本
            await this.executeSqlFile(db);
            
            // 創建預設用戶
            await this.createDefaultUsers(db);
            
            // 關閉資料庫連接
            await this.closeDatabase(db);
            
            console.log('✅ 資料庫初始化完成！');
            
        } catch (error) {
            console.error('❌ 資料庫初始化失敗:', error);
            process.exit(1);
        }
    }

    /**
     * 連接資料庫
     */
    connectDatabase() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`📊 已連接到資料庫: ${this.dbPath}`);
                    resolve(db);
                }
            });
        });
    }

    /**
     * 執行 SQL 檔案
     */
    async executeSqlFile(db) {
        try {
            const sqlContent = fs.readFileSync(this.sqlPath, 'utf8');
            const statements = sqlContent.split(';').filter(stmt => stmt.trim());
            
            console.log(`📝 執行 ${statements.length} 個 SQL 語句...`);
            
            for (const statement of statements) {
                if (statement.trim()) {
                    await this.runQuery(db, statement.trim());
                }
            }
            
            console.log('✅ SQL 腳本執行完成');
            
        } catch (error) {
            console.error('❌ 執行 SQL 腳本失敗:', error);
            throw error;
        }
    }

    /**
     * 執行單個 SQL 查詢
     */
    runQuery(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    /**
     * 創建預設用戶
     */
    async createDefaultUsers(db) {
        console.log('👥 創建預設用戶...');
        
        const defaultUsers = [
            {
                username: 'admin',
                password: 'admin123',
                email: 'admin@scu.edu.tw',
                role: 'admin',
                full_name: '系統管理員',
                student_id: 'ADMIN001'
            },
            {
                username: 'jerry',
                password: 'jerry123',
                email: 'jerry@scu.edu.tw',
                role: 'admin',
                full_name: 'Jerry',
                student_id: 'JERRY001'
            },
            {
                username: 'scuds',
                password: 'scuds123',
                email: 'scuds@scu.edu.tw',
                role: 'member',
                full_name: '東吳資科系學會',
                student_id: 'SCUDS001'
            },
            {
                username: 'scuds13173149',
                password: 'scuds13173149',
                email: 'scuds13173149@scu.edu.tw',
                role: 'member',
                full_name: '系學會成員',
                student_id: 'SCU13173149'
            }
        ];

        for (const user of defaultUsers) {
            try {
                // 檢查用戶是否已存在
                const existingUser = await this.getUser(db, user.username);
                
                if (existingUser) {
                    console.log(`⚠️  用戶 ${user.username} 已存在，跳過創建`);
                    continue;
                }

                // 加密密碼
                const hashedPassword = await bcrypt.hash(user.password, 10);
                
                // 插入用戶
                await this.runQuery(db, `
                    INSERT INTO users (username, password, email, role, full_name, student_id, department, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, '資料科學系', 1)
                `, [user.username, hashedPassword, user.email, user.role, user.full_name, user.student_id]);
                
                console.log(`✅ 創建用戶: ${user.username} (${user.role})`);
                
            } catch (error) {
                console.error(`❌ 創建用戶 ${user.username} 失敗:`, error.message);
            }
        }
    }

    /**
     * 獲取用戶
     */
    getUser(db, username) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * 關閉資料庫連接
     */
    closeDatabase(db) {
        return new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('📊 資料庫連接已關閉');
                    resolve();
                }
            });
        });
    }

    /**
     * 重置資料庫（危險操作）
     */
    async reset() {
        try {
            console.log('⚠️  警告：即將重置資料庫！');
            
            if (fs.existsSync(this.dbPath)) {
                fs.unlinkSync(this.dbPath);
                console.log('🗑️  已刪除現有資料庫檔案');
            }
            
            await this.initialize();
            
        } catch (error) {
            console.error('❌ 重置資料庫失敗:', error);
            throw error;
        }
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    const initializer = new DatabaseInitializer();
    
    // 檢查命令行參數
    const args = process.argv.slice(2);
    
    if (args.includes('--reset')) {
        console.log('🔄 重置模式');
        initializer.reset();
    } else {
        initializer.initialize();
    }
}

module.exports = DatabaseInitializer;