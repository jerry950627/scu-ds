/**
 * 認證路由
 * 處理用戶登入、登出、註冊等認證相關功能
 */

const express = require('express');
const AuthController = require('../controllers/authController');
const { redirectIfAuthenticated, logActivity, rateLimit, requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// 應用速率限制
router.use(rateLimit(20, 15 * 60 * 1000)); // 15分鐘內最多20次請求

// 用戶登入
router.post('/login', 
    redirectIfAuthenticated,
    logActivity('LOGIN_ATTEMPT', 'AUTH'),
    AuthController.login
);

// 用戶登出
router.post('/logout', 
    logActivity('LOGOUT', 'AUTH'),
    AuthController.logout
);

// 檢查登入狀態
router.get('/check', AuthController.checkAuth);

// 用戶註冊（僅管理員可用）
router.post('/register',
    requireAdmin,
    logActivity('REGISTER_ATTEMPT', 'AUTH'),
    AuthController.register
);

// 修改密碼
router.post('/change-password',
    requireAuth,
    logActivity('CHANGE_PASSWORD', 'AUTH'),
    AuthController.changePassword
);

// 重設密碼（僅管理員可用）
router.post('/reset-password',
    requireAdmin,
    logActivity('RESET_PASSWORD', 'AUTH'),
    AuthController.resetPassword
);


module.exports = router;