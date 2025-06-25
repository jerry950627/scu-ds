/**
 * 創建 pr_vendors 表的腳本
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || './database/scu_ds.db';
const sqlPath = path.join(__dirname, 'create_pr_vendors.sql');

async function createVendorsTable() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ 連接資料庫失敗:', err.message);
                reject(err);
                return;
            }
            console.log('✅ 已連接到資料庫');
        });

        // 讀取 SQL 文件
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // 分割 SQL 語句
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        let completed = 0;
        const total = statements.length;
        
        statements.forEach((statement, index) => {
            db.run(statement.trim(), (err) => {
                if (err) {
                    console.error(`❌ 執行 SQL 語句 ${index + 1} 失敗:`, err.message);
                    console.error('SQL:', statement.trim());
                } else {
                    console.log(`✅ 執行 SQL 語句 ${index + 1} 成功`);
                }
                
                completed++;
                if (completed === total) {
                    db.close((err) => {
                        if (err) {
                            console.error('❌ 關閉資料庫失敗:', err.message);
                            reject(err);
                        } else {
                            console.log('✅ pr_vendors 表創建完成！');
                            resolve();
                        }
                    });
                }
            });
        });
    });
}

// 執行腳本
if (require.main === module) {
    createVendorsTable()
        .then(() => {
            console.log('🎉 所有操作完成！');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 操作失敗:', error);
            process.exit(1);
        });
}

module.exports = createVendorsTable;