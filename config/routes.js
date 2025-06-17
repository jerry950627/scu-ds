/**
 * 路由配置文件
 * 統一管理應用的路由設置
 */

const GlobalErrorHandler = require('../middleware/globalErrorHandler');

/**
 * 設置應用路由
 * @param {Express} app Express 應用實例
 */
function setupRoutes(app) {
    console.log('🛣️  正在配置路由...');
    
    try {
        // API 路由（統一前綴 /api）
        const apiRoutes = require('../routes/api');
        app.use('/api', apiRoutes);
        console.log('✅ API 路由配置完成');
        
        // Web 頁面路由
        const webRoutes = require('../routes/web');
        app.use('/', webRoutes);
        console.log('✅ Web 路由配置完成');
        
    } catch (error) {
        console.error('❌ 路由配置失敗:', error.message);
        console.error('Stack trace:', error.stack);
        console.log('⚠️  繼續使用部分功能...');
    }
    
    // 404 錯誤處理
    app.use(GlobalErrorHandler.handle404);
    
    // 全局錯誤處理中間件
    app.use(GlobalErrorHandler.handleError);
    
    console.log('✅ 路由配置完成');
}

module.exports = setupRoutes;