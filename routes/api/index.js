const express = require('express');
const router = express.Router();

// API 路由註冊
const { requireAuth, requireAdmin, rateLimit } = require('../../middleware/auth');

try {
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
  
  console.log('✅ API 路由配置成功');
} catch (error) {
  console.error('❌ API 路由配置失敗:', error.message);
  console.log('🔄 繼續使用基本功能...');
}

module.exports = router;
