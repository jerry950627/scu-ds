const express = require('express');
const path = require('path');
const router = express.Router();
// 已移除認證中間件的引用

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/pages/index.html'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/pages/index.html'));
});

const pages = [
  { path: '/dashboard', page: 'dashboard' },
  { path: '/finance', page: 'finance' },
  { path: '/secretary', page: 'secretary' },
  { path: '/activity', page: 'activity' },
  { path: '/design', page: 'design' },
  { path: '/pr', page: 'pr' },
  { path: '/history', page: 'history' }
];

// 批量註冊頁面路由，無需認證
pages.forEach(({ path: routePath, page }) => {
  router.get(routePath, (req, res) => {
    res.sendFile(path.join(__dirname, `../../public/pages/${page}.html`));
  });
});

router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/pages/admin.html'));
});

// API 路由註冊
const { requireAuth, requireAdmin, rateLimit } = require('../../middleware/auth');
const activityRoutes = require('../activity.routes');
const financeRoutes = require('../finance.routes');
const secretaryRoutes = require('../secretary.routes');
const designRoutes = require('../design.routes');
const prRoutes = require('../pr.routes');
const historyRoutes = require('../history.routes');
const adminRoutes = require('../admin.routes');

// 應用速率限制
router.use(rateLimit);

// 註冊各模組的 API 路由（需要認證）
router.use('/activity', requireAuth, activityRoutes);
router.use('/finance', requireAuth, financeRoutes);
router.use('/secretary', requireAuth, secretaryRoutes);
router.use('/design', requireAuth, designRoutes);
router.use('/pr', requireAuth, prRoutes);
router.use('/history', requireAuth, historyRoutes);
router.use('/admin', requireAdmin, adminRoutes);

module.exports = router;
