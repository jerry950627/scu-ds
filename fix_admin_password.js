const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'scu_ds.db');

async function fixAdminPassword() {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);
    
    try {
        console.log('🔧 修正 admin 用戶密碼...');
        
        // 生成正確的密碼雜湊
        const passwordHash = await bcrypt.hash('admin123', 12);
        console.log(`新的密碼雜湊: ${passwordHash.substring(0, 30)}...`);
        
        // 更新 admin 用戶密碼
        db.run(
            'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE username = ?',
            [passwordHash, 'admin'],
            function(err) {
                if (err) {
                    console.error('❌ 更新密碼失敗:', err.message);
                } else {
                    console.log(`✅ Admin 用戶密碼已更新 (影響 ${this.changes} 行)`);
                    
                    // 驗證更新
                    db.get('SELECT username, password_hash FROM users WHERE username = ?', ['admin'], async (err, user) => {
                        if (err) {
                            console.error('❌ 驗證失敗:', err.message);
                        } else if (user) {
                            console.log('🔍 驗證密碼更新...');
                            const isValid = await bcrypt.compare('admin123', user.password_hash);
                            console.log(`密碼 'admin123' 驗證: ${isValid ? '✅ 正確' : '❌ 錯誤'}`);
                        }
                        
                        db.close();
                        console.log('✅ 完成');
                    });
                }
            }
        );
        
    } catch (error) {
        console.error('❌ 執行失敗:', error.message);
        db.close();
    }
}

fixAdminPassword(); 