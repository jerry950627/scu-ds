const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'scu_ds.db');
console.log(`🔍 連接資料庫: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ 資料庫連接失敗:', err.message);
        process.exit(1);
    }
    console.log('✅ 資料庫連接成功');
    
    // 檢查用戶表
    db.all('SELECT username, role, full_name, is_active FROM users ORDER BY id', (err, users) => {
        if (err) {
            console.error('❌ 查詢用戶失敗:', err.message);
            db.close();
            return;
        }
        
        console.log('\n📋 所有用戶列表:');
        if (users.length === 0) {
            console.log('  (沒有用戶)');
        } else {
            users.forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.username} (${user.role}) - ${user.full_name} - 啟用: ${user.is_active}`);
            });
        }
        
        // 特別檢查 admin 用戶
        db.get('SELECT * FROM users WHERE username = ?', ['admin'], async (err, admin) => {
            if (err) {
                console.error('❌ 查詢 admin 用戶失敗:', err.message);
                db.close();
                return;
            }
            
            if (admin) {
                console.log('\n🔍 Admin 用戶詳細資料:');
                console.log(`  ID: ${admin.id}`);
                console.log(`  用戶名: ${admin.username}`);
                console.log(`  角色: ${admin.role}`);
                console.log(`  姓名: ${admin.full_name}`);
                console.log(`  Email: ${admin.email || 'N/A'}`);
                console.log(`  啟用: ${admin.is_active}`);
                console.log(`  創建時間: ${admin.created_at}`);
                console.log(`  密碼雜湊: ${admin.password_hash ? admin.password_hash.substring(0, 30) + '...' : 'N/A'}`);
                
                // 測試密碼
                if (admin.password_hash) {
                    try {
                        const passwords = ['admin123', 'admin', 'password', '123456'];
                        console.log('\n🔐 測試密碼:');
                        
                        for (const pwd of passwords) {
                            const isValid = await bcrypt.compare(pwd, admin.password_hash);
                            console.log(`  '${pwd}': ${isValid ? '✅ 正確' : '❌ 錯誤'}`);
                        }
                    } catch (error) {
                        console.error('❌ 密碼驗證失敗:', error.message);
                    }
                }
            } else {
                console.log('\n❌ Admin 用戶不存在');
                
                // 檢查是否有其他管理員用戶
                db.all('SELECT username, role FROM users WHERE role = ?', ['admin'], (err, admins) => {
                    if (err) {
                        console.error('❌ 查詢管理員失敗:', err.message);
                    } else if (admins.length > 0) {
                        console.log('\n👥 找到其他管理員用戶:');
                        admins.forEach(admin => {
                            console.log(`  - ${admin.username} (${admin.role})`);
                        });
                    } else {
                        console.log('\n❌ 沒有找到任何管理員用戶');
                    }
                    db.close();
                });
                return;
            }
            
            db.close((err) => {
                if (err) {
                    console.error('❌ 關閉資料庫失敗:', err.message);
                } else {
                    console.log('\n✅ 資料庫已關閉');
                }
            });
        });
    });
}); 