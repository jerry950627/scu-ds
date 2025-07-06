/**
 * 財務路由
 * 處理財務管理相關的所有路由
 */

const express = require('express');
const router = express.Router();
const FinanceController = require('../controllers/financeController');
const { requireRole, logActivity, preventDuplicateSubmission } = require('../middleware/auth');
const { validateFinance, validateId, validatePagination, validateDateRange } = require('../middleware/validation');
const { singleUpload } = require('../utils/uploadConfig');

// 獲取財務記錄列表
router.get('/', 
    requireRole(['admin', 'finance', 'secretary', 'member']),
    validatePagination,
    validateDateRange,
    FinanceController.getRecords
);

// 獲取財務記錄列表 (別名路由)
router.get('/records', 
    requireRole(['admin', 'finance', 'secretary', 'member']),
    validatePagination,
    validateDateRange,
    FinanceController.getRecords
);

// 調試中間件
const debugMiddleware = (name) => (req, res, next) => {
    console.log(`=== ${name} 中間件 ===`);
    console.log('📋 req.body:', req.body);
    console.log('📎 req.file:', req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
    } : '無檔案');
    console.log('🔗 Content-Type:', req.get('Content-Type'));
    next();
};

// 創建新財務記錄 (簡化版本 - 僅用於調試)
router.post('/test', 
    requireRole(['admin', 'finance', 'member']),
    singleUpload('DOCUMENT', 'receipt'),
    FinanceController.createRecord
);

// 創建新財務記錄 (主要路由)
router.post('/records', 
    requireRole(['admin', 'finance', 'member']),
    singleUpload('DOCUMENT', 'receipt'),
    validateFinance,
    logActivity('創建財務記錄', 'finance'),
    FinanceController.createRecord
);

// 創建新財務記錄 (根路由 - 向後兼容)
router.post('/', 
    requireRole(['admin', 'finance', 'member']),
    singleUpload('DOCUMENT', 'receipt'),
    validateFinance,
    logActivity('創建財務記錄', 'finance'),
    FinanceController.createRecord
);

// 獲取單個財務記錄詳情
router.get('/:id', 
    requireRole(['admin', 'finance', 'secretary', 'member']),
    validateId,
    FinanceController.getRecord
);

// 更新財務記錄
router.put('/:id', 
    requireRole(['admin', 'finance']),
    validateId,
    singleUpload('DOCUMENT', 'receipt'),
    validateFinance,
    logActivity('更新財務記錄'),
    FinanceController.updateRecord
);

// 刪除財務記錄
router.delete('/:id', 
    requireRole(['admin', 'finance']),
    validateId,
    logActivity('刪除財務記錄'),
    FinanceController.deleteRecord
);

// 批量導入財務記錄
router.post('/import', 
    requireRole(['admin', 'finance']),
    singleUpload('DOCUMENT', 'file'),
    FinanceController.importFinanceRecords
);

// 導出財務記錄
router.get('/export/excel', 
    requireRole(['admin', 'finance', 'secretary']),
    validateDateRange,
    FinanceController.exportToExcel
);

// 導出財務記錄為CSV (使用PDF端點返回JSON數據)
router.get('/export', 
    requireRole(['admin', 'finance', 'secretary']),
    validateDateRange,
    FinanceController.exportToPDF
);

// 導出財務記錄為PDF
router.get('/export/pdf', 
    requireRole(['admin', 'finance', 'secretary']),
    validateDateRange,
    FinanceController.exportToPDF
);

// 獲取財務摘要
router.get('/summary', 
    requireRole(['admin', 'finance', 'secretary', 'member']),
    FinanceController.getFinanceOverview
);

// 財務統計
// 獲取財務概覽統計
router.get('/stats/overview', 
    requireRole(['admin', 'finance', 'secretary']),
    validateDateRange,
    FinanceController.getFinanceOverview
);

// 獲取收支統計
router.get('/stats/income-expense', 
    requireRole(['admin', 'finance', 'secretary']),
    validateDateRange,
    FinanceController.getIncomeExpenseStats
);

// 獲取分類統計
router.get('/stats/categories', 
    requireRole(['admin', 'finance', 'secretary']),
    validateDateRange,
    FinanceController.getCategoryStats
);

// 獲取月度統計
router.get('/stats/monthly', 
    requireRole(['admin', 'finance', 'secretary']),
    FinanceController.getMonthlyStats
);

// 獲取年度統計
router.get('/stats/yearly', 
    requireRole(['admin', 'finance', 'secretary']),
    FinanceController.getYearlyStats
);

// 預算管理
// 獲取預算列表
router.get('/budgets', 
    requireRole(['admin', 'finance', 'secretary']),
    validatePagination,
    FinanceController.getBudgets
);

// 創建預算
router.post('/budgets', 
    requireRole(['admin', 'finance']),
    FinanceController.createBudget
);

// 更新預算
router.put('/budgets/:id', 
    requireRole(['admin', 'finance']),
    validateId,
    FinanceController.updateBudget
);

// 刪除預算
router.delete('/budgets/:id', 
    requireRole(['admin', 'finance']),
    validateId,
    FinanceController.deleteBudget
);

// 獲取預算執行情況
router.get('/budgets/:id/execution', 
    requireRole(['admin', 'finance', 'secretary']),
    validateId,
    FinanceController.getBudgetExecution
);

// 發票管理
// 獲取發票列表
router.get('/invoices', 
    requireRole(['admin', 'finance', 'secretary']),
    validatePagination,
    FinanceController.getInvoices
);

// 創建發票
router.post('/invoices', 
    requireRole(['admin', 'finance']),
    FinanceController.createInvoice
);

// 更新發票狀態
router.put('/invoices/:id/status', 
    requireRole(['admin', 'finance']),
    validateId,
    FinanceController.updateInvoiceStatus
);

// 生成發票PDF
router.get('/invoices/:id/pdf', 
    requireRole(['admin', 'finance', 'secretary']),
    validateId,
    FinanceController.generateInvoicePDF
);

// 報表管理
// 生成財務報表
router.post('/reports/generate', 
    requireRole(['admin', 'finance']),
    FinanceController.generateFinanceReport
);

// 獲取報表列表
router.get('/reports', 
    requireRole(['admin', 'finance', 'secretary']),
    validatePagination,
    FinanceController.getReports
);

// 下載報表
router.get('/reports/:id/download', 
    requireRole(['admin', 'finance', 'secretary']),
    validateId,
    FinanceController.downloadReport
);

// 審核管理
// 提交審核
router.post('/:id/submit-review', 
    requireRole(['finance']),
    validateId,
    FinanceController.submitForReview
);

// 審核財務記錄
router.post('/:id/review', 
    requireRole(['admin', 'secretary']),
    validateId,
    FinanceController.reviewFinanceRecord
);

// 獲取待審核記錄
router.get('/pending-review', 
    requireRole(['admin', 'secretary']),
    validatePagination,
    FinanceController.getPendingReviews
);

// 獲取審核歷史
router.get('/:id/review-history', 
    requireRole(['admin', 'finance', 'secretary']),
    validateId,
    FinanceController.getReviewHistory
);

module.exports = router;