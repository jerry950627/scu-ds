/**
 * 財務控制器
 * 處理財務記錄、收支管理等相關功能
 */

const BaseController = require('./baseController');
const ErrorHandler = require('../utils/errorHandler');
const DatabaseHelper = require('../utils/dbHelper');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;

class FinanceController extends BaseController {
    /**
     * 獲取財務記錄列表
     */
    static getRecords = BaseController.asyncHandler(async (req, res) => {
        const { page, limit, offset } = BaseController.getPaginationParams(req);
        const { field, order } = BaseController.getSortParams(req, ['id', 'date', 'amount', 'created_at'], 'date');
        const { search, conditions } = BaseController.getSearchParams(req, ['description', 'category', 'notes']);
        
        const { type, category, startDate, endDate } = req.query;

        try {
            let whereConditions = [];
            let params = [];

            // 搜尋條件
            if (conditions.length > 0) {
                whereConditions.push(`(${conditions.join(' OR ')})`);
                params.push(...new Array(conditions.length).fill(search));
            }

            // 類型篩選
            if (type && ['income', 'expense'].includes(type)) {
                whereConditions.push('type = ?');
                params.push(type);
            }

            // 分類篩選
            if (category) {
                whereConditions.push('category = ?');
                params.push(category);
            }

            // 日期範圍篩選
            if (startDate) {
                whereConditions.push('date >= ?');
                params.push(startDate);
            }
            if (endDate) {
                whereConditions.push('date <= ?');
                params.push(endDate);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // 獲取總數
            const countQuery = `SELECT COUNT(*) as total FROM finance_records ${whereClause}`;
            const { total } = await DatabaseHelper.get(countQuery, params);

            // 獲取記錄列表
            const query = `
                SELECT fr.*, u.name as creator_name
                FROM finance_records fr
                LEFT JOIN users u ON fr.created_by = u.id
                ${whereClause}
                ORDER BY ${field} ${order}
                LIMIT ? OFFSET ?
            `;
            
            const records = await DatabaseHelper.all(query, [...params, limit, offset]);

            // 計算統計資訊
            const statsQuery = `
                SELECT 
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
                    COUNT(*) as total_records
                FROM finance_records ${whereClause}
            `;
            const stats = await DatabaseHelper.get(statsQuery, params.slice(0, -2)); // 移除 limit 和 offset

            // 修正：確保返回正確的資料結構
            const responseData = {
                records: records.map(record => ({
                    ...record,
                    creator_name: record.creator_name || '系統'
                })),
                statistics: {
                    total_income: stats.total_income || 0,
                    total_expense: stats.total_expense || 0,
                    balance: (stats.total_income || 0) - (stats.total_expense || 0),
                    total_records: stats.total_records || 0
                }
            };
            
            return BaseController.paginated(res, responseData, { page, limit, total });

        } catch (error) {
            console.error('獲取財務記錄錯誤:', error);
            return BaseController.error(res, '獲取財務記錄失敗', 500);
        }
    });

    /**
     * 獲取單個財務記錄
     */
    static getRecord = BaseController.asyncHandler(async (req, res) => {
        const recordId = BaseController.validateId(req.params.id);
        
        if (!recordId) {
            return BaseController.error(res, '無效的記錄 ID', 400);
        }

        try {
            const record = await DatabaseHelper.get(`
                SELECT fr.*, u.name as creator_name
                FROM finance_records fr
                LEFT JOIN users u ON fr.created_by = u.id
                WHERE fr.id = ?
            `, [recordId]);

            if (!record) {
                return BaseController.error(res, '財務記錄不存在', 404);
            }

            return BaseController.success(res, record, '獲取財務記錄成功');

        } catch (error) {
            console.error('獲取財務記錄錯誤:', error);
            return BaseController.error(res, '獲取財務記錄失敗', 500);
        }
    });

    /**
     * 創建財務記錄
     */
    static createRecord = BaseController.asyncHandler(async (req, res) => {
        console.log('=== 財務記錄創建請求開始 ===');
        console.log('📍 請求時間:', new Date().toISOString());
        console.log('📍 請求方法:', req.method);
        console.log('📍 請求路徑:', req.path);
        
        // Session 狀態檢查
        if (!req.session?.user) {
            console.error('❌ 用戶未登入');
            return BaseController.error(res, '請先登入', 401);
        }
        
        console.log('👤 用戶資訊:', {
            id: req.session.user.id,
            username: req.session.user.username,
            role: req.session.user.role
        });
        
        // 請求資料檢查
        console.log('📋 請求資料:', {
            body: req.body,
            hasFile: !!req.file
        });
        
        // 檔案上傳檢查
        if (req.file) {
            console.log('📎 檔案已上傳:', {
                filename: req.file.filename,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            });
        }
        
        // 提取表單資料
        const type = req.body.type?.trim();
        const amount = req.body.amount;
        const date = req.body.date?.trim();
        const category = req.body.category?.trim() || '其他';
        const description = req.body.description?.trim() || '';
        const notes = req.body.notes?.trim() || '';
        const userId = req.session.user.id;

        console.log('📝 解析後的欄位:', {
            type, amount, date, category, description, notes, userId
        });

        // 驗證必填欄位
        if (!type || !amount || !date) {
            console.error('❌ 必填欄位缺失');
            return BaseController.error(res, '類型、金額和日期為必填欄位', 400);
        }

        // 驗證類型值
        if (!['income', 'expense'].includes(type)) {
            console.error('❌ 無效的記錄類型:', type);
            return BaseController.error(res, '無效的記錄類型', 400);
        }

        // 驗證並轉換金額
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            console.error('❌ 無效的金額:', amount);
            return BaseController.error(res, '金額必須是大於0的數字', 400);
        }

        // 驗證日期格式
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            console.error('❌ 無效的日期格式:', date);
            return BaseController.error(res, '日期格式不正確', 400);
        }

        console.log('✅ 所有驗證通過');

        try {
            // 處理上傳的收據檔案
            let receiptUrl = null;
            if (req.file) {
                receiptUrl = `/uploads/documents/${req.file.filename}`;
                console.log('📎 收據檔案URL:', receiptUrl);
            }
            
            console.log('💾 準備插入資料庫...');
            const result = await DatabaseHelper.run(`
                INSERT INTO finance_records (
                    title, 
                    description, 
                    amount, 
                    type, 
                    category, 
                    date, 
                    notes, 
                    receipt_url, 
                    created_by, 
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
                description || '財務記錄',
                description,
                numAmount,
                type,
                category,
                date,
                notes,
                receiptUrl,
                userId
            ]);

            console.log('✅ 資料庫插入成功，記錄ID:', result.lastID);

            // 記錄操作日誌
            try {
                await BaseController.logAction(req, 'FINANCE_RECORD_CREATED', `創建財務記錄: ${description}`, {
                    recordId: result.lastID,
                    type,
                    amount: numAmount,
                    hasReceipt: !!receiptUrl
                });
            } catch (logError) {
                console.warn('⚠️ 記錄日誌失敗:', logError.message);
            }

            // 準備回應資料
            const responseData = {
                id: result.lastID,
                type,
                amount: numAmount,
                description,
                category,
                date,
                notes,
                receipt_url: receiptUrl,
                created_by: userId,
                created_at: new Date().toISOString()
            };
            
            console.log('=== 創建財務記錄完成 ✅ ===');
            return BaseController.success(res, responseData, '財務記錄創建成功', 201);

        } catch (error) {
            console.error('=== 創建財務記錄發生錯誤 ❌ ===');
            console.error('錯誤訊息:', error.message);
            console.error('錯誤堆疊:', error.stack);
            
            // 記錄錯誤日誌
            try {
                await BaseController.logAction(req, 'FINANCE_RECORD_CREATE_ERROR', `創建財務記錄失敗: ${error.message}`);
            } catch (logError) {
                console.warn('⚠️ 記錄錯誤日誌失敗:', logError.message);
            }
            
            return BaseController.error(res, `創建財務記錄失敗: ${error.message}`, 500);
        }
    });

    /**
     * 更新財務記錄
     */
    static updateRecord = BaseController.asyncHandler(async (req, res) => {
        const recordId = BaseController.validateId(req.params.id);
        const { type, amount, description, category, date, notes } = req.body;
        const userId = req.session.user.id;

        if (!recordId) {
            return BaseController.error(res, '無效的記錄 ID', 400);
        }

        try {
            // 檢查記錄是否存在
            const record = await DatabaseHelper.get('SELECT * FROM finance_records WHERE id = ?', [recordId]);
            if (!record) {
                return BaseController.error(res, '財務記錄不存在', 404);
            }

            // 檢查權限（只有創建者或管理員可以修改）
            if (record.created_by !== userId && req.session.user.role !== 'admin') {
                return BaseController.error(res, '權限不足', 403);
            }

            await DatabaseHelper.run(`
                UPDATE finance_records 
                SET title = ?, description = ?, amount = ?, type = ?, category = ?, date = ?, notes = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [description, description, amount, type, category, date, notes, recordId]);

            await BaseController.logAction(req, 'FINANCE_RECORD_UPDATED', `更新財務記錄: ${description}`, {
                recordId,
                oldAmount: record.amount,
                newAmount: amount
            });

            return BaseController.success(res, {
                id: recordId,
                type,
                amount,
                description,
                category,
                date,
                notes
            }, '財務記錄更新成功');

        } catch (error) {
            console.error('更新財務記錄錯誤:', error);
            await BaseController.logAction(req, 'FINANCE_RECORD_UPDATE_ERROR', `更新財務記錄失敗: ${error.message}`);
            return BaseController.error(res, '更新財務記錄失敗', 500);
        }
    });

    /**
     * 刪除財務記錄
     */
    static deleteRecord = BaseController.asyncHandler(async (req, res) => {
        const recordId = BaseController.validateId(req.params.id);
        const userId = req.session.user.id;

        if (!recordId) {
            return BaseController.error(res, '無效的記錄 ID', 400);
        }

        try {
            // 檢查記錄是否存在
            const record = await DatabaseHelper.get('SELECT * FROM finance_records WHERE id = ?', [recordId]);
            if (!record) {
                return BaseController.error(res, '財務記錄不存在', 404);
            }

            // 檢查權限（只有創建者或管理員可以刪除）
            if (record.created_by !== userId && req.session.user.role !== 'admin') {
                return BaseController.error(res, '權限不足', 403);
            }

            await DatabaseHelper.run('DELETE FROM finance_records WHERE id = ?', [recordId]);

            await BaseController.logAction(req, 'FINANCE_RECORD_DELETED', `刪除財務記錄: ${record.description}`, {
                recordId,
                amount: record.amount
            });

            return BaseController.success(res, null, '財務記錄刪除成功');

        } catch (error) {
            console.error('刪除財務記錄錯誤:', error);
            await BaseController.logAction(req, 'FINANCE_RECORD_DELETE_ERROR', `刪除財務記錄失敗: ${error.message}`);
            return BaseController.error(res, '刪除財務記錄失敗', 500);
        }
    });

    /**
     * 獲取財務統計
     */
    static getStatistics = BaseController.asyncHandler(async (req, res) => {
        const { period = 'month', year, month } = req.query;

        try {
            let dateCondition = '';
            let params = [];

            // 根據期間設定日期條件
            if (period === 'year' && year) {
                dateCondition = "WHERE strftime('%Y', date) = ?";
                params.push(year);
            } else if (period === 'month' && year && month) {
                dateCondition = "WHERE strftime('%Y-%m', date) = ?";
                params.push(`${year}-${month.padStart(2, '0')}`);
            } else {
                // 預設為當前月份
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                dateCondition = "WHERE strftime('%Y-%m', date) = ?";
                params.push(currentMonth);
            }

            // 基本統計
            const basicStats = await DatabaseHelper.get(`
                SELECT 
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
                    COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
                    COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
                FROM finance_records ${dateCondition}
            `, params);

            // 分類統計
            const categoryStats = await DatabaseHelper.all(`
                SELECT 
                    category,
                    type,
                    SUM(amount) as total_amount,
                    COUNT(*) as count
                FROM finance_records ${dateCondition}
                GROUP BY category, type
                ORDER BY total_amount DESC
            `, params);

            // 月度趨勢（最近12個月）
            const monthlyTrend = await DatabaseHelper.all(`
                SELECT 
                    strftime('%Y-%m', date) as month,
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
                FROM finance_records 
                WHERE date >= date('now', '-12 months')
                GROUP BY strftime('%Y-%m', date)
                ORDER BY month
            `);

            const balance = (basicStats.total_income || 0) - (basicStats.total_expense || 0);

            return BaseController.success(res, {
                basic: {
                    total_income: basicStats.total_income || 0,
                    total_expense: basicStats.total_expense || 0,
                    balance,
                    income_count: basicStats.income_count || 0,
                    expense_count: basicStats.expense_count || 0
                },
                categories: categoryStats,
                monthlyTrend
            }, '獲取財務統計成功');

        } catch (error) {
            console.error('獲取財務統計錯誤:', error);
            return BaseController.error(res, '獲取財務統計失敗', 500);
        }
    });

    /**
     * 匯出財務報表
     */
    static exportReport = BaseController.asyncHandler(async (req, res) => {
        const { format = 'excel', startDate, endDate, type, category } = req.query;

        try {
            let whereConditions = [];
            let params = [];

            // 日期範圍
            if (startDate) {
                whereConditions.push('date >= ?');
                params.push(startDate);
            }
            if (endDate) {
                whereConditions.push('date <= ?');
                params.push(endDate);
            }

            // 類型篩選
            if (type && ['income', 'expense'].includes(type)) {
                whereConditions.push('type = ?');
                params.push(type);
            }

            // 分類篩選
            if (category) {
                whereConditions.push('category = ?');
                params.push(category);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const records = await DatabaseHelper.all(`
                SELECT 
                    date,
                    type,
                    amount,
                    description,
                    category,
                    notes,
                    created_at
                FROM finance_records ${whereClause}
                ORDER BY date DESC, created_at DESC
            `, params);

            if (format === 'excel') {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('財務記錄');

                // 設定標題
                worksheet.columns = [
                    { header: '日期', key: 'date', width: 12 },
                    { header: '類型', key: 'type', width: 8 },
                    { header: '金額', key: 'amount', width: 12 },
                    { header: '描述', key: 'description', width: 20 },
                    { header: '分類', key: 'category', width: 12 },
                    { header: '備註', key: 'notes', width: 20 },
                    { header: '創建時間', key: 'created_at', width: 20 }
                ];

                // 添加資料
                records.forEach(record => {
                    worksheet.addRow({
                        date: record.date,
                        type: record.type === 'income' ? '收入' : '支出',
                        amount: record.amount,
                        description: record.description,
                        category: record.category,
                        notes: record.notes || '',
                        created_at: new Date(record.created_at).toLocaleString('zh-TW')
                    });
                });

                // 設定樣式
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                };

                const fileName = `財務報表_${new Date().toISOString().split('T')[0]}.xlsx`;
                const filePath = path.join(process.env.UPLOAD_PATH || 'public/uploads', 'reports', fileName);

                // 確保目錄存在
                await fs.mkdir(path.dirname(filePath), { recursive: true });

                await workbook.xlsx.writeFile(filePath);

                await BaseController.logAction(req, 'FINANCE_REPORT_EXPORTED', '匯出財務報表', {
                    format,
                    recordCount: records.length,
                    fileName
                });

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
                
                return res.download(filePath, fileName, (err) => {
                    if (err) {
                        console.error('下載檔案錯誤:', err);
                    }
                    // 清理臨時檔案
                    fs.unlink(filePath).catch(console.error);
                });
            } else {
                // JSON 格式
                await BaseController.logAction(req, 'FINANCE_REPORT_EXPORTED', '匯出財務報表 (JSON)', {
                    format,
                    recordCount: records.length
                });

                return BaseController.success(res, records, '財務報表匯出成功');
            }

        } catch (error) {
            console.error('匯出財務報表錯誤:', error);
            await BaseController.logAction(req, 'FINANCE_REPORT_EXPORT_ERROR', `匯出財務報表失敗: ${error.message}`);
            return BaseController.error(res, '匯出財務報表失敗', 500);
        }
    });

    /**
     * 獲取財務分類列表
     */
    static getCategories = BaseController.asyncHandler(async (req, res) => {
        try {
            const categories = await DatabaseHelper.all(`
                SELECT DISTINCT category
                FROM finance_records
                WHERE category IS NOT NULL AND category != ''
                ORDER BY category
            `);

            const categoryList = categories.map(row => row.category);

            return BaseController.success(res, categoryList, '獲取分類列表成功');

        } catch (error) {
            console.error('獲取分類列表錯誤:', error);
            return BaseController.error(res, '獲取分類列表失敗', 500);
        }
    });

    /**
     * 批量匯入財務記錄
     */
    static importFinanceRecords = BaseController.asyncHandler(async (req, res) => {
        const userId = req.session.user.id;

        if (!req.file) {
            return BaseController.error(res, '請選擇要匯入的檔案', 400);
        }

        try {
            // 動態導入ExcelJS
            const ExcelJS = require('exceljs');
            
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(req.file.path);
            const worksheet = workbook.getWorksheet(1);

            const records = [];
            const errors = [];

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // 跳過標題行

                const [date, type, amount, description, category, notes] = row.values.slice(1);

                // 驗證必填欄位
                if (!date || !type || !amount || !description) {
                    errors.push(`第 ${rowNumber} 行：缺少必填欄位`);
                    return;
                }

                // 驗證類型
                if (!['income', 'expense', '收入', '支出'].includes(type)) {
                    errors.push(`第 ${rowNumber} 行：無效的類型`);
                    return;
                }

                // 驗證金額
                const numAmount = parseFloat(amount);
                if (isNaN(numAmount) || numAmount <= 0) {
                    errors.push(`第 ${rowNumber} 行：無效的金額`);
                    return;
                }

                records.push({
                    date: new Date(date).toISOString().split('T')[0],
                    type: type === '收入' ? 'income' : (type === '支出' ? 'expense' : type),
                    amount: numAmount,
                    description: description.toString(),
                    category: category ? category.toString() : '',
                    notes: notes ? notes.toString() : ''
                });
            });

            if (errors.length > 0) {
                return BaseController.error(res, '匯入檔案格式錯誤', 400, { details: errors });
            }

            // 批量插入記錄
            const insertPromises = records.map(record => 
                DatabaseHelper.run(`
                    INSERT INTO finance_records (title, description, amount, type, category, date, notes, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `, [record.description, record.description, record.amount, record.type, record.category, record.date, record.notes, userId])
            );

            await Promise.all(insertPromises);

            // 清理上傳的檔案
            await fs.unlink(req.file.path);

            await BaseController.logAction(req, 'FINANCE_RECORDS_IMPORTED', '批量匯入財務記錄', {
                recordCount: records.length
            });

            return BaseController.success(res, {
                importedCount: records.length
            }, `成功匯入 ${records.length} 筆財務記錄`);

        } catch (error) {
            console.error('匯入財務記錄錯誤:', error);
            await BaseController.logAction(req, 'FINANCE_IMPORT_ERROR', `匯入財務記錄失敗: ${error.message}`);
            return BaseController.error(res, '匯入財務記錄失敗', 500);
        }
    });

    /**
     * 導出到Excel
     */
    static exportToExcel = BaseController.asyncHandler(async (req, res) => {
        try {
            // 動態導入ExcelJS
            const ExcelJS = require('exceljs');
            const path = require('path');
            const fs = require('fs').promises;
            
            const { startDate, endDate, type, format } = req.query;

            // 構建查詢條件
            const whereConditions = [];
            const params = [];

            if (startDate) {
                whereConditions.push('date >= ?');
                params.push(startDate);
            }
            if (endDate) {
                whereConditions.push('date <= ?');
                params.push(endDate);
            }
            if (type && ['income', 'expense'].includes(type)) {
                whereConditions.push('type = ?');
                params.push(type);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const records = await DatabaseHelper.all(`
                SELECT 
                    date,
                    type,
                    amount,
                    description,
                    category,
                    notes,
                    created_at
                FROM finance_records ${whereClause}
                ORDER BY date DESC, created_at DESC
            `, params);

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('財務記錄');

            // 設定標題
            worksheet.columns = [
                { header: '日期', key: 'date', width: 12 },
                { header: '類型', key: 'type', width: 8 },
                { header: '金額', key: 'amount', width: 12 },
                { header: '描述', key: 'description', width: 20 },
                { header: '分類', key: 'category', width: 12 },
                { header: '備註', key: 'notes', width: 20 },
                { header: '創建時間', key: 'created_at', width: 20 }
            ];

            // 添加資料
            records.forEach(record => {
                worksheet.addRow({
                    date: record.date,
                    type: record.type === 'income' ? '收入' : '支出',
                    amount: record.amount,
                    description: record.description,
                    category: record.category,
                    notes: record.notes || '',
                    created_at: new Date(record.created_at).toLocaleString('zh-TW')
                });
            });

            // 設定樣式
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            const fileName = `財務報表_${new Date().toISOString().split('T')[0]}.xlsx`;
            const filePath = path.join(process.env.UPLOAD_PATH || 'public/uploads', 'reports', fileName);

            // 確保目錄存在
            await fs.mkdir(path.dirname(filePath), { recursive: true });

            await workbook.xlsx.writeFile(filePath);

            await BaseController.logAction(req, 'FINANCE_REPORT_EXPORTED', '匯出財務報表', {
                format,
                recordCount: records.length,
                fileName
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            
            return res.download(filePath, fileName, (err) => {
                if (err) {
                    console.error('下載檔案錯誤:', err);
                }
                // 清理臨時檔案
                fs.unlink(filePath).catch(console.error);
            });
        } catch (error) {
            console.error('匯出財務報表錯誤:', error);
            await BaseController.logAction(req, 'FINANCE_REPORT_EXPORT_ERROR', `匯出財務報表失敗: ${error.message}`);
            return BaseController.error(res, '匯出財務報表失敗', 500);
        }
    });

    /**
     * 導出到PDF
     */
    static exportToPDF = BaseController.asyncHandler(async (req, res) => {
        // 目前返回JSON格式用於CSV匯出
        try {
            const { startDate, endDate, type } = req.query;

            // 構建查詢條件
            const whereConditions = [];
            const params = [];

            if (startDate) {
                whereConditions.push('date >= ?');
                params.push(startDate);
            }
            if (endDate) {
                whereConditions.push('date <= ?');
                params.push(endDate);
            }
            if (type && ['income', 'expense'].includes(type)) {
                whereConditions.push('type = ?');
                params.push(type);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const records = await DatabaseHelper.all(`
                SELECT 
                    date,
                    type,
                    amount,
                    description,
                    category,
                    notes,
                    created_at
                FROM finance_records ${whereClause}
                ORDER BY date DESC, created_at DESC
            `, params);

            await BaseController.logAction(req, 'FINANCE_REPORT_EXPORTED', '匯出財務報表 (JSON)', {
                format: 'json',
                recordCount: records.length
            });

            return BaseController.success(res, records, '財務報表匯出成功');

        } catch (error) {
            console.error('匯出資料錯誤:', error);
            return BaseController.error(res, '匯出資料失敗', 500);
        }
    });

    /**
     * 獲取財務概覽
     */
    static getFinanceOverview = BaseController.asyncHandler(async (req, res) => {
        try {
            // 獲取總收入和總支出
            const totalIncome = await DatabaseHelper.get(
                'SELECT COALESCE(SUM(amount), 0) as total FROM finance_records WHERE type = "income"'
            );
            const totalExpense = await DatabaseHelper.get(
                'SELECT COALESCE(SUM(amount), 0) as total FROM finance_records WHERE type = "expense"'
            );
            
            const balance = totalIncome.total - totalExpense.total;
            
            const summary = {
                totalIncome: totalIncome.total,
                totalExpense: totalExpense.total,
                balance: balance
            };
            
            console.log('財務摘要:', summary);
            
            return BaseController.success(res, summary, '獲取財務概覽成功');
        } catch (error) {
            console.error('獲取財務概覽錯誤:', error);
            return BaseController.error(res, '獲取財務概覽失敗', 500);
        }
    });

    /**
     * 獲取收支統計
     */
    static getIncomeExpenseStats = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現收支統計功能
        res.json({
            success: true,
            data: {
                income: 0,
                expense: 0
            }
        });
    });

    /**
     * 獲取分類統計
     */
    static getCategoryStats = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現分類統計功能
        res.json({
            success: true,
            data: []
        });
    });

    /**
     * 獲取月度統計
     */
    static getMonthlyStats = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現月度統計功能
        res.json({
            success: true,
            data: []
        });
    });

    /**
     * 獲取年度統計
     */
    static getYearlyStats = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現年度統計功能
        res.json({
            success: true,
            data: []
        });
    });

    /**
     * 獲取預算列表
     */
    static getBudgets = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現預算管理功能
        res.json({
            success: true,
            data: []
        });
    });

    /**
     * 創建預算
     */
    static createBudget = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現創建預算功能
        res.json({
            success: true,
            message: '創建預算功能開發中'
        });
    });

    /**
     * 更新預算
     */
    static updateBudget = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現更新預算功能
        res.json({
            success: true,
            message: '更新預算功能開發中'
        });
    });

    /**
     * 刪除預算
     */
    static deleteBudget = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現刪除預算功能
        res.json({
            success: true,
            message: '刪除預算功能開發中'
        });
    });

    /**
     * 獲取預算執行情況
     */
    static getBudgetExecution = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現預算執行情況功能
        res.json({
            success: true,
            data: {}
        });
    });

    /**
     * 獲取發票列表
     */
    static getInvoices = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現發票管理功能
        res.json({
            success: true,
            data: []
        });
    });

    /**
     * 創建發票
     */
    static createInvoice = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現創建發票功能
        res.json({
            success: true,
            message: '創建發票功能開發中'
        });
    });

    /**
     * 更新發票狀態
     */
    static updateInvoiceStatus = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現更新發票狀態功能
        res.json({
            success: true,
            message: '更新發票狀態功能開發中'
        });
    });

    /**
     * 生成發票PDF
     */
    static generateInvoicePDF = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現生成發票PDF功能
        res.json({
            success: true,
            message: '生成發票PDF功能開發中'
        });
    });

    /**
     * 生成財務報表
     */
    static generateFinanceReport = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現生成財務報表功能
        res.json({
            success: true,
            message: '生成財務報表功能開發中'
        });
    });

    /**
     * 獲取報表列表
     */
    static getReports = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現獲取報表列表功能
        res.json({
            success: true,
            data: []
        });
    });

    /**
     * 下載報表
     */
    static downloadReport = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現下載報表功能
        res.json({
            success: true,
            message: '下載報表功能開發中'
        });
    });

    /**
     * 提交審核
     */
    static submitForReview = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現提交審核功能
        res.json({
            success: true,
            message: '提交審核功能開發中'
        });
    });

    /**
     * 審核財務記錄
     */
    static reviewFinanceRecord = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現審核財務記錄功能
        res.json({
            success: true,
            message: '審核財務記錄功能開發中'
        });
    });

    /**
     * 獲取待審核記錄
     */
    static getPendingReviews = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現獲取待審核記錄功能
        res.json({
            success: true,
            data: []
        });
    });

    /**
     * 獲取審核歷史
     */
    static getReviewHistory = BaseController.asyncHandler(async (req, res) => {
        // TODO: 實現獲取審核歷史功能
        res.json({
            success: true,
            data: []
        });
    });
}

module.exports = FinanceController;