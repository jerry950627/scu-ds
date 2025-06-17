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

            return BaseController.paginated(res, {
                records,
                statistics: {
                    total_income: stats.total_income || 0,
                    total_expense: stats.total_expense || 0,
                    balance: (stats.total_income || 0) - (stats.total_expense || 0),
                    total_records: stats.total_records || 0
                }
            }, { page, limit, total });

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
        const { type, amount, description, category, date, notes } = req.body;
        const userId = req.session.user.id;

        try {
            const result = await DatabaseHelper.run(`
                INSERT INTO finance_records (type, amount, description, category, date, notes, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [type, amount, description, category, date, notes, userId]);

            await BaseController.logAction(req, 'FINANCE_RECORD_CREATED', `創建財務記錄: ${description}`, {
                recordId: result.lastID,
                type,
                amount
            });

            return BaseController.success(res, {
                id: result.lastID,
                type,
                amount,
                description,
                category,
                date,
                notes
            }, '財務記錄創建成功', 201);

        } catch (error) {
            console.error('創建財務記錄錯誤:', error);
            await BaseController.logAction(req, 'FINANCE_RECORD_CREATE_ERROR', `創建財務記錄失敗: ${error.message}`);
            return BaseController.error(res, '創建財務記錄失敗', 500);
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
                SET type = ?, amount = ?, description = ?, category = ?, date = ?, notes = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [type, amount, description, category, date, notes, recordId]);

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
    static importRecords = BaseController.asyncHandler(async (req, res) => {
        const userId = req.session.user.id;

        if (!req.file) {
            return BaseController.error(res, '請選擇要匯入的檔案', 400);
        }

        try {
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
                return BaseController.error(res, '匯入檔案格式錯誤', 400, errors);
            }

            // 批量插入記錄
            const insertPromises = records.map(record => 
                DatabaseHelper.run(`
                    INSERT INTO finance_records (type, amount, description, category, date, notes, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `, [record.type, record.amount, record.description, record.category, record.date, record.notes, userId])
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
}

module.exports = FinanceController;