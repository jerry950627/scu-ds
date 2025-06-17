/**
 * 認證路由
 * 處理用戶認證相關的所有路由
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validateLogin, validateUser, validatePasswordReset } = require('../middleware/validation');
const { singleUpload } = require('../utils/uploadConfig');

// 用戶登入
router.post('/login', 
    validateLogin,
    AuthController.login
);

// 用戶登出
router.post('/logout', 
    requireAuth,
    AuthController.logout
);

// 用戶註冊（如果開放註冊）
router.post('/register', 
    validateUser,
    AuthController.register
);

// 獲取當前用戶信息
router.get('/me', 
    requireAuth,
    AuthController.getCurrentUser
);

// 檢查登入狀態
router.get('/check', 
    AuthController.checkAuth
);

// 更新用戶資料
router.put('/profile', 
    requireAuth,
    singleUpload('IMAGE', 'avatar'),
    AuthController.updateProfile
);

// 修改密碼
router.put('/password', 
    requireAuth,
    validatePasswordReset,
    AuthController.changePassword
);

// 忘記密碼 - 發送重置郵件
router.post('/forgot-password', 
    AuthController.forgotPassword
);

// 重置密碼
router.post('/reset-password', 
    validatePasswordReset,
    AuthController.resetPassword
);

// 驗證重置令牌
router.get('/reset-password/:token', 
    AuthController.verifyResetToken
);

// 檢查用戶名是否可用
router.get('/check-username/:username', 
    AuthController.checkUsername
);

// 檢查電子郵件是否可用
router.get('/check-email/:email', 
    AuthController.checkEmail
);

// 刷新會話
router.post('/refresh', 
    requireAuth,
    AuthController.refreshSession
);

// 獲取用戶登入歷史
router.get('/login-history', 
    requireAuth,
    AuthController.getLoginHistory
);

// 終止其他會話
router.post('/terminate-sessions', 
    requireAuth,
    AuthController.terminateOtherSessions
);

// 啟用兩步驗證
router.post('/2fa/enable', 
    requireAuth,
    AuthController.enableTwoFactor
);

// 禁用兩步驗證
router.post('/2fa/disable', 
    requireAuth,
    AuthController.disableTwoFactor
);

// 驗證兩步驗證碼
router.post('/2fa/verify', 
    requireAuth,
    AuthController.verifyTwoFactor
);

module.exports = router;