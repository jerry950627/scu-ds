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
                SELECT id, username, name, email, role, created_at, updated_at, last_login
                FROM users 
                WHERE deleted_at IS NULL 
                ORDER BY created_at DESC
            `;
            
            const users = await DatabaseHelper.all(sql, []);
            
            return BaseController.success(res, users, '用戶列表獲取成功');
        } catch (error) {
            console.error('獲取用戶列表失敗:', error);
            return BaseController.error(res, '獲取用戶列表失敗', 500);
        }
    })
    
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
            const { username, password, name, email, role } = req.body;
            
            // 驗證必填欄位
            if (!username || !password || !name || !email) {
                return res.status(400).json({
                    success: false,
                    message: '用戶名、密碼、姓名和電子郵件為必填欄位'
                });
            }
            
            // 檢查用戶名是否已存在
            const checkSql = 'SELECT id FROM users WHERE username = ? AND deleted_at IS NULL';
            const existingUser = await DatabaseHelper.get(checkSql, [username]);
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: '用戶名已存在'
                });
            }
            
            // 加密密碼
            const hashedPassword = await bcrypt.hash(password, 12);
            
            const sql = `
                INSERT INTO users (username, password, name, email, role, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `;
            
            const result = await DatabaseHelper.run(sql, [username, hashedPassword, name, email, role || 'user']);
            
            res.json({
                success: true,
                data: { id: result.lastID },
                message: '用戶創建成功'
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
                SET password = ?, updated_at = datetime('now')
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
            const totalUsers = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL', [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                });
            });
            stats.totalUsers = totalUsers;
            
            // 活躍用戶數
            const activeUsers = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM users WHERE status = "active" AND deleted_at IS NULL', [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                });
            });
            stats.activeUsers = activeUsers;
            
            // 鎖定用戶數
            const lockedUsers = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM users WHERE status = "locked" AND deleted_at IS NULL', [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                });
            });
            stats.lockedUsers = lockedUsers;
            
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
            const totalActivities = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM activities WHERE deleted_at IS NULL', [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                });
            });
            stats.totalActivities = totalActivities;
            
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
    }

    /**
     * 獲取財務統計
     */
    static getFinanceStats = BaseController.asyncHandler(async (req, res) => {
        try {
            const stats = {};
            
            // 總財務記錄數
            const totalRecords = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM finance_records WHERE deleted_at IS NULL', [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                });
            });
            stats.totalRecords = totalRecords;
            
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
    }

    /**
     * 獲取系統設定
     */
    static async getSystemSettings(req, res) {
        try {
            const settings = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM system_settings', [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
            
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
    }

    /**
     * 更新系統設定
     */
    static async updateSystemSettings(req, res) {
        try {
            const settings = req.body;
            
            for (const [key, value] of Object.entries(settings)) {
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
                        [key, JSON.stringify(value)],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
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
    }

    /**
     * 獲取特定設定
     */
    static getSetting = BaseController.asyncHandler(async (req, res) => {
        try {
            const { key } = req.params;
            
            const setting = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM system_settings WHERE key = ?', [key], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
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
     }

     /**
      * 更新特定設定
      */
     static updateSetting = BaseController.asyncHandler(async (req, res) => {
         try {
             const { key } = req.params;
             const { value } = req.body;
             
             await new Promise((resolve, reject) => {
                 db.run(
                     'INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
                     [key, JSON.stringify(value)],
                     (err) => {
                         if (err) reject(err);
                         else resolve();
                     }
                 );
             });
             
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
     }

     /**
      * 獲取操作日誌
      */
     static getOperationLogs = BaseController.asyncHandler(async (req, res) => {
         try {
             const { page = 1, limit = 20 } = req.query;
             const offset = (page - 1) * limit;
             
             const logs = await new Promise((resolve, reject) => {
                 db.all(
                     'SELECT * FROM operation_history ORDER BY created_at DESC LIMIT ? OFFSET ?',
                     [parseInt(limit), offset],
                     (err, rows) => {
                         if (err) reject(err);
                         else resolve(rows || []);
                     }
                 );
             });
             
             const total = await new Promise((resolve, reject) => {
                 db.get('SELECT COUNT(*) as count FROM operation_history', [], (err, row) => {
                     if (err) reject(err);
                     else resolve(row ? row.count : 0);
                 });
             });
             
             res.json({
                 success: true,
                 data: {
                     logs,
                     pagination: {
                         page: parseInt(page),
                         limit: parseInt(limit),
                         total,
                         totalPages: Math.ceil(total / limit)
                     }
                 },
                 message: '操作日誌獲取成功'
             });
         } catch (error) {
             console.error('獲取操作日誌失敗:', error);
             res.status(500).json({
                 success: false,
                 message: '獲取操作日誌失敗',
                 error: error.message
             });
         }
     }

     /**
      * 獲取錯誤日誌
      */
     static getErrorLogs = BaseController.asyncHandler(async (req, res) => {
         try {
             const { page = 1, limit = 20 } = req.query;
             const offset = (page - 1) * limit;
             
             const logs = await new Promise((resolve, reject) => {
                 db.all(
                     'SELECT * FROM error_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
                     [parseInt(limit), offset],
                     (err, rows) => {
                         if (err) reject(err);
                         else resolve(rows || []);
                     }
                 );
             });
             
             const total = await new Promise((resolve, reject) => {
                 db.get('SELECT COUNT(*) as count FROM error_logs', [], (err, row) => {
                     if (err) reject(err);
                     else resolve(row ? row.count : 0);
                 });
             });
             
             res.json({
                 success: true,
                 data: {
                     logs,
                     pagination: {
                         page: parseInt(page),
                         limit: parseInt(limit),
                         total,
                         totalPages: Math.ceil(total / limit)
                     }
                 },
                 message: '錯誤日誌獲取成功'
             });
         } catch (error) {
             console.error('獲取錯誤日誌失敗:', error);
             res.status(500).json({
                 success: false,
                 message: '獲取錯誤日誌失敗',
                 error: error.message
             });
         }
     }

     /**
      * 獲取登入日誌
      */
     static getLoginLogs = BaseController.asyncHandler(async (req, res) => {
         try {
             const { page = 1, limit = 20 } = req.query;
             const offset = (page - 1) * limit;
             
             const logs = await new Promise((resolve, reject) => {
                 db.all(
                     'SELECT * FROM login_history ORDER BY created_at DESC LIMIT ? OFFSET ?',
                     [parseInt(limit), offset],
                     (err, rows) => {
                         if (err) reject(err);
                         else resolve(rows || []);
                     }
                 );
             });
             
             const total = await new Promise((resolve, reject) => {
                 db.get('SELECT COUNT(*) as count FROM login_history', [], (err, row) => {
                     if (err) reject(err);
                     else resolve(row ? row.count : 0);
                 });
             });
             
             res.json({
                 success: true,
                 data: {
                     logs,
                     pagination: {
                         page: parseInt(page),
                         limit: parseInt(limit),
                         total,
                         totalPages: Math.ceil(total / limit)
                     }
                 },
                 message: '登入日誌獲取成功'
             });
         } catch (error) {
             console.error('獲取登入日誌失敗:', error);
             res.status(500).json({
                 success: false,
                 message: '獲取登入日誌失敗',
                 error: error.message
             });
         }
     }

     /**
      * 清理舊日誌
      */
     static cleanupLogs = BaseController.asyncHandler(async (req, res) => {
         try {
             const { days = 30 } = req.body;
             
             const cutoffDate = new Date();
             cutoffDate.setDate(cutoffDate.getDate() - days);
             const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
             
             await new Promise((resolve, reject) => {
                 db.run(
                     'DELETE FROM operation_history WHERE created_at < ?',
                     [cutoffDateStr],
                     (err) => {
                         if (err) reject(err);
                         else resolve();
                     }
                 );
             });
             
             await new Promise((resolve, reject) => {
                 db.run(
                     'DELETE FROM error_logs WHERE created_at < ?',
                     [cutoffDateStr],
                     (err) => {
                         if (err) reject(err);
                         else resolve();
                     }
                 );
             });
             
             await new Promise((resolve, reject) => {
                 db.run(
                     'DELETE FROM login_history WHERE created_at < ?',
                     [cutoffDateStr],
                     (err) => {
                         if (err) reject(err);
                         else resolve();
                     }
                 );
             });
             
             res.json({
                 success: true,
                 message: `已清理 ${days} 天前的日誌`
             });
         } catch (error) {
             console.error('清理日誌失敗:', error);
             res.status(500).json({
                 success: false,
                 message: '清理日誌失敗',
                 error: error.message
             });
         }
     }

     /**
      * 數據庫備份
      */
     static backupDatabase = BaseController.asyncHandler(async (req, res) => {
         try {
             res.json({
                 success: true,
                 message: '數據庫備份功能待實現'
             });
         } catch (error) {
             console.error('數據庫備份失敗:', error);
             res.status(500).json({
                 success: false,
                 message: '數據庫備份失敗',
                 error: error.message
             });
         }
     }

     /**
      * 數據庫還原
      */
     static restoreDatabase = BaseController.asyncHandler(async (req, res) => {
         try {
             res.json({
                 success: true,
                 message: '數據庫還原功能待實現'
             });
         } catch (error) {
             console.error('數據庫還原失敗:', error);
             res.status(500).json({
                 success: false,
                 message: '數據庫還原失敗',
                 error: error.message
             });
         }
     }

     /**
      * 獲取數據庫信息
      */
     static getDatabaseInfo = BaseController.asyncHandler(async (req, res) => {
         try {
             const info = {
                 type: 'SQLite',
                 version: '3.x',
                 size: '待計算',
                 tables: []
             };
             
             const tables = await new Promise((resolve, reject) => {
                 db.all(
                     "SELECT name FROM sqlite_master WHERE type='table'",
                     [],
                     (err, rows) => {
                         if (err) reject(err);
                         else resolve(rows || []);
                     }
                 );
             });
             
             info.tables = tables.map(table => table.name);
             
             res.json({
                 success: true,
                 data: info,
                 message: '數據庫信息獲取成功'
             });
         } catch (error) {
             console.error('獲取數據庫信息失敗:', error);
             res.status(500).json({
                 success: false,
                 message: '獲取數據庫信息失敗',
                 error: error.message
             });
         }
     }

     /**
      * 優化數據庫
      */
     static optimizeDatabase = BaseController.asyncHandler(async (req, res) => {
         try {
             await new Promise((resolve, reject) => {
                 db.run('VACUUM', [], (err) => {
                     if (err) reject(err);
                     else resolve();
                 });
             });
             
             res.json({
                 success: true,
                 message: '數據庫優化完成'
             });
         } catch (error) {
             console.error('數據庫優化失敗:', error);
             res.status(500).json({
                 success: false,
                 message: '數據庫優化失敗',
                 error: error.message
             });
         }
     }
 }

module.exports = AdminController;