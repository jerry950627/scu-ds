/**
 * 設計部路由
 * 處理設計部相關的所有路由
 */

const express = require('express');
const router = express.Router();
const DesignController = require('../controllers/designController');
const { requireRole, logActivity, preventDuplicateSubmission } = require('../middleware/auth');
const { validateDesign, validateId, validatePagination, validateDateRange } = require('../middleware/validation');
const { singleUpload, multipleUpload } = require('../utils/uploadConfig');

// 設計作品管理
// 獲取設計作品列表
router.get('/works', 
    requireRole(['admin', 'design', 'secretary']),
    validatePagination,
    DesignController.getDesignWorks
);

// 獲取單個設計作品詳情
router.get('/works/:id', 
    requireRole(['admin', 'design', 'secretary']),
    validateId,
    DesignController.getDesignWork
);

// 創建新設計作品
router.post('/works', 
    requireRole(['admin', 'design']),
    singleUpload('IMAGE', 'image'),
    validateDesign,
    logActivity('創建設計作品'),
    preventDuplicateSubmission,
    DesignController.createDesignWork
);

// 更新設計作品
router.put('/works/:id', 
    requireRole(['admin', 'design']),
    validateId,
    singleUpload('IMAGE', 'image'),
    validateDesign,
    logActivity('更新設計作品'),
    DesignController.updateDesignWork
);

// 刪除設計作品
router.delete('/works/:id', 
    requireRole(['admin', 'design']),
    validateId,
    logActivity('刪除設計作品'),
    DesignController.deleteDesignWork
);

// 批量上傳設計作品
router.post('/works/batch', 
    requireRole(['admin', 'design']),
    multipleUpload('IMAGE', 'images', 10),
    logActivity('批量上傳設計作品'),
    DesignController.batchUploadWorks
);

// 設計作品分類管理
// 獲取分類列表
router.get('/categories', 
    DesignController.getCategories
);

// 創建分類
router.post('/categories', 
    requireRole(['admin', 'design']),
    DesignController.createCategory
);

// 更新分類
router.put('/categories/:id', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.updateCategory
);

// 刪除分類
router.delete('/categories/:id', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.deleteCategory
);

// 按分類獲取作品
router.get('/categories/:id/works', 
    validateId,
    validatePagination,
    DesignController.getWorksByCategory
);

// 設計師管理
// 獲取設計師列表
router.get('/designers', 
    validatePagination,
    DesignController.getDesigners
);

// 獲取設計師詳情
router.get('/designers/:id', 
    validateId,
    DesignController.getDesigner
);

// 創建設計師資料
router.post('/designers', 
    requireRole(['admin', 'design']),
    singleUpload('IMAGE', 'avatar'),
    DesignController.createDesigner
);

// 更新設計師資料
router.put('/designers/:id', 
    requireRole(['admin', 'design']),
    validateId,
    singleUpload('IMAGE', 'avatar'),
    DesignController.updateDesigner
);

// 刪除設計師
router.delete('/designers/:id', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.deleteDesigner
);

// 獲取設計師的作品
router.get('/designers/:id/works', 
    validateId,
    validatePagination,
    DesignController.getDesignerWorks
);

// 項目管理
// 獲取設計項目列表
router.get('/projects', 
    requireRole(['admin', 'design', 'secretary']),
    validatePagination,
    DesignController.getProjects
);

// 獲取項目詳情
router.get('/projects/:id', 
    requireRole(['admin', 'design', 'secretary']),
    validateId,
    DesignController.getProject
);

// 創建新項目
router.post('/projects', 
    requireRole(['admin', 'design']),
    DesignController.createProject
);

// 更新項目
router.put('/projects/:id', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.updateProject
);

// 刪除項目
router.delete('/projects/:id', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.deleteProject
);

// 項目狀態更新
router.put('/projects/:id/status', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.updateProjectStatus
);

// 為項目分配設計師
router.post('/projects/:id/assign', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.assignDesigner
);

