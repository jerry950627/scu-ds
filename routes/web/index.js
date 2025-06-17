/**
 * Web 頁面路由配置
 * 統一管理所有頁面路由，消除重複代碼
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin, redirectIfAuthenticated } = require('../../middleware/auth');
const { renderPageByName } = require('../../utils/renderHelper');

// 主頁路由
router.get('/', redirectIfAuthenticated, (req, res) => {
    renderPageByName(res, 'login', { error: null });
});

// 登入頁面
router.get('/login', redirectIfAuthenticated, (req, res) => {
    renderPageByName(res, 'login', { error: null });
});

// 需要認證的頁面路由配置
const authenticatedPages = [
    { path: '/dashboard', page: 'dashboard' },
    { path: '/finance', page: 'finance' },
    { path: '/secretary', page: 'secretary' },
    { path: '/activity', page: 'activity' },
    { path: '/design', page: 'design' },
    { path: '/pr', page: 'pr' },
    { path: '/history', page: 'history' }
];

// 批量註冊需要認證的頁面路由
authenticatedPages.forEach(({ path, page }) => {
    router.get(path, requireAuth, (req, res) => {
        renderPageByName(res, page);
    });
});

// 管理員頁面（需要管理員權限）
router.get('/admin', requireAdmin, (req, res) => {
    renderPageByName(res, 'admin');
});

module.exports = router;