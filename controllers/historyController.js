/**
 * 歷史記錄控制器
 * 處理系統歷史記錄相關功能
 */

const BaseController = require('./baseController');
const ErrorHandler = require('../utils/errorHandler');
const DatabaseHelper = require('../utils/dbHelper');
const fs = require('fs').promises;
const path = require('path');

class HistoryController extends BaseController {
    /**
     * 獲取操作歷史記錄
     */
    static getOperationHistory = BaseController.asyncHandler(async (req, res) => {
        const { page, limit, offset } = BaseController.getPaginationParams(req);
        const { type, user_id, start_date, end_date } = req.query;
        
        let sql = `
            SELECT h.*, u.username, u.name as user_name
            FROM operation_history h
            LEFT JOIN users u ON h.user_id = u.id
            WHERE h.deleted_at IS NULL
        `;
        const params = [];
        
        // 添加篩選條件
        if (type) {
            sql += ' AND h.operation_type = ?';
            params.push(type);
        }
        
        if (user_id) {
            sql += ' AND h.user_id = ?';
            params.push(user_id);
        }
        
        if (start_date) {
            sql += ' AND h.created_at >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            sql += ' AND h.created_at <= ?';
            params.push(end_date);
        }
        
        sql += ' ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const records = await DatabaseHelper.all(sql, params);
        
        // 獲取總數
        let countSql = 'SELECT COUNT(*) as total FROM operation_history h WHERE h.deleted_at IS NULL';
        const countParams = [];
        
        if (type) {
            countSql += ' AND h.operation_type = ?';
            countParams.push(type);
        }
        
        if (user_id) {
            countSql += ' AND h.user_id = ?';
            countParams.push(user_id);
        }
        
        if (start_date) {
            countSql += ' AND h.created_at >= ?';
            countParams.push(start_date);
        }
        
        if (end_date) {
            countSql += ' AND h.created_at <= ?';
            countParams.push(end_date);
        }
        
        const { total } = await DatabaseHelper.get(countSql, countParams);
        
        return BaseController.success(res, {
            records,
            pagination: BaseController.getPaginationInfo(page, limit, total)
        }, '操作歷史記錄獲取成功');
    });
    
