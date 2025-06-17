/**
 * 公關部路由
 * 處理公關部相關的所有路由
 */

const express = require('express');
const router = express.Router();
const PrController = require('../controllers/prController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateId, validatePagination, validateDateRange } = require('../middleware/validation');
const { singleUpload, multipleUpload } = require('../utils/uploadConfig');

// 所有公關部路由都需要認證
router.use(requireAuth);

// 公關活動管理
// 獲取公關活動列表
router.get('/activities', 
    validatePagination,
    PrController.getPrActivities
);

// 獲取單個公關活動詳情
router.get('/activities/:id', 
    validateId,
    PrController.getPrActivity
);

// 創建新公關活動
router.post('/activities', 
    requireRole(['admin', 'pr']),
    singleUpload('IMAGE', 'image'),
    PrController.createPrActivity
);

// 更新公關活動
router.put('/activities/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    singleUpload('IMAGE', 'image'),
    PrController.updatePrActivity
);

// 刪除公關活動
router.delete('/activities/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.deletePrActivity
);

// 發布公關活動
router.post('/activities/:id/publish', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.publishPrActivity
);

// 取消發布公關活動
router.post('/activities/:id/unpublish', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.unpublishPrActivity
);

// 合作夥伴管理
// 獲取合作夥伴列表
router.get('/partners', 
    validatePagination,
    PrController.getPartners
);

// 獲取單個合作夥伴詳情
router.get('/partners/:id', 
    validateId,
    PrController.getPartner
);

// 創建新合作夥伴
router.post('/partners', 
    requireRole(['admin', 'pr']),
    singleUpload('IMAGE', 'logo'),
    PrController.createPartner
);

// 更新合作夥伴
router.put('/partners/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    singleUpload('IMAGE', 'logo'),
    PrController.updatePartner
);

// 刪除合作夥伴
router.delete('/partners/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.deletePartner
);

// 啟用/禁用合作夥伴
router.put('/partners/:id/toggle-status', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.togglePartnerStatus
);

// 媒體資源管理
// 獲取媒體資源列表
router.get('/media', 
    validatePagination,
    PrController.getMediaResources
);

// 上傳媒體資源
router.post('/media', 
    requireRole(['admin', 'pr']),
    singleUpload('IMAGE', 'media'),
    PrController.uploadMediaResource
);

// 批量上傳媒體資源
router.post('/media/batch', 
    requireRole(['admin', 'pr']),
    multipleUpload('IMAGE', 'media', 10),
    PrController.batchUploadMedia
);

// 刪除媒體資源
router.delete('/media/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.deleteMediaResource
);

// 下載媒體資源
router.get('/media/:id/download', 
    validateId,
    PrController.downloadMediaResource
);

// 新聞稿管理
// 獲取新聞稿列表
router.get('/press-releases', 
    validatePagination,
    PrController.getPressReleases
);

// 獲取單個新聞稿詳情
router.get('/press-releases/:id', 
    validateId,
    PrController.getPressRelease
);

// 創建新聞稿
router.post('/press-releases', 
    requireRole(['admin', 'pr']),
    singleUpload('DOCUMENT', 'attachment'),
    PrController.createPressRelease
);

// 更新新聞稿
router.put('/press-releases/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    singleUpload('DOCUMENT', 'attachment'),
    PrController.updatePressRelease
);

// 刪除新聞稿
router.delete('/press-releases/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.deletePressRelease
);

// 發布新聞稿
router.post('/press-releases/:id/publish', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.publishPressRelease
);

// 社交媒體管理
// 獲取社交媒體帳號列表
router.get('/social-accounts', 
    requireRole(['admin', 'pr']),
    PrController.getSocialAccounts
);

// 添加社交媒體帳號
router.post('/social-accounts', 
    requireRole(['admin', 'pr']),
    PrController.addSocialAccount
);

// 更新社交媒體帳號
router.put('/social-accounts/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.updateSocialAccount
);

// 刪除社交媒體帳號
router.delete('/social-accounts/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.deleteSocialAccount
);

// 發布社交媒體內容
router.post('/social-posts', 
    requireRole(['admin', 'pr']),
    singleUpload('IMAGE', 'image'),
    PrController.createSocialPost
);

// 獲取社交媒體發布記錄
router.get('/social-posts', 
    requireRole(['admin', 'pr']),
    validatePagination,
    PrController.getSocialPosts
);

// 刪除社交媒體發布
router.delete('/social-posts/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.deleteSocialPost
);

// 事件管理
// 獲取公關事件列表
router.get('/events', 
    validatePagination,
    PrController.getPrEvents
);

// 創建公關事件
router.post('/events', 
    requireRole(['admin', 'pr']),
    PrController.createPrEvent
);

// 更新公關事件
router.put('/events/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.updatePrEvent
);

// 刪除公關事件
router.delete('/events/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.deletePrEvent
);

// 事件報名
router.post('/events/:id/register', 
    validateId,
    PrController.registerForEvent
);

// 取消事件報名
router.delete('/events/:id/register', 
    validateId,
    PrController.unregisterFromEvent
);

// 獲取事件報名列表
router.get('/events/:id/registrations', 
    requireRole(['admin', 'pr']),
    validateId,
    validatePagination,
    PrController.getEventRegistrations
);

// 聯絡人管理
// 獲取媒體聯絡人列表
router.get('/contacts', 
    requireRole(['admin', 'pr']),
    validatePagination,
    PrController.getMediaContacts
);

// 添加媒體聯絡人
router.post('/contacts', 
    requireRole(['admin', 'pr']),
    PrController.addMediaContact
);

// 更新媒體聯絡人
router.put('/contacts/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.updateMediaContact
);

// 刪除媒體聯絡人
router.delete('/contacts/:id', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.deleteMediaContact
);

// 發送郵件給聯絡人
router.post('/contacts/:id/send-email', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.sendEmailToContact
);

// 批量發送郵件
router.post('/contacts/batch-email', 
    requireRole(['admin', 'pr']),
    PrController.batchSendEmail
);

// 統計報表
// 獲取公關統計概覽
router.get('/stats/overview', 
    requireRole(['admin', 'pr', 'secretary']),
    validateDateRange,
    PrController.getPrStats
);

// 獲取活動統計
router.get('/stats/activities', 
    requireRole(['admin', 'pr', 'secretary']),
    validateDateRange,
    PrController.getActivityStats
);

// 獲取媒體覆蓋統計
router.get('/stats/media-coverage', 
    requireRole(['admin', 'pr', 'secretary']),
    validateDateRange,
    PrController.getMediaCoverageStats
);

// 獲取社交媒體統計
router.get('/stats/social-media', 
    requireRole(['admin', 'pr', 'secretary']),
    validateDateRange,
    PrController.getSocialMediaStats
);

// 獲取合作夥伴統計
router.get('/stats/partners', 
    requireRole(['admin', 'pr', 'secretary']),
    PrController.getPartnerStats
);

// 危機管理
// 獲取危機事件列表
router.get('/crisis', 
    requireRole(['admin', 'pr']),
    validatePagination,
    PrController.getCrisisEvents
);

// 創建危機事件
router.post('/crisis', 
    requireRole(['admin', 'pr']),
    PrController.createCrisisEvent
);

// 更新危機事件狀態
router.put('/crisis/:id/status', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.updateCrisisStatus
);

// 添加危機處理記錄
router.post('/crisis/:id/actions', 
    requireRole(['admin', 'pr']),
    validateId,
    PrController.addCrisisAction
);

// 導出功能
// 導出活動報告
router.get('/export/activities', 
    requireRole(['admin', 'pr', 'secretary']),
    validateDateRange,
    PrController.exportActivityReport
);

// 導出媒體聯絡人
router.get('/export/contacts', 
    requireRole(['admin', 'pr']),
    PrController.exportMediaContacts
);

// 導出合作夥伴列表
router.get('/export/partners', 
    requireRole(['admin', 'pr', 'secretary']),
    PrController.exportPartners
);

// 生成公關報告
router.post('/reports/generate', 
    requireRole(['admin', 'pr']),
    PrController.generatePrReport
);

module.exports = router;