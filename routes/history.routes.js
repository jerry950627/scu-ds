/**
 * 歷史記錄路由
 * 處理歷史記錄相關的所有路由
 */

const express = require('express');
const router = express.Router();
const HistoryController = require('../controllers/historyController');
const { requireRole, requireAdmin, logActivity } = require('../middleware/auth');
const { validateId, validatePagination, validateDateRange } = require('../middleware/validation');

// 操作歷史記錄
// 獲取操作歷史列表
router.get('/operations', 
    requireRole(['admin', 'secretary']),
    validatePagination,
    validateDateRange,
    HistoryController.getOperationHistory
);

// 獲取單個操作記錄詳情
router.get('/operations/:id', 
    requireRole(['admin', 'secretary']),
    validateId,
    HistoryController.getOperationRecord
);

// 記錄操作歷史（系統內部調用）
router.post('/operations', 
    requireRole(['admin']),
    logActivity('記錄操作歷史'),
    HistoryController.logOperation
);

// 批量刪除操作記錄
router.delete('/operations/batch', 
    requireRole(['admin']),
    logActivity('批量刪除操作記錄'),
    HistoryController.batchDeleteOperations
);

// 清理舊的操作記錄
router.delete('/operations/cleanup', 
    requireRole(['admin']),
    logActivity('清理操作歷史'),
    HistoryController.cleanupOperationHistory
);

// 登入歷史記錄
// 獲取登入歷史列表
router.get('/logins', 
    requireRole(['admin', 'secretary']),
    validatePagination,
    validateDateRange,
    HistoryController.getLoginHistory
);

// 獲取當前用戶的登入歷史
router.get('/logins/my', 
    requireRole(['student', 'admin']),
    validatePagination,
    HistoryController.getMyLoginHistory
);

// 獲取特定用戶的登入歷史
router.get('/logins/user/:userId', 
    requireRole(['admin', 'secretary']),
    validateId,
    validatePagination,
    HistoryController.getUserLoginHistory
);

// 記錄登入歷史（系統內部調用）
router.post('/logins', 
    requireRole(['admin']),
    HistoryController.logLogin
);

// 清理舊的登入記錄
router.delete('/logins/cleanup', 
    requireRole(['admin']),
    HistoryController.cleanupLoginHistory
);

// 系統活動統計
// 獲取系統活動概覽
router.get('/stats/overview', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    HistoryController.getActivityOverview
);

// 獲取用戶活動統計
router.get('/stats/user-activity', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    HistoryController.getUserActivityStats
);

// 獲取操作類型統計
router.get('/stats/operation-types', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    HistoryController.getOperationTypeStats
);

// 獲取登入統計
router.get('/stats/login-stats', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    HistoryController.getLoginStats
);

// 獲取每日活動統計
router.get('/stats/daily-activity', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    HistoryController.getDailyActivityStats
);

// 獲取每小時活動統計
router.get('/stats/hourly-activity', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    HistoryController.getHourlyActivityStats
);

// 獲取最活躍用戶
router.get('/stats/most-active-users', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    HistoryController.getMostActiveUsers
);

// 獲取最常用功能
router.get('/stats/popular-features', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    HistoryController.getPopularFeatures
);

// 錯誤日誌
// 獲取錯誤日誌列表
router.get('/errors', 
    requireRole(['admin']),
    validatePagination,
    validateDateRange,
    HistoryController.getErrorLogs
);

// 獲取錯誤詳情
router.get('/errors/:id', 
    requireRole(['admin']),
    validateId,
    HistoryController.getErrorDetail
);

// 記錄錯誤（系統內部調用）
router.post('/errors', 
    requireRole(['admin']),
    HistoryController.logError
);

// 標記錯誤為已解決
router.put('/errors/:id/resolve', 
    requireRole(['admin']),
    validateId,
    HistoryController.resolveError
);

// 批量標記錯誤為已解決
router.put('/errors/batch-resolve', 
    requireRole(['admin']),
    HistoryController.batchResolveErrors
);

// 清理錯誤日誌
router.delete('/errors/cleanup', 
    requireRole(['admin']),
    HistoryController.cleanupErrorLogs
);

// 獲取錯誤統計
router.get('/errors/stats', 
    requireRole(['admin']),
    validateDateRange,
    HistoryController.getErrorStats
);

// 審計日誌
// 獲取審計日誌
router.get('/audit', 
    requireRole(['admin']),
    validatePagination,
    validateDateRange,
    HistoryController.getAuditLogs
);

// 獲取特定資源的審計日誌
router.get('/audit/resource/:resourceType/:resourceId', 
    requireRole(['admin', 'secretary']),
    validatePagination,
    HistoryController.getResourceAuditLogs
);

// 記錄審計日誌（系統內部調用）
router.post('/audit', 
    requireRole(['admin']),
    HistoryController.logAudit
);

// 導出功能
// 導出操作歷史
router.get('/export/operations', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    HistoryController.exportOperationHistory
);

// 導出登入歷史
router.get('/export/logins', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    HistoryController.exportLoginHistory
);

// 導出錯誤日誌
router.get('/export/errors', 
    requireRole(['admin']),
    validateDateRange,
    HistoryController.exportErrorLogs
);

// 導出審計日誌
router.get('/export/audit', 
    requireRole(['admin']),
    validateDateRange,
    HistoryController.exportAuditLogs
);

// 生成活動報告
router.post('/reports/activity', 
    requireRole(['admin', 'secretary']),
    HistoryController.generateActivityReport
);

// 生成安全報告
router.post('/reports/security', 
    requireRole(['admin']),
    HistoryController.generateSecurityReport
);

// 搜索功能
// 搜索操作記錄
router.get('/search/operations', 
    requireRole(['admin', 'secretary']),
    validatePagination,
    HistoryController.searchOperations
);

// 搜索登入記錄
router.get('/search/logins', 
    requireRole(['admin', 'secretary']),
    validatePagination,
    HistoryController.searchLogins
);

// 搜索錯誤記錄
router.get('/search/errors', 
    requireRole(['admin']),
    validatePagination,
    HistoryController.searchErrors
);

// 高級搜索
router.post('/search/advanced', 
    requireRole(['admin', 'secretary']),
    validatePagination,
    HistoryController.advancedSearch
);

// 數據保留政策
// 獲取數據保留設定
router.get('/retention/settings', 
    requireRole(['admin']),
    HistoryController.getRetentionSettings
);

// 更新數據保留設定
router.put('/retention/settings', 
    requireRole(['admin']),
    HistoryController.updateRetentionSettings
);

// 執行數據清理
router.post('/retention/cleanup', 
    requireRole(['admin']),
    HistoryController.executeDataCleanup
);

// 獲取清理預覽
router.get('/retention/preview', 
    requireRole(['admin']),
    HistoryController.getCleanupPreview
);

module.exports = router;