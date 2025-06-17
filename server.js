// 載入環境變數
require('dotenv').config();

const express = require('express');
const path = require('path');

// 引入配置和中間件
const config = require('./config/app');
const setupMiddleware = require('./config/middleware');
const setupRoutes = require('./config/routes');
const setupErrorHandling = require('./config/errorHandling');
const { initializeDirectories } = require('./utils/fileSystem');
const { gracefulShutdown } = require('./utils/gracefulShutdown');

// 創建 Express 應用
const app = express();
const PORT = config.app.port;

// 初始化系統
async function initializeApp() {
    try {
        console.log('🚀 開始初始化應用...');
        
        // 0. 驗證環境配置
        const configValidation = require('./config/index').validateAllConfigs();
        if (!configValidation.valid) {
            console.error('❌ 配置驗證失敗:');
            configValidation.errors.forEach(error => console.error(`  - ${error}`));
            if (process.env.NODE_ENV === 'production') {
                process.exit(1);
            }
        }
        if (configValidation.warnings.length > 0) {
            console.warn('⚠️ 配置警告:');
            configValidation.warnings.forEach(warning => console.warn(`  - ${warning}`));
        }
        
        // 1. 初始化目錄結構
        console.log('📁 初始化目錄結構...');
        initializeDirectories(__dirname);
        
        // 2. 設置中間件
        console.log('⚙️ 設置中間件...');
        setupMiddleware(app);
        
        // 3. 設置路由
        console.log('🛣️ 設置路由...');
        setupRoutes(app);
        
        // 4. 設置錯誤處理
        console.log('🛡️ 設置錯誤處理...');
        setupErrorHandling(app);
        
        console.log('✅ 應用初始化完成');
        
    } catch (error) {
        console.error('❌ 應用初始化失敗:', error);
        console.error('錯誤堆疊:', error.stack);
        process.exit(1);
    }
}

// 啟動服務器
async function startServer() {
    await initializeApp();
    
    const server = app.listen(PORT, () => {
        console.log(`\n🚀 ${config.app.name}`);
        console.log(`📍 服務器運行在: http://localhost:${PORT}`);
        console.log(`🕐 啟動時間: ${new Date().toLocaleString('zh-TW')}`);
        console.log(`📁 工作目錄: ${__dirname}`);
        console.log(`🔧 Node.js 版本: ${process.version}`);
        console.log(`💾 環境: ${config.app.env}`);
        console.log('\n系統已準備就緒，可以開始使用！\n');
    });
    
    // 設置優雅關閉
    gracefulShutdown(server);
}

// 啟動應用
if (require.main === module) {
    startServer().catch(console.error);
}

module.exports = app;