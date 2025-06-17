/**
 * API 路由統一入口
 * 統一管理所有 API 路由
 */

const express = require('express');
const router = express.Router();

// API 路由配置
const apiRoutes = [
    { path: '/auth', module: '../auth.routes' },
    { path: '/finance', module: '../finance.routes' },
    { path: '/secretary', module: '../secretary.routes' },
    { path: '/activities', module: '../activity.routes' },
    { path: '/design', module: '../design.routes' },
    { path: '/pr', module: '../pr.routes' },
    { path: '/admin', module: '../admin.routes' },
    { path: '/history', module: '../history.routes' }
];

// 批量註冊 API 路由
apiRoutes.forEach(({ path, module }) => {
    try {
        const routeModule = require(module);
        router.use(path, routeModule);
        console.log(`✅ API 路由已載入: /api${path}`);
    } catch (error) {
        console.error(`❌ 載入 API 路由失敗: /api${path}`, error.message);
    }
});

// API 根路徑信息
router.get('/', (req, res) => {
    res.json({
        message: '東吳大學資料科學系系學會管理系統 API',
        version: '1.0.0',
        endpoints: apiRoutes.map(route => `/api${route.path}`),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;