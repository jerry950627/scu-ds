/**
 * 秘書處路由
 * 處理秘書處相關的所有路由
 */

const express = require('express');
const router = express.Router();
const SecretaryController = require('../controllers/secretaryController');
const { requireRole, logActivity, preventDuplicateSubmission } = require('../middleware/auth');
const { validateId, validatePagination, validateDateRange } = require('../middleware/validation');
const { singleUpload, multipleUpload } = require('../utils/uploadConfig');

// 所有秘書處路由都需要認證
// 已停用認證檢查

// 文件管理
// 獲取文件列表
router.get('/documents', 
    validatePagination,
    SecretaryController.getDocuments
);

// 獲取單個文件詳情
router.get('/documents/:id', 
    validateId,
    SecretaryController.getDocument
);

// 上傳文件
router.post('/documents', 
    requireRole(['admin', 'secretary']),
    singleUpload('DOCUMENT', 'file'),
    SecretaryController.uploadDocument
);

// 批量上傳文件
router.post('/documents/batch', 
    requireRole(['admin', 'secretary']),
    multipleUpload('DOCUMENT', 'files', 10),
    SecretaryController.batchUploadDocuments
);

// 更新文件信息
router.put('/documents/:id', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.updateDocument
);

// 刪除文件
router.delete('/documents/:id', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.deleteDocument
);

// 下載文件
router.get('/documents/:id/download', 
    validateId,
    SecretaryController.downloadDocument
);

// 預覽文件
router.get('/documents/:id/preview', 
    validateId,
    SecretaryController.previewDocument
);

// 文件分享
router.post('/documents/:id/share', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.shareDocument
);

// 獲取分享連結
router.get('/documents/:id/share-link', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.getShareLink
);

// 標籤管理
// 獲取標籤列表
router.get('/tags', 
    SecretaryController.getTags
);

// 創建標籤
router.post('/tags', 
    requireRole(['admin', 'secretary']),
    SecretaryController.createTag
);

// 更新標籤
router.put('/tags/:id', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.updateTag
);

// 刪除標籤
router.delete('/tags/:id', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.deleteTag
);

// 為文件添加標籤
router.post('/documents/:id/tags', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.addDocumentTags
);

// 移除文件標籤
router.delete('/documents/:id/tags/:tagId', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.removeDocumentTag
);

// 搜索功能
// 搜索文件
router.get('/search/documents', 
    validatePagination,
    SecretaryController.searchDocuments
);

// 高級搜索
router.post('/search/advanced', 
    validatePagination,
    SecretaryController.advancedSearch
);

// 按標籤搜索
router.get('/search/by-tag/:tagId', 
    validateId,
    validatePagination,
    SecretaryController.searchByTag
);

// 按日期範圍搜索
router.get('/search/by-date', 
    validateDateRange,
    validatePagination,
    SecretaryController.searchByDateRange
);

// 版本管理
// 獲取文件版本歷史
router.get('/documents/:id/versions', 
    validateId,
    SecretaryController.getDocumentVersions
);

// 上傳新版本
router.post('/documents/:id/versions', 
    requireRole(['admin', 'secretary']),
    validateId,
    singleUpload('DOCUMENT', 'file'),
    SecretaryController.uploadNewVersion
);

// 恢復到指定版本
router.post('/documents/:id/versions/:versionId/restore', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.restoreVersion
);

// 比較版本
router.get('/documents/:id/versions/:versionId/compare', 
    validateId,
    SecretaryController.compareVersions
);

// 統計報表
// 獲取文件統計
router.get('/stats/documents', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    SecretaryController.getDocumentStats
);

// 獲取存儲使用統計
router.get('/stats/storage', 
    requireRole(['admin', 'secretary']),
    SecretaryController.getStorageStats
);

// 獲取用戶活動統計
router.get('/stats/user-activity', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    SecretaryController.getUserActivityStats
);

// 獲取熱門文件統計
router.get('/stats/popular-documents', 
    requireRole(['admin', 'secretary']),
    validateDateRange,
    SecretaryController.getPopularDocuments
);

