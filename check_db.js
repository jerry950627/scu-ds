const fs = require('fs');
const path = require('path');

// 檢查資料庫檔案是否存在
const dbPath = './database/scu_ds.db';
console.log('🔍 檢查資料庫檔案...');

if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`✅ 資料庫檔案存在: ${dbPath}`);
    console.log(`   檔案大小: ${stats.size} bytes`);
    console.log(`   修改時間: ${stats.mtime}`);
} else {
    console.log(`❌ 資料庫檔案不存在: ${dbPath}`);
}

// 嘗試使用 DatabaseHelper
console.log('\n🔍 嘗試使用 DatabaseHelper...');
try {
    const DatabaseHelper = require('./utils/dbHelper');
    
    // 檢查全域資料庫是否存在
    if (global.db) {
        console.log('✅ 全域資料庫已初始化');
        
        // 嘗試查詢用戶
        DatabaseHelper.all('SELECT username, role, full_name, is_active FROM users LIMIT 5')
            .then(users => {
                console.log('\n📋 用戶列表:');
                users.forEach(user => {
                    console.log(`  - ${user.username} (${user.role}) - ${user.full_name || user.name} - 啟用: ${user.is_active}`);
                });
                
                // 查詢 admin 用戶
                return DatabaseHelper.get('SELECT * FROM users WHERE username = ?', ['admin']);
            })
            .then(admin => {
                if (admin) {
                    console.log('\n🔍 找到 Admin 用戶:');
                    console.log(`  ID: ${admin.id}`);
                    console.log(`  用戶名: ${admin.username}`);
                    console.log(`  角色: ${admin.role}`);
                    console.log(`  姓名: ${admin.full_name || admin.name}`);
                    console.log(`  啟用: ${admin.is_active}`);
                } else {
                    console.log('\n❌ Admin 用戶不存在');
                }
            })
            .catch(error => {
                console.error('❌ 查詢失敗:', error.message);
            });
    } else {
        console.log('❌ 全域資料庫未初始化');
        
        // 嘗試初始化資料庫
        console.log('🔄 嘗試初始化資料庫...');
        const { initializeDatabase } = require('./database/init');
        initializeDatabase()
            .then(() => {
                console.log('✅ 資料庫初始化完成，重新檢查...');
                return DatabaseHelper.all('SELECT username, role, full_name, is_active FROM users LIMIT 5');
            })
            .then(users => {
                console.log('\n📋 用戶列表:');
                users.forEach(user => {
                    console.log(`  - ${user.username} (${user.role}) - ${user.full_name || user.name} - 啟用: ${user.is_active}`);
                });
            })
            .catch(error => {
                console.error('❌ 初始化失敗:', error.message);
            });
    }
} catch (error) {
    console.error('❌ DatabaseHelper 錯誤:', error.message);
} 