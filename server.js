// 載入環境變數
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { initializeDatabase } = require('./database/db.js');
const { UploadConfig } = require('./utils/uploadConfig');

// 創建 Express 應用
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 基本配置
const config = {
    app: {
        name: process.env.APP_NAME || '東吳大學資料科學系系學會管理系統',
        version: process.env.APP_VERSION || '1.0.0',
        port: PORT,
        env: NODE_ENV
    },
    session: {
        secret: process.env.SESSION_SECRET || 'your-default-secret-key',
        name: 'scu-ds-session',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'lax'
        }
    },
    upload: {
        maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024, // 10MB
        allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
            'image/jpeg', 'image/png', 'image/gif', 
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
    }
};

// 初始化目錄結構
async function initializeDirectories(basePath) {
    const directories = [
        'public/uploads',
        'public/uploads/receipts',
        'public/uploads/meetings',
        'public/uploads/activities',
        'public/uploads/designs',
        'public/uploads/pr',
        'database',
        'database/backups',
        'logs',
        'temp'
    ];

    console.log('📁 檢查並創建必要目錄...');
    
    for (const dir of directories) {
        const fullPath = path.join(basePath, dir);
        try {
            await fs.mkdir(fullPath, { recursive: true });
            console.log(`  ✓ ${dir}`);
        } catch (error) {
            if (error.code !== 'EEXIST') {
                console.error(`  ✗ ${dir}: ${error.message}`);
            }
        }
    }
}

// 設置中間件
function setupMiddleware(app) {
    const bodyParser = require('body-parser');
    const session = require('express-session');
    
    // Favicon 處理 - 防止404錯誤
    app.get('/favicon.ico', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/assets/images/ds.jpg'));
    });
    
    // 基本中間件
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    
    // Session 中間件
    app.use(session(config.session));
    
    // 靜態文件服務
    app.use(express.static(path.join(__dirname, 'public')));
    
    // 請求日誌中間件
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
        next();
    });
    
    console.log('✅ 中間件設置完成');
}

// 引入路由配置
const setupRoutes = require('./routes/routes');

// 健康檢查端點
function setupHealthCheck(app) {
    app.get('/health', (req, res) => {
        res.json({
            success: true,
            message: '服務運行正常',
            timestamp: new Date().toISOString(),
            status: 'healthy'
        });
    });

    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            message: '服務運行正常',
            timestamp: new Date().toISOString(),
            status: 'healthy'
        });
    });
}

// 優雅關閉
const gracefulShutdown = async (signal, server) => {
    console.log(`\n🔄 收到 ${signal} 信號，開始優雅關閉...`);
    
    // 設置強制關閉超時
    const forceShutdownTimeout = setTimeout(() => {
        console.log('⚠️ 優雅關閉超時，強制退出...');
        process.exit(1);
    }, 5000); // 5秒超時
    
    try {
        // 停止接受新的請求
        if (server && server.listening) {
            console.log('📡 停止接受新請求...');
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        console.error('❌ 關閉 HTTP 服務器時發生錯誤:', err);
                        reject(err);
                    } else {
                        console.log('✅ HTTP 服務器已關閉');
                        resolve();
                    }
                });
            });
        }

        // 關閉數據庫連接
        if (global.db && typeof global.db.close === 'function') {
            console.log('🗄️ 關閉數據庫連接...');
            try {
                await global.db.close();
                console.log('✅ 數據庫連接已關閉');
            } catch (dbError) {
                console.error('❌ 關閉數據庫時發生錯誤:', dbError);
            }
        }

        // 清理全局變量
        if (global.db) {
            global.db = null;
        }

        // 移除事件監聽器
        process.removeAllListeners('SIGTERM');
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('uncaughtException');
        process.removeAllListeners('unhandledRejection');

        // 清除超時
        clearTimeout(forceShutdownTimeout);

        console.log('🚀 應用程序已優雅關閉');
        process.exit(0);
    } catch (error) {
        console.error('❌ 優雅關閉過程中發生錯誤:', error);
        clearTimeout(forceShutdownTimeout);
        process.exit(1);
    }
};

// 驗證環境配置
function validateConfig() {
    const errors = [];
    const warnings = [];
    
    // 檢查必要的環境變量
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-super-secret-session-key-here-at-least-32-chars') {
        if (NODE_ENV === 'production') {
            errors.push('SESSION_SECRET 必須在生產環境中設置為安全的值');
        } else {
            warnings.push('SESSION_SECRET 使用默認值，請在生產環境中更改');
        }
    }
    
    // 檢查端口設置
    if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
        errors.push('PORT 必須是 1-65535 之間的有效端口號');
    }
    
    return { errors, warnings };
}

