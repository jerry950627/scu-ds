/**
 * 統一表單驗證中間件
 * 提供常用的資料驗證功能
 */

class ValidationMiddleware {
    /**
     * 驗證必填欄位
     * @param {Array} requiredFields - 必填欄位陣列
     * @returns {Function} Express 中間件函數
     */
    static validateRequired(requiredFields) {
        return (req, res, next) => {
            const errors = [];
            const data = { ...req.body, ...req.query, ...req.params };
            
            for (const field of requiredFields) {
                if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
                    errors.push(`${field} 為必填欄位`);
                }
            }
            
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '資料驗證失敗',
                    errors: errors
                });
            }
            
            next();
        };
    }

    /**
     * 驗證電子郵件格式
     * @param {string} fieldName - 欄位名稱
     * @returns {Function} Express 中間件函數
     */
    static validateEmail(fieldName = 'email') {
        return (req, res, next) => {
            const email = req.body[fieldName];
            
            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({
                        success: false,
                        message: '電子郵件格式不正確'
                    });
                }
            }
            
            next();
        };
    }

    /**
     * 驗證密碼強度
     * @param {string} fieldName - 欄位名稱
     * @param {Object} options - 驗證選項
     * @returns {Function} Express 中間件函數
     */
    static validatePassword(fieldName = 'password', options = {}) {
        const {
            minLength = 6,
            maxLength = 50,
            requireUppercase = false,
            requireLowercase = false,
            requireNumbers = false,
            requireSpecialChars = false
        } = options;
        
        return (req, res, next) => {
            const password = req.body[fieldName];
            
            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: '密碼為必填欄位'
                });
            }
            
            const errors = [];
            
            if (password.length < minLength) {
                errors.push(`密碼長度至少需要 ${minLength} 個字元`);
            }
            
            if (password.length > maxLength) {
                errors.push(`密碼長度不能超過 ${maxLength} 個字元`);
            }
            
            if (requireUppercase && !/[A-Z]/.test(password)) {
                errors.push('密碼必須包含至少一個大寫字母');
            }
            
            if (requireLowercase && !/[a-z]/.test(password)) {
                errors.push('密碼必須包含至少一個小寫字母');
            }
            
            if (requireNumbers && !/\d/.test(password)) {
                errors.push('密碼必須包含至少一個數字');
            }
            
            if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                errors.push('密碼必須包含至少一個特殊字元');
            }
            
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '密碼強度不足',
                    errors: errors
                });
            }
            
            next();
        };
    }

    /**
     * 驗證數字範圍
     * @param {string} fieldName - 欄位名稱
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @param {boolean} required - 是否為必填欄位
     * @returns {Function} Express 中間件函數
     */
    static validateNumberRange(fieldName, min = null, max = null, required = true) {
        return (req, res, next) => {
            const value = req.body[fieldName];
            
            // 如果欄位為空且不是必填，則跳過驗證
            if ((value === undefined || value === null || value === '') && !required) {
                return next();
            }
            
            if (value !== undefined && value !== null && value !== '') {
                const numValue = Number(value);
                
                if (isNaN(numValue)) {
                    return res.status(400).json({
                        success: false,
                        message: `${fieldName} 必須是有效的數字`
                    });
                }
                
                if (min !== null && numValue < min) {
                    return res.status(400).json({
                        success: false,
                        message: `${fieldName} 不能小於 ${min}`
                    });
                }
                
                if (max !== null && numValue > max) {
                    return res.status(400).json({
                        success: false,
                        message: `${fieldName} 不能大於 ${max}`
                    });
                }
            } else if (required) {
                return res.status(400).json({
                    success: false,
                    message: `${fieldName} 為必填欄位`
                });
            }
            
            next();
        };
    }

    /**
     * 驗證字串長度
     * @param {string} fieldName - 欄位名稱
     * @param {number} min - 最小長度
     * @param {number} max - 最大長度
     * @returns {Function} Express 中間件函數
     */
    static validateStringLength(fieldName, min = 0, max = 255) {
        return (req, res, next) => {
            const value = req.body[fieldName];
            
            if (value !== undefined && value !== null) {
                const strValue = String(value);
                
                if (strValue.length < min) {
                    return res.status(400).json({
                        success: false,
                        message: `${fieldName} 長度至少需要 ${min} 個字元`
                    });
                }
                
                if (strValue.length > max) {
                    return res.status(400).json({
                        success: false,
                        message: `${fieldName} 長度不能超過 ${max} 個字元`
                    });
                }
            }
            
            next();
        };
    }

    /**
     * 驗證日期格式
     * @param {string} fieldName - 欄位名稱
     * @param {string} format - 日期格式 (YYYY-MM-DD)
     * @returns {Function} Express 中間件函數
     */
    static validateDate(fieldName, format = 'YYYY-MM-DD') {
        return (req, res, next) => {
            const value = req.body[fieldName];
            
            if (value) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                
                if (!dateRegex.test(value)) {
                    return res.status(400).json({
                        success: false,
                        message: `${fieldName} 日期格式不正確，請使用 YYYY-MM-DD 格式`
                    });
                }
                
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: `${fieldName} 不是有效的日期`
                    });
                }
            }
            
            next();
        };
    }

    /**
     * 驗證檔案上傳
     * @param {Object} options - 驗證選項
     * @returns {Function} Express 中間件函數
     */
    static validateFile(options = {}) {
        const {
            required = false,
            maxSize = 10 * 1024 * 1024, // 10MB
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            fieldName = 'file'
        } = options;
        
        return (req, res, next) => {
            const file = req.file || req.files?.[fieldName];
            
            if (required && !file) {
                return res.status(400).json({
                    success: false,
                    message: '檔案為必填項目'
                });
            }
            
            if (file) {
                if (file.size > maxSize) {
                    return res.status(400).json({
                        success: false,
                        message: `檔案大小不能超過 ${Math.round(maxSize / 1024 / 1024)}MB`
                    });
                }
                
                if (!allowedTypes.includes(file.mimetype)) {
                    return res.status(400).json({
                        success: false,
                        message: '不支援的檔案類型'
                    });
                }
            }
            
            next();
        };
    }

    /**
     * 驗證檔案上傳 (別名方法)
     * @param {string} fieldName - 檔案欄位名稱
     * @param {Object} options - 驗證選項
     * @returns {Function} Express 中間件函數
     */
    static validateFileUpload(fieldName = 'file', options = {}) {
        return ValidationMiddleware.validateFile({ ...options, fieldName });
    }

    /**
     * 清理和標準化輸入資料
     * @param {Array} fields - 需要清理的欄位
     * @returns {Function} Express 中間件函數
     */
    static sanitizeInput(fields = []) {
        return (req, res, next) => {
            for (const field of fields) {
                if (req.body[field] && typeof req.body[field] === 'string') {
                    // 移除前後空白
                    req.body[field] = req.body[field].trim();
                    
                    // 移除多餘的空白字元
                    req.body[field] = req.body[field].replace(/\s+/g, ' ');
                    
                    // 基本的 HTML 標籤清理（可根據需要調整）
                    req.body[field] = req.body[field].replace(/<script[^>]*>.*?<\/script>/gi, '');
                    req.body[field] = req.body[field].replace(/<[^>]*>/g, '');
                }
            }
            
            next();
        };
    }

    /**
     * 驗證 ID 參數
     * @param {string} paramName - 參數名稱
     * @returns {Function} Express 中間件函數
     */
    static validateId(paramName = 'id') {
        return (req, res, next) => {
            const id = req.params[paramName];
            const numId = parseInt(id);
            
            if (isNaN(numId) || numId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `無效的 ${paramName} 參數`
                });
            }
            
            next();
        };
    }

    /**
     * 組合多個驗證器
     * @param {Array} validators - 驗證器陣列
     * @returns {Function} Express 中間件函數
     */
    static combine(validators) {
        return (req, res, next) => {
            let index = 0;
            
            const runNext = (err) => {
                if (err) return next(err);
                
                if (index >= validators.length) {
                    return next();
                }
                
                const validator = validators[index++];
                validator(req, res, runNext);
            };
            
            runNext();
        };
    }
}