    /**
     * 獲取單個操作記錄詳情
     */
    static getOperationRecord = BaseController.asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT h.*, u.username, u.name as user_name
                FROM operation_history h
                LEFT JOIN users u ON h.user_id = u.id
                WHERE h.id = ? AND h.deleted_at IS NULL
            `;
            
            const record = await DatabaseHelper.get(sql, [id]);
            
            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: '操作記錄不存在'
                });
            }
            
            res.json({
                success: true,
                data: record,
                message: '操作記錄詳情獲取成功'
            });
        } catch (error) {
            console.error('獲取操作記錄詳情失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取操作記錄詳情失敗',
                error: error.message
            });
        }
    });

    /**
     * 記錄操作歷史（路由處理器）
     */
    static logOperation = BaseController.asyncHandler(async (req, res) => {
        try {
            const { operation_type, description, details, target_id, target_type } = req.body;
            const userId = req.session.user.id;
            
            if (!operation_type || !description) {
                return res.status(400).json({
                    success: false,
                    message: '操作類型和描述為必填欄位'
                });
            }
            
            const sql = `
                INSERT INTO operation_history (user_id, operation_type, description, details, target_id, target_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `;
            
            const result = await DatabaseHelper.run(sql, [userId, operation_type, description, JSON.stringify(details), target_id, target_type]);
            
            res.json({
                success: true,
                data: { id: result.lastID },
                message: '操作記錄創建成功'
            });
        } catch (error) {
            console.error('記錄操作歷史失敗:', error);
            res.status(500).json({
                success: false,
                message: '記錄操作歷史失敗',
                error: error.message
            });
        }
    });

    /**
     * 記錄操作歷史（內部方法）
     */
    static async logOperationInternal(userId, operationType, description, details = null, targetId = null, targetType = null) {
        try {
            const sql = `
                INSERT INTO operation_history (user_id, operation_type, description, details, target_id, target_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `;
            
            await DatabaseHelper.run(sql, [userId, operationType, description, JSON.stringify(details), targetId, targetType]);
            
            return true;
        } catch (error) {
            console.error('記錄操作歷史失敗:', error);
            return false;
        }
    }
    
    /**
     * 獲取登入歷史記錄
     */
    static getLoginHistory = BaseController.asyncHandler(async (req, res) => {
        try {
            const { page = 1, limit = 20, user_id, start_date, end_date } = req.query;
            const offset = (page - 1) * limit;
            
            let sql = `
                SELECT l.*, u.username, u.name as user_name
                FROM login_history l
                LEFT JOIN users u ON l.user_id = u.id
                WHERE 1=1
            `;
            const params = [];
            
            // 添加篩選條件
            if (user_id) {
                sql += ' AND l.user_id = ?';
                params.push(user_id);
            }
            
            if (start_date) {
                sql += ' AND l.login_time >= ?';
                params.push(start_date);
            }
            
            if (end_date) {
                sql += ' AND l.login_time <= ?';
                params.push(end_date);
            }
            
            sql += ' ORDER BY l.login_time DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);
            
            const loginHistory = await DatabaseHelper.all(sql, params);
            
            // 獲取總數
            let countSql = 'SELECT COUNT(*) as total FROM login_history l WHERE 1=1';
            const countParams = [];
            
            if (user_id) {
                countSql += ' AND l.user_id = ?';
                countParams.push(user_id);
            }
            
            if (start_date) {
                countSql += ' AND l.login_time >= ?';
                countParams.push(start_date);
            }
            
            if (end_date) {
                countSql += ' AND l.login_time <= ?';
                countParams.push(end_date);
            }
            
            const totalResult = await DatabaseHelper.get(countSql, countParams);
            const total = totalResult ? totalResult.total : 0;
            
            res.json({
                success: true,
                data: {
                    loginHistory,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                },
                message: '登入歷史記錄獲取成功'
            });
        } catch (error) {
            console.error('獲取登入歷史記錄失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取登入歷史記錄失敗',
                error: error.message
            });
        }
    });
    
    /**
     * 記錄登入歷史
     */
    static async logLogin(userId, ipAddress, userAgent, success = true, failReason = null) {
        try {
            const sql = `
                INSERT INTO login_history (user_id, ip_address, user_agent, success, fail_reason, login_time)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `;
            
            await DatabaseHelper.run(sql, [userId, ipAddress, userAgent, success ? 1 : 0, failReason]);
            
            return true;
        } catch (error) {
            console.error('記錄登入歷史失敗:', error);
            return false;
        }
    }
    
    /**
     * 獲取系統活動統計
     */
    static getActivityStats = BaseController.asyncHandler(async (req, res) => {
        try {
            const { period = '7d' } = req.query;
            
            let dateCondition = '';
            switch (period) {
                case '1d':
                    dateCondition = "AND created_at >= datetime('now', '-1 day')";
                    break;
                case '7d':
                    dateCondition = "AND created_at >= datetime('now', '-7 days')";
                    break;
                case '30d':
                    dateCondition = "AND created_at >= datetime('now', '-30 days')";
                    break;
                case '90d':
                    dateCondition = "AND created_at >= datetime('now', '-90 days')";
                    break;
                default:
                    dateCondition = "AND created_at >= datetime('now', '-7 days')";
            }
            
            // 操作類型統計
            const operationStatsSql = `
                SELECT operation_type, COUNT(*) as count
                FROM operation_history
                WHERE deleted_at IS NULL ${dateCondition}
                GROUP BY operation_type
                ORDER BY count DESC
            `;
            
            const operationStats = await DatabaseHelper.all(operationStatsSql, []);
            
            // 每日活動統計
            const dailyStatsSql = `
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM operation_history
                WHERE deleted_at IS NULL ${dateCondition}
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `;
            
            const dailyStats = await DatabaseHelper.all(dailyStatsSql, []);
            
            // 用戶活動統計
            const userStatsSql = `
                SELECT h.user_id, u.username, u.name, COUNT(*) as count
                FROM operation_history h
                LEFT JOIN users u ON h.user_id = u.id
                WHERE h.deleted_at IS NULL ${dateCondition}
                GROUP BY h.user_id, u.username, u.name
                ORDER BY count DESC
                LIMIT 10
            `;
            
            const userStats = await DatabaseHelper.all(userStatsSql, []);
            
            res.json({
                success: true,
                data: {
                    operationStats,
                    dailyStats,
                    userStats,
                    period
                },
                message: '系統活動統計獲取成功'
            });
        } catch (error) {
            console.error('獲取系統活動統計失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取系統活動統計失敗',
                error: error.message
            });
        }
    });
    
    /**
     * 批量刪除操作記錄
     */
    static batchDeleteOperations = BaseController.asyncHandler(async (req, res) => {
        try {
            const { ids } = req.body;
            
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '請提供要刪除的記錄ID列表'
                });
            }
            
            const placeholders = ids.map(() => '?').join(',');
            const sql = `
                UPDATE operation_history 
                SET deleted_at = datetime('now')
                WHERE id IN (${placeholders}) AND deleted_at IS NULL
            `;
            
            const result = await DatabaseHelper.run(sql, ids);
            
            res.json({
                success: true,
                data: {
                    deletedCount: result.changes
                },
                message: `成功刪除 ${result.changes} 條操作記錄`
            });
        } catch (error) {
            console.error('批量刪除操作記錄失敗:', error);
            res.status(500).json({
                success: false,
                message: '批量刪除操作記錄失敗',
                error: error.message
            });
        }
    });
    
    /**
     * 清理舊的操作記錄
     */
    static cleanupOperationHistory = BaseController.asyncHandler(async (req, res) => {
        try {
            const { days = 90 } = req.body;
            
            if (days < 1) {
                return res.status(400).json({
                    success: false,
                    message: '天數必須大於0'
                });
            }
            
            const sql = `
                UPDATE operation_history 
                SET deleted_at = datetime('now')
                WHERE created_at < datetime('now', '-' || ? || ' days')
                AND deleted_at IS NULL
            `;
            
            const result = await DatabaseHelper.run(sql, [days]);
            
            res.json({
                success: true,
                data: {
                    deletedCount: result.changes
                },
                message: `成功清理 ${days} 天前的 ${result.changes} 條操作記錄`
            });
        } catch (error) {
            console.error('清理操作記錄失敗:', error);
            res.status(500).json({
                success: false,
                message: '清理操作記錄失敗',
                error: error.message
            });
        }
    });
    
    /**
     * 清理舊的歷史記錄
     */
    static cleanOldHistory = BaseController.asyncHandler(async (req, res) => {
        try {
            const { days = 90 } = req.body;
            
            // 清理操作歷史
            const cleanOperationSql = `
                UPDATE operation_history 
                SET deleted_at = datetime('now')
                WHERE created_at < datetime('now', '-' || ? || ' days')
                AND deleted_at IS NULL
            `;
            
            const operationResult = await DatabaseHelper.run(cleanOperationSql, [days]);
            
            // 清理登入歷史
            const cleanLoginSql = `
                DELETE FROM login_history 
                WHERE created_at < datetime('now', '-' || ? || ' days')
            `;
            
            const loginResult = await DatabaseHelper.run(cleanLoginSql, [days]);
            
            res.json({
                success: true,
                data: {
                    operationDeleted: operationResult.changes,
                    loginDeleted: loginResult.changes
                },
                message: `成功清理 ${days} 天前的歷史記錄`
            });
        } catch (error) {
            console.error('清理歷史記錄失敗:', error);
            res.status(500).json({
                success: false,
                message: '清理歷史記錄失敗',
                error: error.message
            });
        }
    });

    /**
     * 獲取當前用戶的登入歷史
     */
    static getMyLoginHistory = BaseController.asyncHandler(async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;
            const userId = req.session.user.id;
            
            const sql = `
                SELECT * FROM login_history
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;
            
            const history = await DatabaseHelper.all(sql, [userId, parseInt(limit), offset]);
            
            const totalResult = await DatabaseHelper.get('SELECT COUNT(*) as total FROM login_history WHERE user_id = ?', [userId]);
            const total = totalResult ? totalResult.total : 0;
            
            res.json({
                success: true,
                data: {
                    history,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                },
                message: '登入歷史獲取成功'
            });
        } catch (error) {
            console.error('獲取登入歷史失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取登入歷史失敗',
                error: error.message
            });
        }
    });

    /**
     * 獲取特定用戶的登入歷史
     */
    static getUserLoginHistory = BaseController.asyncHandler(async (req, res) => {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;
            
            const sql = `
                SELECT l.*, u.username, u.name as user_name
                FROM login_history l
                LEFT JOIN users u ON l.user_id = u.id
                WHERE l.user_id = ?
                ORDER BY l.created_at DESC
                LIMIT ? OFFSET ?
            `;
            
            const history = await DatabaseHelper.all(sql, [userId, parseInt(limit), offset]);
            
            const totalResult = await DatabaseHelper.get('SELECT COUNT(*) as total FROM login_history WHERE user_id = ?', [userId]);
            const total = totalResult ? totalResult.total : 0;
            
            res.json({
                success: true,
                data: {
                    history,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                },
                message: '用戶登入歷史獲取成功'
            });
        } catch (error) {
            console.error('獲取用戶登入歷史失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取用戶登入歷史失敗',
                error: error.message
            });
        }
    });

    /**
     * 清理舊的登入記錄
     */
    static cleanupLoginHistory = BaseController.asyncHandler(async (req, res) => {
        try {
            const { days = 90 } = req.body;
            
            if (days < 1) {
                return res.status(400).json({
                    success: false,
                    message: '天數必須大於0'
                });
            }
            
            const sql = `
                DELETE FROM login_history 
                WHERE created_at < datetime('now', '-' || ? || ' days')
            `;
            
            const result = await DatabaseHelper.run(sql, [days]);
            
            res.json({
                success: true,
                data: {
                    deletedCount: result.changes
                },
                message: `成功清理 ${days} 天前的 ${result.changes} 條登入記錄`
            });
        } catch (error) {
            console.error('清理登入記錄失敗:', error);
            res.status(500).json({
                success: false,
                message: '清理登入記錄失敗',
                error: error.message
            });
        }
    });

    /**
     * 獲取系統活動概覽
     */
    static getActivityOverview = BaseController.asyncHandler(async (req, res) => {
        try {
            const { start_date, end_date } = req.query;
            let dateCondition = '';
            
            const params = [];
            if (start_date && end_date) {
                dateCondition = 'AND created_at BETWEEN ? AND ?';
                params.push(start_date, end_date);
            }
            
            // 操作統計
            const operationStats = await DatabaseHelper.get(`
                SELECT COUNT(*) as total_operations
                FROM operation_history 
                WHERE deleted_at IS NULL ${dateCondition}
            `, params) || { total_operations: 0 };
            
            // 登入統計
            const loginStats = await DatabaseHelper.get(`
                SELECT COUNT(*) as total_logins
                FROM login_history 
                WHERE 1=1 ${dateCondition}
            `, params) || { total_logins: 0 };
            
            // 活躍用戶統計
            const activeUsers = await DatabaseHelper.get(`
                SELECT COUNT(DISTINCT user_id) as active_users
                FROM operation_history 
                WHERE deleted_at IS NULL ${dateCondition}
            `, params) || { active_users: 0 };
            
            res.json({
                success: true,
                data: {
                    totalOperations: operationStats.total_operations,
                    totalLogins: loginStats.total_logins,
                    activeUsers: activeUsers.active_users,
                    period: { start_date, end_date }
                },
                message: '系統活動概覽獲取成功'
            });
        } catch (error) {
            console.error('獲取系統活動概覽失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取系統活動概覽失敗',
                error: error.message
            });
        }
    });

    /**
     * 獲取用戶活動統計
     */
    static getUserActivityStats = BaseController.asyncHandler(async (req, res) => {
        try {
            const { start_date, end_date } = req.query;
            let dateCondition = '';
            
            const params = [];
            if (start_date && end_date) {
                dateCondition = 'AND h.created_at BETWEEN ? AND ?';
                params.push(start_date, end_date);
            }
            
            const sql = `
                SELECT 
                    u.id,
                    u.username,
                    u.name,
                    COUNT(h.id) as operation_count,
                    COUNT(DISTINCT DATE(h.created_at)) as active_days
                FROM users u
                LEFT JOIN operation_history h ON u.id = h.user_id AND h.deleted_at IS NULL ${dateCondition}
                WHERE u.deleted_at IS NULL
                GROUP BY u.id, u.username, u.name
                ORDER BY operation_count DESC
                LIMIT 20
            `;
            
            const userStats = await new Promise((resolve, reject) => {
                db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
            
            res.json({
                success: true,
                data: {
                    userStats,
                    period: { start_date, end_date }
                },
                message: '用戶活動統計獲取成功'
            });
        } catch (error) {
            console.error('獲取用戶活動統計失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取用戶活動統計失敗',
                error: error.message
            });
        }
    });
}
module.exports = HistoryController;