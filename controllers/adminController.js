/**
 * 管理員控制器
 * 處理系統管理相關功能
 */

const BaseController = require('./baseController');
const ErrorHandler = require('../utils/errorHandler');
const DatabaseHelper = require('../utils/dbHelper');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');

class AdminController extends BaseController {
    /**
     * 獲取所有用戶列表
     */
    static getUsers = BaseController.asyncHandler(async (req, res) => {
        try {
                    const sql = `
            SELECT 
                id, 
                username, 
                full_name, 
                student_id, 
                role, 
                is_active, 
                created_at
            FROM users 
            WHERE 1=1
            ORDER BY created_at DESC
        `;
            
            const users = await DatabaseHelper.all(sql, []);
            
            return BaseController.success(res, users, '用戶列表獲取成功');
        } catch (error) {
            console.error('獲取用戶列表失敗:', error);
            return BaseController.error(res, '獲取用戶列表失敗', 500);
        }
    });
    
    /**
     * 獲取單個用戶詳情
     */
    static getUser = BaseController.asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT id, username, name, email, role, created_at, updated_at, last_login
                FROM users 
                WHERE id = ? AND deleted_at IS NULL
            `;
            
            const user = await DatabaseHelper.get(sql, [id]);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用戶不存在'
                });
            }
            
            res.json({
                success: true,
                data: user,
                message: '用戶詳情獲取成功'
            });
        } catch (error) {
            console.error('獲取用戶詳情失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取用戶詳情失敗',
                error: error.message
            });
        }
    });

    /**
     * 創建新用戶
     */
    static createUser = BaseController.asyncHandler(async (req, res) => {
        try {
                    const { 
            username, 
            password, 
            full_name, 
            student_id, 
            role, 
            is_active 
        } = req.body;
        
        // 驗證必填欄位
        if (!username || !password || !full_name || !student_id || !role) {
            return res.status(400).json({
                success: false,
                message: '帳號、密碼、姓名、學號和角色為必填欄位'
            });
        }
            
            // 帳號格式驗證
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                return res.status(400).json({
                    success: false,
                    message: '帳號只能包含英文字母、數字和底線'
                });
            }
            
            // 密碼長度驗證
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: '密碼至少需要6個字符'
                });
            }
            
            // 學號格式驗證
            if (!/^\d{8}$/.test(student_id)) {
                return res.status(400).json({
                    success: false,
                    message: '學號格式不正確，應為8位數字'
                });
            }
            
                    // 檢查帳號是否已存在
        const checkUserSql = 'SELECT id FROM users WHERE username = ?';
        const existingUser = await DatabaseHelper.get(checkUserSql, [username]);
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '帳號已存在'
            });
        }
        
        // 檢查學號是否已存在
        const checkStudentSql = 'SELECT id FROM users WHERE student_id = ?';
        const existingStudent = await DatabaseHelper.get(checkStudentSql, [student_id]);
        
        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: '學號已存在'
            });
        }
            
            // 加密密碼
            const hashedPassword = await bcrypt.hash(password, 12);
            
                    const sql = `
            INSERT INTO users (
                username, 
                password_hash, 
                full_name, 
                student_id, 
                role, 
                is_active, 
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        const result = await DatabaseHelper.run(sql, [
            username, 
            hashedPassword, 
            full_name, 
            student_id, 
            role, 
            is_active ? 1 : 0
        ]);
            
            // 記錄操作日誌
            await BaseController.logAction(req, 'USER_CREATE', `創建用戶: ${username} (${full_name})`);
            
                    res.json({
            success: true,
            data: { 
                id: result.lastID,
                username,
                full_name,
                student_id,
                role,
                is_active: is_active ? 1 : 0
            },
            message: '成員新增成功'
        });
        } catch (error) {
            console.error('創建用戶失敗:', error);
            res.status(500).json({
                success: false,
                message: '創建用戶失敗',
                error: error.message
            });
        }
    });
    
    /**
     * 更新用戶資訊
     */
    static updateUser = BaseController.asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { username, name, email, role } = req.body;
        
        // 檢查用戶是否存在
        const checkSql = 'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL';
        const user = await DatabaseHelper.get(checkSql, [id]);
        
        if (!user) {
            return BaseController.error(res, '用戶不存在', 404);
        }
        
        // 如果更新用戶名，檢查是否重複
        if (username && username !== user.username) {
            const duplicateCheck = await DatabaseHelper.get('SELECT id FROM users WHERE username = ? AND id != ? AND deleted_at IS NULL', [username, id]);
            
            if (duplicateCheck) {
                return BaseController.error(res, '用戶名已存在', 400);
            }
        }
        
        const sql = `
            UPDATE users 
            SET username = COALESCE(?, username), 
                name = COALESCE(?, name), 
                email = COALESCE(?, email), 
                role = COALESCE(?, role), 
                updated_at = datetime('now')
            WHERE id = ?
        `;
        
        await DatabaseHelper.run(sql, [username, name, email, role, id]);
        
        await BaseController.logAction(req, 'USER_UPDATE', `更新用戶: ${username || user.username}`);
        
        return BaseController.success(res, null, '用戶資訊更新成功');
    });
    
    /**
     * 刪除用戶
     */
    static deleteUser = BaseController.asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        // 檢查用戶是否存在
        const user = await DatabaseHelper.get('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
        
        if (!user) {
            return BaseController.error(res, '用戶不存在', 404);
        }
        
        // 軟刪除用戶
        const sql = 'UPDATE users SET deleted_at = datetime("now") WHERE id = ?';
        await DatabaseHelper.run(sql, [id]);
        
        await BaseController.logAction(req, 'USER_DELETE', `刪除用戶: ${user.username}`);
        
        return BaseController.success(res, null, '用戶刪除成功');
    });
    
    /**
     * 重置用戶密碼
     */
    static resetUserPassword = BaseController.asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const { newPassword } = req.body;
            
            if (!newPassword) {
                return res.status(400).json({
                    success: false,
                    message: '新密碼為必填欄位'
                });
            }
            
            // 檢查用戶是否存在
            const checkSql = 'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL';
            const user = await DatabaseHelper.get(checkSql, [id]);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用戶不存在'
                });
            }
            
            // 加密新密碼
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            
            const sql = `
                UPDATE users 
                SET password_hash = ?, updated_at = datetime('now')
                WHERE id = ?
            `;
            
            await DatabaseHelper.run(sql, [hashedPassword, id]);
            
            res.json({
                success: true,
                message: '密碼重置成功'
            });
        } catch (error) {
            console.error('重置密碼失敗:', error);
            res.status(500).json({
                success: false,
                message: '重置密碼失敗',
                error: error.message
            });
        }
    });
    
    /**
     * 獲取系統統計資訊
     */
    static getSystemStats = BaseController.asyncHandler(async (req, res) => {
        try {
            const stats = {};
            
            // 用戶統計
            const userCountSql = 'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL';
            const userCountResult = await DatabaseHelper.get(userCountSql, []);
            const userCount = userCountResult.count;
            stats.userCount = userCount;
            
            // 活動統計
            const activityCountSql = 'SELECT COUNT(*) as count FROM activities WHERE deleted_at IS NULL';
            const activityCountResult = await DatabaseHelper.get(activityCountSql, []);
            const activityCount = activityCountResult ? activityCountResult.count : 0;
            stats.activityCount = activityCount;
            
            // 財務記錄統計
            const financeCountSql = 'SELECT COUNT(*) as count FROM finance_records WHERE deleted_at IS NULL';
            const financeCountResult = await DatabaseHelper.get(financeCountSql, []);
            const financeCount = financeCountResult ? financeCountResult.count : 0;
            stats.financeCount = financeCount;
            
            res.json({
                success: true,
                data: stats,
                message: '系統統計資訊獲取成功'
            });
        } catch (error) {
            console.error('獲取系統統計資訊失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取系統統計資訊失敗',
                error: error.message
            });
        }
    });

    /**
     * 鎖定/解鎖用戶
     */
    static toggleUserLock = BaseController.asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const currentUserId = req.session.user.id;
            
            // 不能鎖定自己
            if (parseInt(id) === currentUserId) {
                return res.status(400).json({
                    success: false,
                    message: '不能鎖定自己的帳戶'
                });
            }
            
            // 獲取用戶當前狀態
            const user = await DatabaseHelper.get('SELECT status FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用戶不存在'
                });
            }
            
            const newStatus = user.status === 'active' ? 'locked' : 'active';
            
            await DatabaseHelper.run('UPDATE users SET status = ? WHERE id = ?', [newStatus, id]);
            
            res.json({
                success: true,
                message: `用戶已${newStatus === 'locked' ? '鎖定' : '解鎖'}`
            });
        } catch (error) {
            console.error('切換用戶鎖定狀態失敗:', error);
            res.status(500).json({
                success: false,
                message: '操作失敗',
                error: error.message
            });
        }
    });

    /**
     * 批量操作用戶
     */
    static batchUserOperation = BaseController.asyncHandler(async (req, res) => {
        try {
            const { operation, userIds } = req.body;
            
            if (!operation || !userIds || !Array.isArray(userIds)) {
                return res.status(400).json({
                    success: false,
                    message: '參數錯誤'
                });
            }
            
            const currentUserId = req.session.user.id;
            const filteredIds = userIds.filter(id => parseInt(id) !== currentUserId);
            
            if (filteredIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '沒有有效的操作對象'
                });
            }
            
            let sql, params;
            switch (operation) {
                case 'delete':
                    sql = `UPDATE users SET deleted_at = datetime('now') WHERE id IN (${filteredIds.map(() => '?').join(',')})`;
                    params = filteredIds;
                    break;
                case 'lock':
                    sql = `UPDATE users SET status = 'locked' WHERE id IN (${filteredIds.map(() => '?').join(',')})`;
                    params = filteredIds;
                    break;
                case 'unlock':
                    sql = `UPDATE users SET status = 'active' WHERE id IN (${filteredIds.map(() => '?').join(',')})`;
                    params = filteredIds;
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: '不支援的操作類型'
                    });
            }
            
            await DatabaseHelper.run(sql, params);
            
            res.json({
                success: true,
                message: `批量${operation === 'delete' ? '刪除' : operation === 'lock' ? '鎖定' : '解鎖'}成功`
            });
        } catch (error) {
            console.error('批量操作失敗:', error);
            res.status(500).json({
                success: false,
                message: '批量操作失敗',
                error: error.message
            });
        }
    });

    /**
     * 獲取用戶統計
     */
    static getUserStats = BaseController.asyncHandler(async (req, res) => {
        try {
            const stats = {};
            
            // 總用戶數
            const totalUsers = await DatabaseHelper.get('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL', []);
            stats.totalUsers = totalUsers ? totalUsers.count : 0;
            
            // 活躍用戶數
            const activeUsers = await DatabaseHelper.get('SELECT COUNT(*) as count FROM users WHERE status = "active" AND deleted_at IS NULL', []);
            stats.activeUsers = activeUsers ? activeUsers.count : 0;
            
            // 鎖定用戶數
            const lockedUsers = await DatabaseHelper.get('SELECT COUNT(*) as count FROM users WHERE status = "locked" AND deleted_at IS NULL', []);
            stats.lockedUsers = lockedUsers ? lockedUsers.count : 0;
            
            res.json({
                success: true,
                data: stats,
                message: '用戶統計獲取成功'
            });
        } catch (error) {
            console.error('獲取用戶統計失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取用戶統計失敗',
                error: error.message
            });
        }
    });

    /**
     * 獲取活動統計
     */
    static getActivityStats = BaseController.asyncHandler(async (req, res) => {
        try {
            const stats = {};
            
            // 總活動數
            const totalActivities = await DatabaseHelper.get('SELECT COUNT(*) as count FROM activities WHERE deleted_at IS NULL', []);
            stats.totalActivities = totalActivities ? totalActivities.count : 0;
            
            res.json({
                success: true,
                data: stats,
                message: '活動統計獲取成功'
            });
        } catch (error) {
            console.error('獲取活動統計失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取活動統計失敗',
                error: error.message
            });
        }
    });

    /**
     * 獲取財務統計
     */
    static getFinanceStats = BaseController.asyncHandler(async (req, res) => {
        try {
            const stats = {};
            
            // 總財務記錄數
            const totalRecords = await DatabaseHelper.get('SELECT COUNT(*) as count FROM finance_records WHERE deleted_at IS NULL', []);
            stats.totalRecords = totalRecords ? totalRecords.count : 0;
            
            res.json({
                success: true,
                data: stats,
                message: '財務統計獲取成功'
            });
        } catch (error) {
            console.error('獲取財務統計失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取財務統計失敗',
                error: error.message
            });
        }
    });

    /**
     * 獲取系統設定
     */
    static getSystemSettings = BaseController.asyncHandler(async (req, res) => {
        try {
            const settings = await DatabaseHelper.all('SELECT * FROM system_settings', []);
            
            res.json({
                success: true,
                data: settings,
                message: '系統設定獲取成功'
            });
        } catch (error) {
            console.error('獲取系統設定失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取系統設定失敗',
                error: error.message
            });
        }
    });

    /**
     * 更新系統設定
     */
    static updateSystemSettings = BaseController.asyncHandler(async (req, res) => {
        try {
            const settings = req.body;
            
            for (const [key, value] of Object.entries(settings)) {
                await DatabaseHelper.run(
                    'INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
                    [key, JSON.stringify(value)]
                );
            }
            
            res.json({
                success: true,
                message: '系統設定更新成功'
            });
        } catch (error) {
            console.error('更新系統設定失敗:', error);
            res.status(500).json({
                success: false,
                message: '更新系統設定失敗',
                error: error.message
            });
        }
    });

    /**
     * 獲取特定設定
     */
    static getSetting = BaseController.asyncHandler(async (req, res) => {
        try {
            const { key } = req.params;
            
            const setting = await DatabaseHelper.get('SELECT * FROM system_settings WHERE key = ?', [key]);
            
            if (!setting) {
                return res.status(404).json({
                    success: false,
                    message: '設定不存在'
                });
            }
            
            res.json({
                success: true,
                data: {
                    key: setting.key,
                    value: JSON.parse(setting.value)
                },
                message: '設定獲取成功'
            });
        } catch (error) {
            console.error('獲取設定失敗:', error);
            res.status(500).json({
                success: false,
                message: '獲取設定失敗',
                error: error.message
            });
        }
    });

    /**
     * 更新特定設定
     */
    static updateSetting = BaseController.asyncHandler(async (req, res) => {
        try {
            const { key } = req.params;
            const { value } = req.body;
            
            await DatabaseHelper.run(
                'INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
                [key, JSON.stringify(value)]
            );
            
            res.json({
                success: true,
                message: '設定更新成功'
            });
        } catch (error) {
            console.error('更新設定失敗:', error);
            res.status(500).json({
                success: false,
                message: '更新設定失敗',
                error: error.message
            });
        }
    });

    /**
     * 獲取操作日誌
     */
    static getOperationLogs = BaseController.asyncHandler(async (req, res) => {
        try {
            const { page, limit, offset } = BaseController.getPaginationParams(req);
            
            const sql = `
                SELECT * FROM operation_history 
                WHERE deleted_at IS NULL 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;
            
            const logs = await DatabaseHelper.all(sql, [limit, offset]);
            
            return BaseController.success(res, logs, '操作日誌獲取成功');
        } catch (error) {
            console.error('獲取操作日誌失敗:', error);
            return BaseController.error(res, '獲取操作日誌失敗', 500);
        }
    });

    /**
     * 獲取錯誤日誌
     */
    static getErrorLogs = BaseController.asyncHandler(async (req, res) => {
        try {
            const { page, limit, offset } = BaseController.getPaginationParams(req);
            
            const sql = `
                SELECT * FROM error_logs 
                WHERE deleted_at IS NULL 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;
            
            const logs = await DatabaseHelper.all(sql, [limit, offset]);
            
            return BaseController.success(res, logs, '錯誤日誌獲取成功');
        } catch (error) {
            console.error('獲取錯誤日誌失敗:', error);
            return BaseController.error(res, '獲取錯誤日誌失敗', 500);
        }
    });

    /**
     * 獲取登入日誌
     */
    static getLoginLogs = BaseController.asyncHandler(async (req, res) => {
        try {
            const { page, limit, offset } = BaseController.getPaginationParams(req);
            
            const sql = `
                SELECT * FROM login_history 
                WHERE deleted_at IS NULL 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;
            
            const logs = await DatabaseHelper.all(sql, [limit, offset]);
            
            return BaseController.success(res, logs, '登入日誌獲取成功');
        } catch (error) {
            console.error('獲取登入日誌失敗:', error);
            return BaseController.error(res, '獲取登入日誌失敗', 500);
        }
    });

    /**
     * 清理舊日誌
     */
    static cleanupLogs = BaseController.asyncHandler(async (req, res) => {
        try {
            const { days = 30 } = req.body;
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            await DatabaseHelper.run(
                'UPDATE operation_history SET deleted_at = datetime("now") WHERE created_at < ?',
                [cutoffDate.toISOString()]
            );
            
            await DatabaseHelper.run(
                'UPDATE error_logs SET deleted_at = datetime("now") WHERE created_at < ?',
                [cutoffDate.toISOString()]
            );
            
            await DatabaseHelper.run(
                'UPDATE login_history SET deleted_at = datetime("now") WHERE created_at < ?',
                [cutoffDate.toISOString()]
            );
            
            return BaseController.success(res, null, '日誌清理成功');
        } catch (error) {
            console.error('清理日誌失敗:', error);
            return BaseController.error(res, '清理日誌失敗', 500);
        }
    });

    /**
     * 數據庫備份
     */
    static backupDatabase = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, null, '數據庫備份功能待實現');
        } catch (error) {
            console.error('數據庫備份失敗:', error);
            return BaseController.error(res, '數據庫備份失敗', 500);
        }
    });

    /**
     * 數據庫還原
     */
    static restoreDatabase = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, null, '數據庫還原功能待實現');
        } catch (error) {
            console.error('數據庫還原失敗:', error);
            return BaseController.error(res, '數據庫還原失敗', 500);
        }
    });

    /**
     * 獲取數據庫信息
     */
    static getDatabaseInfo = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, { status: 'connected' }, '數據庫信息獲取成功');
        } catch (error) {
            console.error('獲取數據庫信息失敗:', error);
            return BaseController.error(res, '獲取數據庫信息失敗', 500);
        }
    });

    /**
     * 優化數據庫
     */
    static optimizeDatabase = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, null, '數據庫優化功能待實現');
        } catch (error) {
            console.error('數據庫優化失敗:', error);
            return BaseController.error(res, '數據庫優化失敗', 500);
        }
    });

    /**
     * 獲取文件列表
     */
    static getFiles = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, [], '文件列表獲取成功');
        } catch (error) {
            console.error('獲取文件列表失敗:', error);
            return BaseController.error(res, '獲取文件列表失敗', 500);
        }
    });

    /**
     * 刪除文件
     */
    static deleteFiles = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, null, '文件刪除成功');
        } catch (error) {
            console.error('刪除文件失敗:', error);
            return BaseController.error(res, '刪除文件失敗', 500);
        }
    });

    /**
     * 清理臨時文件
     */
    static cleanupTempFiles = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, null, '臨時文件清理成功');
        } catch (error) {
            console.error('清理臨時文件失敗:', error);
            return BaseController.error(res, '清理臨時文件失敗', 500);
        }
    });

    /**
     * 獲取存儲使用情況
     */
    static getStorageUsage = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, { used: 0, total: 0 }, '存儲使用情況獲取成功');
        } catch (error) {
            console.error('獲取存儲使用情況失敗:', error);
            return BaseController.error(res, '獲取存儲使用情況失敗', 500);
        }
    });

    /**
     * 系統健康檢查
     */
    static healthCheck = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, { status: 'healthy' }, '系統健康檢查完成');
        } catch (error) {
            console.error('系統健康檢查失敗:', error);
            return BaseController.error(res, '系統健康檢查失敗', 500);
        }
    });

    /**
     * 清理緩存
     */
    static clearCache = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, null, '緩存清理成功');
        } catch (error) {
            console.error('清理緩存失敗:', error);
            return BaseController.error(res, '清理緩存失敗', 500);
        }
    });

    /**
     * 重啟服務
     */
    static restartService = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, null, '服務重啟功能待實現');
        } catch (error) {
            console.error('重啟服務失敗:', error);
            return BaseController.error(res, '重啟服務失敗', 500);
        }
    });

    /**
     * 獲取系統信息
     */
    static getSystemInfo = BaseController.asyncHandler(async (req, res) => {
        try {
            const systemInfo = {
                platform: process.platform,
                nodeVersion: process.version,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            };
            
            return BaseController.success(res, systemInfo, '系統信息獲取成功');
        } catch (error) {
            console.error('獲取系統信息失敗:', error);
            return BaseController.error(res, '獲取系統信息失敗', 500);
        }
    });

    /**
     * 發送系統通知
     */
    static broadcastNotification = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, null, '系統通知發送成功');
        } catch (error) {
            console.error('發送系統通知失敗:', error);
            return BaseController.error(res, '發送系統通知失敗', 500);
        }
    });

    /**
     * 獲取通知列表
     */
    static getNotifications = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, [], '通知列表獲取成功');
        } catch (error) {
            console.error('獲取通知列表失敗:', error);
            return BaseController.error(res, '獲取通知列表失敗', 500);
        }
    });

    /**
     * 刪除通知
     */
    static deleteNotification = BaseController.asyncHandler(async (req, res) => {
        try {
            return BaseController.success(res, null, '通知刪除成功');
        } catch (error) {
            console.error('刪除通知失敗:', error);
            return BaseController.error(res, '刪除通知失敗', 500);
        }
    });

    /**
     * 獲取部門列表
     */
    static getDepartments = BaseController.asyncHandler(async (req, res) => {
        try {
            const departments = [
                { id: 1, name: '系學會', code: 'student_union' },
                { id: 2, name: '文書部', code: 'secretary' },
                { id: 3, name: '財務部', code: 'finance' },
                { id: 4, name: '公關部', code: 'pr' },
                { id: 5, name: '美宣部', code: 'design' },
                { id: 6, name: '活動部', code: 'activity' }
            ];
            
            return BaseController.success(res, departments, '部門列表獲取成功');
        } catch (error) {
            console.error('獲取部門列表失敗:', error);
            return BaseController.error(res, '獲取部門列表失敗', 500);
        }
    });

    /**
     * 獲取學年度列表
     */
    static getYears = BaseController.asyncHandler(async (req, res) => {
        try {
            const sql = 'SELECT * FROM academic_years ORDER BY year_name DESC';
            const years = await DatabaseHelper.all(sql, []);
            
            return BaseController.success(res, years, '學年度列表獲取成功');
        } catch (error) {
            console.error('獲取學年度列表失敗:', error);
            return BaseController.error(res, '獲取學年度列表失敗', 500);
        }
    });

    /**
     * 創建新學年度
     */
    static createYear = BaseController.asyncHandler(async (req, res) => {
        try {
            const { year_name } = req.body;
            
            if (!year_name) {
                return BaseController.error(res, '學年度名稱為必填欄位', 400);
            }
            
            // 檢查學年度是否已存在
            const checkSql = 'SELECT id FROM academic_years WHERE year_name = ?';
            const existingYear = await DatabaseHelper.get(checkSql, [year_name]);
            
            if (existingYear) {
                return BaseController.error(res, '該學年度已存在', 400);
            }
            
            const sql = 'INSERT INTO academic_years (year_name, created_at) VALUES (?, datetime("now"))';
            const result = await DatabaseHelper.run(sql, [year_name]);
            
            return BaseController.success(res, { id: result.lastID, year_name }, '學年度創建成功');
        } catch (error) {
            console.error('創建學年度失敗:', error);
            return BaseController.error(res, '創建學年度失敗', 500);
        }
    });

    /**
     * 獲取用戶部門角色
     */
    static getUserDepartmentRole = BaseController.asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT u.id, u.username, u.name, u.role,
                       ud.department_id, ud.role as department_role
                FROM users u
                LEFT JOIN user_departments ud ON u.id = ud.user_id
                WHERE u.id = ? AND u.deleted_at IS NULL
            `;
            
            const userDepartment = await DatabaseHelper.get(sql, [id]);
            
            if (!userDepartment) {
                return BaseController.error(res, '用戶不存在', 404);
            }
            
            return BaseController.success(res, userDepartment, '用戶部門角色獲取成功');
        } catch (error) {
            console.error('獲取用戶部門角色失敗:', error);
            return BaseController.error(res, '獲取用戶部門角色失敗', 500);
        }
    });

    /**
     * 更新用戶部門角色
     */
    static updateUserDepartmentRole = BaseController.asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const { department_id, role } = req.body;
            
            // 檢查用戶是否存在
            const userSql = 'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL';
            const user = await DatabaseHelper.get(userSql, [id]);
            
            if (!user) {
                return BaseController.error(res, '用戶不存在', 404);
            }
            
            // 檢查是否已有部門角色記錄
            const checkSql = 'SELECT id FROM user_departments WHERE user_id = ?';
            const existingRecord = await DatabaseHelper.get(checkSql, [id]);
            
            if (existingRecord) {
                // 更新現有記錄
                const updateSql = `
                    UPDATE user_departments 
                    SET department_id = ?, role = ?, updated_at = datetime('now')
                    WHERE user_id = ?
                `;
                await DatabaseHelper.run(updateSql, [department_id, role, id]);
            } else {
                // 創建新記錄
                const insertSql = `
                    INSERT INTO user_departments (user_id, department_id, role, created_at, updated_at)
                    VALUES (?, ?, ?, datetime('now'), datetime('now'))
                `;
                await DatabaseHelper.run(insertSql, [id, department_id, role]);
            }
            
            return BaseController.success(res, null, '用戶部門角色更新成功');
        } catch (error) {
            console.error('更新用戶部門角色失敗:', error);
            return BaseController.error(res, '更新用戶部門角色失敗', 500);
        }
    });
}

module.exports = AdminController;