// 備份與恢復
// 創建備份
router.post('/backup', 
    requireRole(['admin']),
    SecretaryController.createBackup
);

// 獲取備份列表
router.get('/backups', 
    requireRole(['admin']),
    validatePagination,
    SecretaryController.getBackups
);

// 恢復備份
router.post('/backups/:id/restore', 
    requireRole(['admin']),
    validateId,
    SecretaryController.restoreBackup
);

// 刪除備份
router.delete('/backups/:id', 
    requireRole(['admin']),
    validateId,
    SecretaryController.deleteBackup
);

// 權限管理
// 設置文件權限
router.post('/documents/:id/permissions', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.setDocumentPermissions
);

// 獲取文件權限
router.get('/documents/:id/permissions', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.getDocumentPermissions
);

// 移除文件權限
router.delete('/documents/:id/permissions/:userId', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.removeDocumentPermission
);

// 通知管理
// 獲取通知列表
router.get('/notifications', 
    validatePagination,
    SecretaryController.getNotifications
);

// 標記通知為已讀
router.put('/notifications/:id/read', 
    validateId,
    SecretaryController.markNotificationAsRead
);

// 刪除通知
router.delete('/notifications/:id', 
    validateId,
    SecretaryController.deleteNotification
);

// 批量標記通知為已讀
router.put('/notifications/mark-all-read', 
    SecretaryController.markAllNotificationsAsRead
);

// 會議記錄路由（需要秘書處權限）
// 獲取會議列表
router.get('/meetings', 
    requireRole(['secretary', 'admin']),
    validatePagination,
    SecretaryController.getMeetings
);

// 獲取單個會議詳情
router.get('/meetings/:id', 
    validateId,
    SecretaryController.getMeeting
);

// 創建新會議
router.post('/meetings', 
    requireRole(['secretary', 'admin']),
    singleUpload('DOCUMENT', 'attachment'),
    logActivity('創建會議記錄'),
    preventDuplicateSubmission,
    SecretaryController.createMeeting
);

// 更新會議
router.put('/meetings/:id', 
    requireRole(['secretary', 'admin']),
    validateId,
    singleUpload('DOCUMENT', 'attachment'),
    logActivity('更新會議記錄'),
    SecretaryController.updateMeeting
);

// 刪除會議
router.delete('/meetings/:id', 
    requireRole(['secretary', 'admin']),
    validateId,
    logActivity('刪除會議記錄'),
    SecretaryController.deleteMeeting
);

// 活動記錄路由（需要秘書處權限）
// 獲取活動列表
router.get('/activities', 
    requireRole(['secretary', 'admin']),
    validatePagination,
    SecretaryController.getActivities
);

// 獲取單個活動詳情
router.get('/activities/:id', 
    validateId,
    SecretaryController.getActivity
);

// 創建新活動
router.post('/activities', 
    requireRole(['secretary', 'admin']),
    singleUpload('DOCUMENT', 'attachment'),
    logActivity('創建活動記錄'),
    preventDuplicateSubmission,
    SecretaryController.createActivity
);

// 更新活動
router.put('/activities/:id', 
    requireRole(['secretary', 'admin']),
    validateId,
    singleUpload('DOCUMENT', 'attachment'),
    logActivity('更新活動記錄'),
    SecretaryController.updateActivity
);

// 刪除活動
router.delete('/activities/:id', 
    requireRole(['secretary', 'admin']),
    validateId,
    logActivity('刪除活動記錄'),
    SecretaryController.deleteActivity
);

// 工作流程
// 獲取工作流程列表
router.get('/workflows', 
    requireRole(['admin', 'secretary']),
    validatePagination,
    SecretaryController.getWorkflows
);

// 創建工作流程
router.post('/workflows', 
    requireRole(['admin', 'secretary']),
    SecretaryController.createWorkflow
);

// 啟動工作流程
router.post('/workflows/:id/start', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.startWorkflow
);

// 獲取工作流程狀態
router.get('/workflows/:id/status', 
    requireRole(['admin', 'secretary']),
    validateId,
    SecretaryController.getWorkflowStatus
);

module.exports = router;