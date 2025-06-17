/**
 * 錯誤處理配置文件
 * 統一管理應用的錯誤處理邏輯
 */

const GlobalErrorHandler = require('../middleware/globalErrorHandler');

/**
 * 設置錯誤處理
 * @param {Express} app Express 應用實例
 */
function setupErrorHandling(app) {
    console.log('🛡️  正在配置錯誤處理...');
    
    // 設置程序異常處理
    GlobalErrorHandler.setupProcessHandlers();
    
    console.log('✅ 錯誤處理配置完成');
}

module.exports = setupErrorHandling;