/**
 * 優雅關閉工具
 * 統一管理應用關閉邏輯
 */

const db = require('../database/db');

/**
 * 優雅關閉處理
 * @param {Object} server HTTP 服務器實例
 */
function gracefulShutdown(server) {
    // SIGINT 信號處理（Ctrl+C）
    process.on('SIGINT', () => {
        console.log('\n🛑 收到 SIGINT 信號，正在優雅關閉服務器...');
        shutdown(server, 'SIGINT');
    });
    
    // SIGTERM 信號處理（系統終止）
    process.on('SIGTERM', () => {
        console.log('\n🛑 收到 SIGTERM 信號，正在優雅關閉服務器...');
        shutdown(server, 'SIGTERM');
    });
    
    // 未捕獲的異常處理
    process.on('uncaughtException', (error) => {
        console.error('❌ 未捕獲的異常:', error);
        shutdown(server, 'uncaughtException', 1);
    });
    
    // 未處理的 Promise 拒絕
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ 未處理的 Promise 拒絕:', reason);
        console.error('Promise:', promise);
        shutdown(server, 'unhandledRejection', 1);
    });
}

/**
 * 執行關閉流程
 * @param {Object} server HTTP 服務器實例
 * @param {string} signal 信號類型
 * @param {number} exitCode 退出碼
 */
function shutdown(server, signal, exitCode = 0) {
    console.log(`📝 關閉原因: ${signal}`);
    
    // 設置關閉超時
    const shutdownTimeout = setTimeout(() => {
        console.error('⏰ 關閉超時，強制退出');
        process.exit(1);
    }, 10000); // 10秒超時
    
    // 關閉 HTTP 服務器
    if (server) {
        server.close((err) => {
            if (err) {
                console.error('❌ 關閉 HTTP 服務器時發生錯誤:', err);
            } else {
                console.log('✅ HTTP 服務器已關閉');
            }
            
            // 關閉資料庫連接
            closeDatabase(() => {
                clearTimeout(shutdownTimeout);
                console.log('🎯 服務器已完全關閉');
                process.exit(exitCode);
            });
        });
    } else {
        // 如果沒有服務器實例，直接關閉資料庫
        closeDatabase(() => {
            clearTimeout(shutdownTimeout);
            console.log('🎯 應用已完全關閉');
            process.exit(exitCode);
        });
    }
}

/**
 * 關閉資料庫連接
 * @param {Function} callback 回調函數
 */
function closeDatabase(callback) {
    if (db && db.close) {
        db.close((err) => {
            if (err) {
                console.error('❌ 關閉資料庫時發生錯誤:', err.message);
            } else {
                console.log('✅ 資料庫連接已關閉');
            }
            callback();
        });
    } else {
        console.log('ℹ️  無需關閉資料庫連接');
        callback();
    }
}

module.exports = {
    gracefulShutdown,
    shutdown,
    closeDatabase
};