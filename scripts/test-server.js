/**
 * 測試服務器啟動腳本
 * 用於驗證系統修正後是否正常工作
 */

require('dotenv').config();
const path = require('path');

// 設置環境變量
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || 3000;
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-key-for-development-only';

console.log('🔧 測試服務器啟動腳本');
console.log('================================');
console.log('環境變量檢查:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${process.env.PORT}`);
console.log(`- SESSION_SECRET: ${process.env.SESSION_SECRET ? '已設置' : '未設置'}`);
console.log('================================\n');

// 測試數據庫連接
async function testDatabase() {
    try {
        console.log('🗄️  測試數據庫連接...');
        const { initializeDatabase } = require('../database/db');
        await initializeDatabase();
        console.log('✅ 數據庫連接成功\n');
        return true;
    } catch (error) {
        console.error('❌ 數據庫連接失敗:', error.message);
        return false;
    }
}

// 測試路由配置
function testRoutes() {
    try {
        console.log('🛣️  測試路由配置...');
        require('../routes/routes');
        console.log('✅ 路由配置正確\n');
        return true;
    } catch (error) {
        console.error('❌ 路由配置錯誤:', error.message);
        return false;
    }
}

// 啟動服務器
async function startTestServer() {
    try {
        console.log('🚀 啟動測試服務器...');
        
        // 測試數據庫
        const dbOk = await testDatabase();
        if (!dbOk) {
            console.error('❌ 數據庫測試失敗，無法啟動服務器');
            process.exit(1);
        }
        
        // 測試路由
        const routesOk = testRoutes();
        if (!routesOk) {
            console.error('❌ 路由測試失敗，無法啟動服務器');
            process.exit(1);
        }
        
        // 啟動 Express 服務器
        require('../server');
        
    } catch (error) {
        console.error('❌ 測試服務器啟動失敗:', error);
        process.exit(1);
    }
}

// 處理未捕獲的異常
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕獲的異常:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未處理的 Promise 拒絕:', reason);
    process.exit(1);
});

// 啟動測試
startTestServer(); 