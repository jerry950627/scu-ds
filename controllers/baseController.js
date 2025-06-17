/**
 * 基礎控制器類別
 * 提供統一的響應格式和錯誤處理
 */

const ErrorHandler = require('../utils/errorHandler');
const DatabaseHelper = require('../utils/dbHelper');

class BaseController {
    /**
     * 成功響應
     * @param {Object} res - Express response 物件
     * @param {*} data - 響應資料
     * @param {string} message - 響應訊息
     * @param {number} statusCode - HTTP 狀態碼
     */
    static success(res, data = null, message = '操作成功', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 錯誤響應
     * @param {Object} res - Express response 物件
     * @param {string} message - 錯誤訊息
     * @param {number} statusCode - HTTP 狀態碼
     * @param {*} errors - 詳細錯誤資訊
     */
    static error(res, message = '操作失敗', statusCode = 400, errors = null) {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString()
        };

        if (errors) {
            response.errors = errors;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * 分頁響應
     * @param {Object} res - Express response 物件
     * @param {Array} data - 資料陣列
     * @param {Object} pagination - 分頁資訊
     * @param {string} message - 響應訊息
     */
    static paginated(res, data, pagination, message = '查詢成功') {
        return res.status(200).json({
            success: true,
            message,
            data,
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || 10,
                total: pagination.total || 0,
                totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
            },
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 處理非同步錯誤的包裝器
     * @param {Function} fn - 非同步函數
     * @returns {Function} Express 中間件函數
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * 驗證用戶權限
     * @param {Object} req - Express request 物件
     * @param {Array} allowedRoles - 允許的角色陣列
     * @returns {boolean} 是否有權限
     */
    static hasPermission(req, allowedRoles = []) {
        if (!req.session || !req.session.user) {
            return false;
        }

        if (allowedRoles.length === 0) {
            return true; // 如果沒有指定角色限制，則允許所有已登入用戶
        }

        return allowedRoles.includes(req.session.user.role);
    }

    /**
     * 權限檢查中間件
     * @param {Array} allowedRoles - 允許的角色陣列
     * @returns {Function} Express 中間件函數
     */
    static requireAuth(allowedRoles = []) {
        return (req, res, next) => {
            if (!req.session || !req.session.user) {
                return BaseController.error(res, '請先登入', 401);
            }

            if (!BaseController.hasPermission(req, allowedRoles)) {
                return BaseController.error(res, '權限不足', 403);
            }

            next();
        };
    }

    /**
     * 記錄操作日誌
     * @param {Object} req - Express request 物件
     * @param {string} action - 操作類型
     * @param {string} description - 操作描述
     * @param {*} data - 相關資料
     */
    static async logAction(req, action, description, data = null) {
        try {
            const userId = req.session?.user?.id || null;
            const userAgent = req.get('User-Agent') || '';
            const ip = req.ip || req.connection.remoteAddress || '';

            await DatabaseHelper.run(`
                INSERT INTO system_logs (user_id, action, description, ip_address, user_agent, data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [userId, action, description, ip, userAgent, JSON.stringify(data)]);
        } catch (error) {
            console.error('記錄操作日誌失敗:', error);
        }
    }

    /**
     * 獲取分頁參數
     * @param {Object} req - Express request 物件
     * @param {Object} defaults - 預設值
     * @returns {Object} 分頁參數
     */
    static getPaginationParams(req, defaults = { page: 1, limit: 10 }) {
        const page = Math.max(1, parseInt(req.query.page) || defaults.page);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || defaults.limit));
        const offset = (page - 1) * limit;

        return { page, limit, offset };
    }

    /**
     * 獲取排序參數
     * @param {Object} req - Express request 物件
     * @param {Array} allowedFields - 允許排序的欄位
     * @param {string} defaultField - 預設排序欄位
     * @param {string} defaultOrder - 預設排序方向
     * @returns {Object} 排序參數
     */
    static getSortParams(req, allowedFields = [], defaultField = 'id', defaultOrder = 'DESC') {
        const sortBy = req.query.sortBy || defaultField;
        const sortOrder = (req.query.sortOrder || defaultOrder).toUpperCase();

        // 驗證排序欄位
        const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
        const order = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : defaultOrder;

        return { field, order };
    }

    /**
     * 獲取搜尋參數
     * @param {Object} req - Express request 物件
     * @param {Array} searchableFields - 可搜尋的欄位
     * @returns {Object} 搜尋參數
     */
    static getSearchParams(req, searchableFields = []) {
        const search = req.query.search || '';
        const searchField = req.query.searchField || '';

        if (!search) {
            return { search: '', field: '', conditions: [] };
        }

        let conditions = [];
        let field = '';

        if (searchField && searchableFields.includes(searchField)) {
            // 指定欄位搜尋
            field = searchField;
            conditions.push(`${searchField} LIKE ?`);
        } else {
            // 全欄位搜尋
            conditions = searchableFields.map(field => `${field} LIKE ?`);
        }

        return {
            search: `%${search}%`,
            field,
            conditions
        };
    }

    /**
     * 驗證 ID 參數
     * @param {string} id - ID 值
     * @returns {number|null} 驗證後的 ID
     */
    static validateId(id) {
        const numId = parseInt(id);
        return isNaN(numId) || numId <= 0 ? null : numId;
    }

    /**
     * 格式化日期
     * @param {Date|string} date - 日期
     * @param {string} format - 格式
     * @returns {string} 格式化後的日期
     */
    static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * 清理敏感資料
     * @param {Object} data - 資料物件
     * @param {Array} sensitiveFields - 敏感欄位陣列
     * @returns {Object} 清理後的資料
     */
    static sanitizeData(data, sensitiveFields = ['password', 'password_hash', 'session_id']) {
        if (!data || typeof data !== 'object') {
            return data;
        }

        if (Array.isArray(data)) {
            return data.map(item => BaseController.sanitizeData(item, sensitiveFields));
        }

        const sanitized = { ...data };
        sensitiveFields.forEach(field => {
            if (sanitized.hasOwnProperty(field)) {
                delete sanitized[field];
            }
        });

        return sanitized;
    }
}

module.exports = BaseController;