// 初始化應用
async function initializeApp() {
    try {
        console.log('🚀 開始初始化應用...');
        console.log(`📍 Node.js 版本: ${process.version}`);
        console.log(`📍 工作目錄: ${__dirname}`);
        console.log(`📍 環境: ${NODE_ENV}`);
        
        // 驗證配置
        const { errors, warnings } = validateConfig();
        
        if (errors.length > 0) {
            console.error('❌ 配置驗證失敗:');
            errors.forEach(error => console.error(`  - ${error}`));
            if (NODE_ENV === 'production') {
                process.exit(1);
            }
        }
        
        if (warnings.length > 0) {
            console.warn('⚠️ 配置警告:');
            warnings.forEach(warning => console.warn(`  - ${warning}`));
        }
        
        // 初始化目錄結構
        await initializeDirectories(__dirname);
        
        // 初始化數據庫
        console.log('🗄️ 初始化數據庫...');
        await initializeDatabase();
        
        // 設置中間件
        console.log('⚙️ 設置中間件...');
        setupMiddleware(app);
        
        // 設置健康檢查
        console.log('🏥 設置健康檢查...');
        setupHealthCheck(app);
        
        // 設置路由
        console.log('🛣️ 設置路由...');
        setupRoutes(app);
        
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
    
    let server;
    
    server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`🚀 ${config.app.name} v${config.app.version}`);
        console.log(`${'='.repeat(50)}`);
        console.log(`📍 本地訪問: http://localhost:${PORT}`);
        console.log(`📍 網絡訪問: http://${getNetworkIP()}:${PORT}`);
        console.log(`🕐 啟動時間: ${new Date().toLocaleString('zh-TW')}`);
        console.log(`💾 運行模式: ${NODE_ENV}`);
        console.log(`${'='.repeat(50)}\n`);
        
        if (NODE_ENV === 'development') {
            console.log('💡 提示: 正在開發模式下運行');
            console.log('   - 錯誤堆疊將會顯示');
            console.log('   - 自動重載功能已啟用（如果使用 nodemon）');
            console.log('   - 性能優化未啟用\n');
        }
    });
    
    // 設置優雅關閉處理器
    const handleShutdown = (signal) => {
        console.log(`🎯 信號處理器被觸發: ${signal}`);
        gracefulShutdown(signal, server);
    };
    
    // 確保只註冊一次監聽器
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    
    console.log('📋 註冊信號處理器...');
    
    // Windows 相容的信號處理
    if (process.platform === 'win32') {
        // Windows 下使用 readline 監聽 Ctrl+C
        const readline = require('readline');
        if (process.stdin.isTTY) {
            readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
        }
        
        process.on('SIGINT', () => {
            console.log('🔔 接收到 SIGINT 信號 (Ctrl+C)');
            handleShutdown('SIGINT');
        });
        
        // Windows 下的其他關閉事件
        process.on('SIGHUP', () => {
            console.log('🔔 接收到 SIGHUP 信號');
            handleShutdown('SIGHUP');
        });
        
        process.on('SIGTERM', () => {
            console.log('🔔 接收到 SIGTERM 信號');
            handleShutdown('SIGTERM');
        });
        
        console.log('✅ Windows 信號處理器註冊完成');
    } else {
        // Unix/Linux 系統的標準信號處理
        process.once('SIGTERM', () => {
            console.log('🔔 接收到 SIGTERM 信號');
            handleShutdown('SIGTERM');
        });
        process.once('SIGINT', () => {
            console.log('🔔 接收到 SIGINT 信號');
            handleShutdown('SIGINT');
        });
        
        console.log('✅ Unix 信號處理器註冊完成');
    }
    
    // 處理未捕獲的異常 - 不自動關閉服務器
    process.on('uncaughtException', (error) => {
        console.error('❌ 未捕獲的異常:', error);
        
        // 如果是端口佔用錯誤，則關閉服務器
        if (error.code === 'EADDRINUSE') {
            console.error('❌ 端口被佔用，請檢查是否有其他應用在使用端口 3000');
            handleShutdown('EADDRINUSE');
        } else {
            // 其他錯誤只記錄，不關閉服務器
            console.error('⚠️ 應用將繼續運行，但建議檢查錯誤原因');
        }
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ 未處理的 Promise 拒絕:', reason);
        console.error('⚠️ Promise:', promise);
        console.error('⚠️ 應用將繼續運行，但建議檢查錯誤原因');
    });
    
    return server;
}

// 獲取本機網絡 IP
function getNetworkIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// 啟動應用
if (require.main === module) {
    startServer().catch(error => {
        console.error('❌ 服務器啟動失敗:', error);
        process.exit(1);
    });
}

module.exports = app;