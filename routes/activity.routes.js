/**
 * 活動路由
 * 處理活動相關的所有路由
 */

const express = require('express');
const router = express.Router();
const ActivityController = require('../controllers/activityController');
const { requireRole, logActivity, preventDuplicateSubmission } = require('../middleware/auth');
const { validateActivity, validateId, validatePagination } = require('../middleware/validation');
const { singleUpload, multipleUpload } = require('../utils/uploadConfig');

// 獲取活動數量
router.get('/count', 
    ActivityController.getCount
);

// 活動企劃路由（需要活動部門權限）
router.get('/', requireRole(['activity', 'admin', 'secretary']), validatePagination, ActivityController.getActivities);
router.get('/:id', requireRole(['activity', 'admin', 'secretary']), validateId, ActivityController.getActivity);
router.post('/', requireRole(['activity', 'admin']), singleUpload('DOCUMENT', 'attachment'), validateActivity, logActivity('創建活動企劃'), preventDuplicateSubmission, ActivityController.createActivity);
router.put('/:id', requireRole(['activity', 'admin']), validateId, singleUpload('DOCUMENT', 'attachment'), validateActivity, logActivity('更新活動企劃'), ActivityController.updateActivity);
router.delete('/:id', requireRole(['activity', 'admin']), validateId, logActivity('刪除活動企劃'), ActivityController.deleteActivity);

// 活動報名（需要認證）
router.post('/:id/register', 
    requireRole(['student', 'admin']),
    validateId,
    logActivity('報名活動'),
    preventDuplicateSubmission,
    ActivityController.registerActivity
);

// 取消報名（需要認證）
router.delete('/:id/register', 
    requireRole(['student', 'admin']),
    validateId,
    logActivity('取消報名'),
    ActivityController.unregisterActivity
);

// 獲取活動報名列表（需要活動部門權限）
router.get('/:id/registrations', 
    requireRole(['activity', 'admin']),
    validateId,
    validatePagination,
    ActivityController.getActivityRegistrations
);

// 審核報名（需要活動部門權限）
router.put('/:id/registrations/:registrationId', 
    requireRole(['activity', 'admin']),
    validateId,
    logActivity('審核活動報名'),
    ActivityController.updateRegistrationStatus
);

// 獲取用戶的報名記錄（需要認證）
router.get('/user/registrations', 
    requireRole(['student', 'admin']),
    validatePagination,
    ActivityController.getUserRegistrations
);

// 獲取活動統計（需要活動部門權限）
router.get('/stats/overview', 
    requireRole(['activity', 'admin', 'secretary']),
    ActivityController.getActivityStats
);

// 導出活動報名數據（需要活動部門權限）
router.get('/:id/export', 
    requireRole(['activity', 'admin']),
    validateId,
    logActivity('導出活動數據'),
    ActivityController.exportActivityData
);

// 導出所有活動數據（需要管理員權限）
router.get('/export', 
    requireRole(['admin']),
    logActivity('導出所有活動數據'),
    ActivityController.exportAllActivityData
);

// ===== 企劃書相關路由 =====

// 獲取企劃書列表
router.get('/events', 
    ActivityController.getEvents
);

// 創建企劃書 - 已停用安全功能
router.post('/events', 
    singleUpload('ACTIVITY', 'proposal'),
    ActivityController.createEvent
);

// 獲取單個企劃書詳情
router.get('/events/:id', 
    validateId,
    ActivityController.getEvent
);

// 更新企劃書 - 已停用安全功能
router.put('/events/:id', 
    validateId,
    singleUpload('ACTIVITY', 'proposal'),
    ActivityController.updateEvent
);

// 刪除企劃書 - 已停用安全功能
router.delete('/events/:id', 
    validateId,
    ActivityController.deleteEvent
);

// 查看企劃書檔案
router.get('/events/:id/view', 
    validateId,
    ActivityController.viewEvent
);

// 下載企劃書檔案
router.get('/events/:id/download', 
    validateId,
    ActivityController.downloadEvent
);

// ===== 細流相關路由 =====

// 獲取細流列表
router.get('/details', 
    ActivityController.getDetails
);

// 創建細流 - 已停用安全功能
router.post('/details', 
    singleUpload('ACTIVITY', 'detail'),
    ActivityController.createDetail
);

// 獲取單個細流詳情
router.get('/details/:id', 
    validateId,
    ActivityController.getDetail
);

// 更新細流 - 已停用安全功能
router.put('/details/:id', 
    validateId,
    singleUpload('ACTIVITY', 'detail'),
    ActivityController.updateDetail
);

// 刪除細流 - 已停用安全功能
router.delete('/details/:id', 
    validateId,
    ActivityController.deleteDetail
);

// 查看細流檔案
router.get('/details/:id/view', 
    validateId,
    ActivityController.viewDetail
);

// 下載細流檔案
router.get('/details/:id/download', 
    validateId,
    ActivityController.downloadDetail
);

module.exports = router;