// 獲取項目進度
router.get('/projects/:id/progress', 
    requireRole(['admin', 'design', 'secretary']),
    validateId,
    DesignController.getProjectProgress
);

// 素材庫管理
// 獲取素材列表
router.get('/assets', 
    validatePagination,
    DesignController.getAssets
);

// 上傳素材
router.post('/assets', 
    requireRole(['admin', 'design']),
    singleUpload('IMAGE', 'asset'),
    DesignController.uploadAsset
);

// 批量上傳素材
router.post('/assets/batch', 
    requireRole(['admin', 'design']),
    multipleUpload('IMAGE', 'assets', 20),
    DesignController.batchUploadAssets
);

// 刪除素材
router.delete('/assets/:id', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.deleteAsset
);

// 下載素材
router.get('/assets/:id/download', 
    validateId,
    DesignController.downloadAsset
);

// 搜索素材
router.get('/assets/search', 
    validatePagination,
    DesignController.searchAssets
);

// 評論與評分
// 獲取作品評論
router.get('/works/:id/comments', 
    validateId,
    validatePagination,
    DesignController.getWorkComments
);

// 添加評論
router.post('/works/:id/comments', 
    validateId,
    DesignController.addComment
);

// 刪除評論
router.delete('/comments/:id', 
    validateId,
    DesignController.deleteComment
);

// 為作品評分
router.post('/works/:id/rating', 
    validateId,
    DesignController.rateWork
);

// 獲取作品評分
router.get('/works/:id/rating', 
    validateId,
    DesignController.getWorkRating
);

// 統計報表
// 獲取設計統計概覽
router.get('/stats/overview', 
    requireRole(['admin', 'design', 'secretary']),
    validateDateRange,
    DesignController.getDesignStats
);

// 獲取作品統計
router.get('/stats/works', 
    requireRole(['admin', 'design', 'secretary']),
    validateDateRange,
    DesignController.getWorkStats
);

// 獲取設計師績效統計
router.get('/stats/designers', 
    requireRole(['admin', 'design']),
    validateDateRange,
    DesignController.getDesignerStats
);

// 獲取項目統計
router.get('/stats/projects', 
    requireRole(['admin', 'design', 'secretary']),
    validateDateRange,
    DesignController.getProjectStats
);

// 獲取熱門作品
router.get('/stats/popular-works', 
    validateDateRange,
    DesignController.getPopularWorks
);

// 導出功能
// 導出作品列表
router.get('/export/works', 
    requireRole(['admin', 'design', 'secretary']),
    validateDateRange,
    DesignController.exportWorks
);

// 導出項目報告
router.get('/export/projects/:id', 
    requireRole(['admin', 'design', 'secretary']),
    validateId,
    DesignController.exportProjectReport
);

// 生成作品集
router.post('/portfolio/generate', 
    requireRole(['admin', 'design']),
    DesignController.generatePortfolio
);

// 模板管理
// 獲取設計模板
router.get('/templates', 
    validatePagination,
    DesignController.getTemplates
);

// 創建模板
router.post('/templates', 
    requireRole(['admin', 'design']),
    singleUpload('IMAGE', 'template'),
    DesignController.createTemplate
);

// 使用模板創建作品
router.post('/templates/:id/use', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.useTemplate
);

// 刪除模板
router.delete('/templates/:id', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.deleteTemplate
);

// 協作功能
// 邀請協作
router.post('/works/:id/collaborate', 
    requireRole(['admin', 'design']),
    validateId,
    DesignController.inviteCollaboration
);

// 接受協作邀請
router.post('/collaborations/:id/accept', 
    validateId,
    DesignController.acceptCollaboration
);

// 獲取協作列表
router.get('/collaborations', 
    validatePagination,
    DesignController.getCollaborations
);

// 結束協作
router.delete('/collaborations/:id', 
    validateId,
    DesignController.endCollaboration
);

module.exports = router;