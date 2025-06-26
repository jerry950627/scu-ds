/**
 * 路由配置文件
 * 統一管理應用的路由設置
 */

const GlobalErrorHandler = require('../middleware/globalErrorHandler');
const path = require('path');

/**
 * 設置應用路由
 * @param {Express} app Express 應用實例
 */
function setupRoutes(app) {
    console.log('🔧 開始配置路由...');
    
    try {
        // 處理Chrome DevTools和其他well-known路徑
        app.get('/.well-known/*', (req, res) => {
            res.status(404).json({ error: 'Not Found' });
        });
        
        // 認證路由（掛載到 API 路徑下）
        try {
            const authRoutes = require('../routes/auth.routes');
            app.use('/api/auth', authRoutes);
            console.log('✅ 認證路由配置完成');
        } catch (error) {
            console.error('❌ 認證路由配置失敗:', error.message);
        }
        
        // API 路由配置
        console.log('📍 配置 API 路由...');
        try {
            const apiRoutes = require('./api');
            app.use('/api', apiRoutes);
            console.log('✅ API 路由配置成功');
        } catch (error) {
            console.error('❌ API 路由配置失敗:', error.message);
            // 繼續執行，不中斷整個應用
        }
        
        // 網頁路由配置
        console.log('📍 配置網頁路由...');
        try {
            const webRoutes = require('./web');
            app.use('/', webRoutes);
            console.log('✅ 網頁路由配置成功');
        } catch (error) {
            console.error('❌ 網頁路由配置失敗:', error.message);
            console.log('🔄 使用基本網頁路由...');
            
            // 基本路由
            app.get('/', (req, res) => {
                res.sendFile(path.join(__dirname, '../public/pages/index.html'));
            });
            
            app.get('/dashboard', (req, res) => {
                res.sendFile(path.join(__dirname, '../public/pages/dashboard.html'));
            });
            
            app.get('/error', (req, res) => {
                res.sendFile(path.join(__dirname, '../public/pages/error.html'));
            });
        }
        
    } catch (error) {
        console.error('❌ 路由配置失敗:', error);
        console.log('Stack trace:', error.stack);
        
        // 提供最基本的路由
        app.get('/', (req, res) => {
            res.send(`
                <html>
                    <head><title>東吳大學資料科學系學會管理系統</title></head>
                    <body>
                        <h1>系統暫時無法使用</h1>
                        <p>路由配置發生錯誤，請聯繫管理員</p>
                        <p>錯誤詳情: ${error.message}</p>
                    </body>
                </html>
            `);
        });
    }
    
    // 404 錯誤處理
    app.use(GlobalErrorHandler.handle404);
    
    // 全局錯誤處理中間件
    app.use(GlobalErrorHandler.handleError);
    
    console.log('✅ 路由配置完成');
}

module.exports = setupRoutes;