/**
 * 管理員路由
 * 處理管理員相關的所有路由
 */

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateUser, validateId, validatePagination } = require('../middleware/validation');

// 所有管理員路由都需要管理員權限
router.use(requireAuth);
router.use(requireRole(['admin']));

// 用戶管理
// 獲取用戶列表
router.get('/users', 
    validatePagination,
    AdminController.getUsers
);

// 獲取單個用戶詳情
router.get('/users/:id', 
    validateId,
    AdminController.getUser
);

// 創建新用戶
router.post('/users', 
    validateUser,
    AdminController.createUser
);

// 更新用戶信息
router.put('/users/:id', 
    validateId,
    AdminController.updateUser
);

// 刪除用戶
router.delete('/users/:id', 
    validateId,
    AdminController.deleteUser
);

// 重置用戶密碼
router.post('/users/:id/reset-password', 
    validateId,
    AdminController.resetUserPassword
);

// 鎖定/解鎖用戶
router.post('/users/:id/toggle-lock', 
    validateId,
    AdminController.toggleUserLock
);

// 批量操作用戶
router.post('/users/batch', 
    AdminController.batchUserOperation
);

// 系統統計
// 獲取系統概覽統計
router.get('/stats/overview', 
    AdminController.getSystemStats
);

// 獲取用戶統計
router.get('/stats/users', 
    AdminController.getUserStats
);

// 獲取活動統計
router.get('/stats/activities', 
    AdminController.getActivityStats
);

// 獲取財務統計
router.get('/stats/finance', 
    AdminController.getFinanceStats
);

// 系統設定
// 獲取系統設定
router.get('/settings', 
    AdminController.getSystemSettings
);

// 更新系統設定
router.put('/settings', 
    AdminController.updateSystemSettings
);

// 獲取特定設定
router.get('/settings/:key', 
    AdminController.getSetting
);

// 更新特定設定
router.put('/settings/:key', 
    AdminController.updateSetting
);

// 日誌管理
// 獲取操作日誌
router.get('/logs/operations', 
    validatePagination,
    AdminController.getOperationLogs
);

// 獲取錯誤日誌
router.get('/logs/errors', 
    validatePagination,
    AdminController.getErrorLogs
);

// 獲取登入日誌
router.get('/logs/logins', 
    validatePagination,
    AdminController.getLoginLogs
);

// 清理舊日誌
router.delete('/logs/cleanup', 
    AdminController.cleanupLogs
);

// 數據庫管理
// 數據庫備份
router.post('/database/backup', 
    AdminController.backupDatabase
);

// 數據庫還原
router.post('/database/restore', 
    AdminController.restoreDatabase
);

// 獲取數據庫信息
router.get('/database/info', 
    AdminController.getDatabaseInfo
);

// 優化數據庫
router.post('/database/optimize', 
    AdminController.optimizeDatabase
);

// 文件管理
// 獲取文件列表
router.get('/files', 
    validatePagination,
    AdminController.getFiles
);

// 刪除文件
router.delete('/files', 
    AdminController.deleteFiles
);

// 清理臨時文件
router.delete('/files/temp', 
    AdminController.cleanupTempFiles
);

// 獲取存儲使用情況
router.get('/files/storage', 
    AdminController.getStorageUsage
);

// 系統維護
// 系統健康檢查
router.get('/health', 
    AdminController.healthCheck
);

// 清理緩存
router.delete('/cache', 
    AdminController.clearCache
);

// 重啟服務
router.post('/restart', 
    AdminController.restartService
);

// 獲取系統信息
router.get('/system-info', 
    AdminController.getSystemInfo
);

// 通知管理
// 發送系統通知
router.post('/notifications/broadcast', 
    AdminController.broadcastNotification
);

// 獲取通知列表
router.get('/notifications', 
    validatePagination,
    AdminController.getNotifications
);

// 刪除通知
router.delete('/notifications/:id', 
    validateId,
    AdminController.deleteNotification
);

module.exports = router;