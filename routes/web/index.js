/**
 * Web 頁面路由配置
 * 統一管理所有頁面路由，提供認證保護
 */

const express = require('express');
const path = require('path');
const { requireAuth, requireAdmin, redirectIfAuthenticated } = require('../../middleware/auth');
const router = express.Router();

// 主頁路由
router.get('/', (req, res) => {
    // 如果已登入，重定向到儀表板
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, '../../public/pages/index.html'));
});

// 登入頁面
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/pages/index.html'));
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
authenticatedPages.forEach(({ path: routePath, page }) => {
    router.get(routePath, requireAuth, (req, res) => {
        res.sendFile(path.join(__dirname, `../../public/pages/${page}.html`));
    });
});

// 管理員頁面
router.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/pages/admin.html'));
});

// 新增成員頁面 (僅管理員可訪問)
router.get('/add-member', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/pages/add-member.html'));
});

module.exports = router;