// 匯出具體的驗證函數
module.exports = ValidationMiddleware;

// 為了向後兼容，也匯出具體的驗證函數
module.exports.validateLogin = ValidationMiddleware.combine([
    ValidationMiddleware.validateRequired(['username', 'password']),
    ValidationMiddleware.validateStringLength('username', 3, 50),
    ValidationMiddleware.validatePassword('password')
]);

module.exports.validateUser = ValidationMiddleware.combine([
    ValidationMiddleware.validateRequired(['username', 'name', 'email', 'password']),
    ValidationMiddleware.validateStringLength('username', 3, 50),
    ValidationMiddleware.validateStringLength('name', 2, 100),
    ValidationMiddleware.validateEmail('email'),
    ValidationMiddleware.validatePassword('password')
]);

module.exports.validatePasswordReset = ValidationMiddleware.combine([
    ValidationMiddleware.validateRequired(['email']),
    ValidationMiddleware.validateEmail('email')
]);

module.exports.validateFinance = ValidationMiddleware.combine([
    ValidationMiddleware.validateRequired(['type', 'amount', 'date']),
    ValidationMiddleware.validateNumberRange('amount', 0.01), // 至少0.01
    ValidationMiddleware.validateDate('date'),
    ValidationMiddleware.sanitizeInput(['description', 'category', 'notes'])
]);

module.exports.validateActivity = ValidationMiddleware.combine([
    ValidationMiddleware.validateRequired(['title', 'description']),
    ValidationMiddleware.validateStringLength('title', 2, 200)
]);

module.exports.validateDesign = ValidationMiddleware.combine([
    ValidationMiddleware.validateRequired(['title', 'description']),
    ValidationMiddleware.validateStringLength('title', 2, 200)
]);

module.exports.validateId = ValidationMiddleware.validateId;

module.exports.validatePagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
            success: false,
            message: '分頁參數無效'
        });
    }
    
    req.query.page = page;
    req.query.limit = limit;
    next();
};

module.exports.validateDateRange = (req, res, next) => {
    const { start_date, end_date } = req.query;
    
    if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: '日期格式無效'
            });
        }
        
        if (start > end) {
            return res.status(400).json({
                success: false,
                message: '開始日期不能晚於結束日期'
            });
        }
    }
    
    next();
};