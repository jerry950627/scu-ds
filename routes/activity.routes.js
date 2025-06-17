/**
 * 活動路由
 * 處理活動相關的所有路由
 */

const express = require('express');
const router = express.Router();
const ActivityController = require('../controllers/activityController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateActivity, validateId, validatePagination } = require('../middleware/validation');
const { singleUpload } = require('../utils/uploadConfig');

// 獲取活動列表
router.get('/', 
    validatePagination,
    ActivityController.getActivities
);

// 獲取單個活動詳情
router.get('/:id', 
    validateId,
    ActivityController.getActivity
);

// 創建新活動（需要認證和權限）
router.post('/', 
    requireAuth,
    requireRole(['admin', 'secretary']),
    singleUpload('ACTIVITY', 'image'),
    validateActivity,
    ActivityController.createActivity
);

// 更新活動（需要認證和權限）
router.put('/:id', 
    requireAuth,
    requireRole(['admin', 'secretary']),
    validateId,
    singleUpload('ACTIVITY', 'image'),
    validateActivity,
    ActivityController.updateActivity
);

// 刪除活動（需要認證和權限）
router.delete('/:id', 
    requireAuth,
    requireRole(['admin', 'secretary']),
    validateId,
    ActivityController.deleteActivity
);

// 活動報名
router.post('/:id/register', 
    requireAuth,
    validateId,
    ActivityController.registerActivity
);

// 取消報名
router.delete('/:id/register', 
    requireAuth,
    validateId,
    ActivityController.unregisterActivity
);

// 獲取活動報名列表（需要權限）
router.get('/:id/registrations', 
    requireAuth,
    requireRole(['admin', 'secretary']),
    validateId,
    validatePagination,
    ActivityController.getActivityRegistrations
);

// 審核報名（需要權限）
router.put('/:id/registrations/:registrationId', 
    requireAuth,
    requireRole(['admin', 'secretary']),
    validateId,
    ActivityController.updateRegistrationStatus
);

// 獲取用戶的報名記錄
router.get('/user/registrations', 
    requireAuth,
    validatePagination,
    ActivityController.getUserRegistrations
);

// 獲取活動統計（需要權限）
router.get('/stats/overview', 
    requireAuth,
    requireRole(['admin', 'secretary']),
    ActivityController.getActivityStats
);

// 導出活動報名數據（需要權限）
router.get('/:id/export', 
    requireAuth,
    requireRole(['admin', 'secretary']),
    validateId,
    ActivityController.exportActivityData
);

module.exports = router;