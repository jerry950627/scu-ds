/**
 * 驗證配置
 * 統一配置應用的資料驗證規則
 */

// 基本驗證規則
const basicRules = {
    // 字串驗證
    string: {
        minLength: 1,
        maxLength: 255,
        trim: true,
        allowEmpty: false,
        encoding: 'utf8'
    },
    
    // 長文字驗證
    text: {
        minLength: 0,
        maxLength: 10000,
        trim: true,
        allowEmpty: true,
        allowHtml: false
    },
    
    // 數字驗證
    number: {
        min: Number.MIN_SAFE_INTEGER,
        max: Number.MAX_SAFE_INTEGER,
        integer: false,
        positive: false,
        precision: null
    },
    
    // 整數驗證
    integer: {
        min: Number.MIN_SAFE_INTEGER,
        max: Number.MAX_SAFE_INTEGER,
        positive: false
    },
    
    // 布林值驗證
    boolean: {
        strict: false, // 是否嚴格模式（只接受 true/false）
        truthy: ['true', '1', 'yes', 'on'], // 被視為 true 的值
        falsy: ['false', '0', 'no', 'off'] // 被視為 false 的值
    },
    
    // 日期驗證
    date: {
        format: 'YYYY-MM-DD',
        min: null,
        max: null,
        allowFuture: true,
        allowPast: true
    },
    
    // 時間驗證
    time: {
        format: 'HH:mm:ss',
        min: null,
        max: null
    },
    
    // 日期時間驗證
    datetime: {
        format: 'YYYY-MM-DD HH:mm:ss',
        timezone: 'Asia/Taipei',
        min: null,
        max: null,
        allowFuture: true,
        allowPast: true
    }
};

// 格式驗證規則
const formatRules = {
    // 電子郵件
    email: {
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        maxLength: 254,
        allowedDomains: [], // 空陣列表示允許所有網域
        blockedDomains: [
            'tempmail.com',
            '10minutemail.com',
            'guerrillamail.com',
            'mailinator.com'
        ],
        normalize: true // 是否正規化（轉小寫、去空格）
    },
    
    // 手機號碼（台灣）
    phone: {
        pattern: /^09\d{8}$/,
        allowInternational: true,
        internationalPattern: /^\+886\d{9}$/,
        normalize: true
    },
    
    // 身分證字號（台灣）
    idNumber: {
        pattern: /^[A-Z][12]\d{8}$/,
        validateChecksum: true
    },
    
    // URL
    url: {
        protocols: ['http', 'https'],
        maxLength: 2048,
        allowedDomains: [],
        blockedDomains: [],
        requireTld: true
    },
    
    // IP 位址
    ip: {
        version: 'both', // 'v4', 'v6', 'both'
        allowPrivate: true,
        allowLoopback: true
    },
    
    // MAC 位址
    mac: {
        separator: ':', // ':', '-', ''
        uppercase: false
    },
    
    // 顏色代碼
    color: {
        formats: ['hex', 'rgb', 'rgba', 'hsl', 'hsla'],
        allowNamed: true
    },
    
    // 郵遞區號（台灣）
    zipCode: {
        pattern: /^\d{3}(\d{2})?$/,
        allowFiveDigit: true
    }
};

// 使用者相關驗證
const userValidation = {
    // 使用者名稱
    username: {
        minLength: 3,
        maxLength: 30,
        pattern: /^[a-zA-Z0-9_-]+$/,
        reservedNames: [
            'admin', 'root', 'user', 'test', 'guest',
            'administrator', 'moderator', 'system',
            'api', 'www', 'mail', 'ftp'
        ],
        caseSensitive: false
    },
    
    // 密碼
    password: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        forbiddenPatterns: [
            /^(.)\1+$/, // 重複字符
            /123456/, // 連續數字
            /abcdef/, // 連續字母
            /qwerty/ // 鍵盤順序
        ],
        forbiddenPasswords: [
            'password', '123456', 'admin', 'root',
            'qwerty', 'abc123', 'password123',
            '12345678', 'welcome', 'letmein'
        ],
        checkCommonPasswords: true,
        maxRepeatingChars: 3
    },
    
    // 顯示名稱
    displayName: {
        minLength: 1,
        maxLength: 50,
        pattern: /^[\w\s\u4e00-\u9fff\u3400-\u4dbf]+$/u,
        trim: true,
        allowEmoji: false
    },
    
    // 個人簡介
    bio: {
        maxLength: 500,
        allowHtml: false,
        allowUrls: true,
        allowMentions: true
    }
};

// 檔案驗證
const fileValidation = {
    // 圖片檔案
    image: {
        allowedTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml'
        ],
        maxSize: 5 * 1024 * 1024, // 5MB
        minWidth: 1,
        maxWidth: 4096,
        minHeight: 1,
        maxHeight: 4096,
        aspectRatio: null, // { min: 0.5, max: 2.0 }
        allowAnimated: true
    },
    
    // 文件檔案
    document: {
        allowedTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv'
        ],
        maxSize: 10 * 1024 * 1024, // 10MB
        scanVirus: process.env.NODE_ENV === 'production'
    },
    
    // 壓縮檔案
    archive: {
        allowedTypes: [
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/gzip',
            'application/x-tar'
        ],
        maxSize: 50 * 1024 * 1024, // 50MB
        scanContents: true
    },
    
    // 檔案名稱
    filename: {
        maxLength: 255,
        pattern: /^[a-zA-Z0-9._-]+$/,
        reservedNames: [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ],
        sanitize: true,
        addTimestamp: false
    }
};

// 業務邏輯驗證
const businessValidation = {
    // 活動相關
    activity: {
        title: {
            minLength: 5,
            maxLength: 100,
            pattern: /^[\w\s\u4e00-\u9fff\u3400-\u4dbf!?.,()-]+$/u
        },
        description: {
            minLength: 10,
            maxLength: 2000,
            allowHtml: true,
            allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
        },
        capacity: {
            min: 1,
            max: 10000,
            integer: true
        },
        fee: {
            min: 0,
            max: 100000,
            precision: 2
        },
        location: {
            maxLength: 200,
            allowCoordinates: true
        }
    },
    
    // 財務相關
    finance: {
        amount: {
            min: -1000000,
            max: 1000000,
            precision: 2,
            currency: 'TWD'
        },
        category: {
            allowedValues: [
                'income', 'expense', 'transfer',
                'investment', 'loan', 'other'
            ]
        },
        description: {
            minLength: 1,
            maxLength: 500
        },
        invoiceNumber: {
            pattern: /^[A-Z]{2}\d{8}$/,
            unique: true
        }
    },
    
    // 設計相關
    design: {
        title: {
            minLength: 3,
            maxLength: 100
        },
        category: {
            allowedValues: [
                'logo', 'poster', 'banner', 'brochure',
                'website', 'app', 'illustration', 'other'
            ]
        },
        tags: {
            maxCount: 10,
            maxLength: 20,
            pattern: /^[a-zA-Z0-9\u4e00-\u9fff]+$/u
        },
        dimensions: {
            width: { min: 1, max: 10000 },
            height: { min: 1, max: 10000 }
        }
    },
    
    // 公關相關
    pr: {
        title: {
            minLength: 5,
            maxLength: 150
        },
        content: {
            minLength: 50,
            maxLength: 5000,
            allowHtml: true
        },
        targetAudience: {
            allowedValues: [
                'students', 'faculty', 'staff',
                'alumni', 'public', 'media'
            ]
        },
        priority: {
            allowedValues: ['low', 'medium', 'high', 'urgent']
        }
    }
};

// 安全驗證
const securityValidation = {
    // SQL 注入防護
    sqlInjection: {
        enabled: true,
        patterns: [
            /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
            /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
            /(script|javascript|vbscript|onload|onerror|onclick)/i
        ],
        strictMode: process.env.NODE_ENV === 'production'
    },
    
    // XSS 防護
    xss: {
        enabled: true,
        allowedTags: [
            'p', 'br', 'strong', 'em', 'u', 'i',
            'ul', 'ol', 'li', 'h1', 'h2', 'h3',
            'blockquote', 'code', 'pre'
        ],
        allowedAttributes: {
            'a': ['href', 'title'],
            'img': ['src', 'alt', 'title', 'width', 'height']
        },
        stripTags: true
    },
    
    // CSRF 防護
    csrf: {
        enabled: true,
        tokenLength: 32,
        headerName: 'X-CSRF-Token',
        cookieName: '_csrf',
        ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
    },
    
    // 路徑遍歷防護
    pathTraversal: {
        enabled: true,
        patterns: [
            /\.\.[\/\\]/,
            /[\/\\]\.\.[\/\\]/,
            /\.\.$/
        ]
    }
};

// 自定義驗證器
const customValidators = {
    // 台灣身分證字號驗證
    taiwanId: function(value) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        
        const pattern = /^[A-Z][12]\d{8}$/;
        if (!pattern.test(value)) {
            return false;
        }
        
        // 檢查校驗碼
        const letters = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
        const letterValue = letters.indexOf(value[0]) + 10;
        const checksum = Math.floor(letterValue / 10) + 
                        (letterValue % 10) * 9 +
                        parseInt(value[1]) * 8 +
                        parseInt(value[2]) * 7 +
                        parseInt(value[3]) * 6 +
                        parseInt(value[4]) * 5 +
                        parseInt(value[5]) * 4 +
                        parseInt(value[6]) * 3 +
                        parseInt(value[7]) * 2 +
                        parseInt(value[8]) * 1 +
                        parseInt(value[9]);
        
        return checksum % 10 === 0;
    },
    
    // 統一編號驗證
    businessId: function(value) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        
        const pattern = /^\d{8}$/;
        if (!pattern.test(value)) {
            return false;
        }
        
        const weights = [1, 2, 1, 2, 1, 2, 4, 1];
        let sum = 0;
        
        for (let i = 0; i < 8; i++) {
            let product = parseInt(value[i]) * weights[i];
            sum += Math.floor(product / 10) + (product % 10);
        }
        
        return sum % 10 === 0 || (sum + 1) % 10 === 0;
    },
    
    // 信用卡號驗證（Luhn 算法）
    creditCard: function(value) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        
        const number = value.replace(/\D/g, '');
        if (number.length < 13 || number.length > 19) {
            return false;
        }
        
        let sum = 0;
        let isEven = false;
        
        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number[i]);
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    },
    
    // 密碼強度檢查
    passwordStrength: function(value) {
        if (!value || typeof value !== 'string') {
            return { valid: false, score: 0, feedback: ['密碼不能為空'] };
        }
        
        let score = 0;
        const feedback = [];
        
        // 長度檢查
        if (value.length >= 8) score += 1;
        else feedback.push('密碼長度至少需要 8 個字符');
        
        if (value.length >= 12) score += 1;
        
        // 字符類型檢查
        if (/[a-z]/.test(value)) score += 1;
        else feedback.push('需要包含小寫字母');
        
        if (/[A-Z]/.test(value)) score += 1;
        else feedback.push('需要包含大寫字母');
        
        if (/\d/.test(value)) score += 1;
        else feedback.push('需要包含數字');
        
        if (/[^\w\s]/.test(value)) score += 1;
        else feedback.push('需要包含特殊字符');
        
        // 複雜度檢查
        if (!/(..).*\1/.test(value)) score += 1;
        else feedback.push('不能包含重複的字符組合');
        
        return {
            valid: score >= 4,
            score: score,
            strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
            feedback: feedback
        };
    }
};

/**
 * 獲取驗證配置
 * @param {string} type 驗證類型
 * @returns {Object} 驗證配置
 */
function getValidationConfig(type) {
    const configs = {
        basic: basicRules,
        format: formatRules,
        user: userValidation,
        file: fileValidation,
        business: businessValidation,
        security: securityValidation
    };
    
    return type ? configs[type] : {
        basic: basicRules,
        format: formatRules,
        user: userValidation,
        file: fileValidation,
        business: businessValidation,
        security: securityValidation,
        custom: customValidators
    };
}

/**
 * 驗證資料
 * @param {any} value 要驗證的值
 * @param {Object} rules 驗證規則
 * @param {Object} options 選項
 * @returns {Object} 驗證結果
 */
function validateData(value, rules, options = {}) {
    const result = {
        valid: true,
        errors: [],
        warnings: [],
        sanitized: value
    };
    
    try {
        // 基本類型檢查
        if (rules.required && (value === null || value === undefined || value === '')) {
            result.valid = false;
            result.errors.push('此欄位為必填');
            return result;
        }
        
        // 如果值為空且非必填，直接返回
        if (!rules.required && (value === null || value === undefined || value === '')) {
            return result;
        }
        
        // 字串處理
        if (typeof value === 'string') {
            if (rules.trim) {
                result.sanitized = value.trim();
            }
            
            if (rules.minLength && result.sanitized.length < rules.minLength) {
                result.valid = false;
                result.errors.push(`長度不能少於 ${rules.minLength} 個字符`);
            }
            
            if (rules.maxLength && result.sanitized.length > rules.maxLength) {
                result.valid = false;
                result.errors.push(`長度不能超過 ${rules.maxLength} 個字符`);
            }
            
            if (rules.pattern && !rules.pattern.test(result.sanitized)) {
                result.valid = false;
                result.errors.push('格式不正確');
            }
        }
        
        // 數字處理
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(value))) {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            
            if (rules.min !== undefined && numValue < rules.min) {
                result.valid = false;
                result.errors.push(`值不能小於 ${rules.min}`);
            }
            
            if (rules.max !== undefined && numValue > rules.max) {
                result.valid = false;
                result.errors.push(`值不能大於 ${rules.max}`);
            }
            
            if (rules.integer && !Number.isInteger(numValue)) {
                result.valid = false;
                result.errors.push('必須是整數');
            }
        }
        
        // 陣列處理
        if (Array.isArray(value)) {
            if (rules.minLength && value.length < rules.minLength) {
                result.valid = false;
                result.errors.push(`至少需要 ${rules.minLength} 個項目`);
            }
            
            if (rules.maxLength && value.length > rules.maxLength) {
                result.valid = false;
                result.errors.push(`最多只能有 ${rules.maxLength} 個項目`);
            }
        }
        
        // 自定義驗證器
        if (rules.custom && typeof rules.custom === 'function') {
            const customResult = rules.custom(result.sanitized);
            if (typeof customResult === 'boolean') {
                if (!customResult) {
                    result.valid = false;
                    result.errors.push('自定義驗證失敗');
                }
            } else if (typeof customResult === 'object') {
                if (!customResult.valid) {
                    result.valid = false;
                    result.errors.push(...(customResult.errors || ['自定義驗證失敗']));
                }
                if (customResult.warnings) {
                    result.warnings.push(...customResult.warnings);
                }
            }
        }
        
    } catch (error) {
        result.valid = false;
        result.errors.push('驗證過程發生錯誤');
        console.error('驗證錯誤:', error);
    }
    
    return result;
}

module.exports = {
    getValidationConfig,
    validateData,
    basicRules,
    formatRules,
    userValidation,
    fileValidation,
    businessValidation,
    securityValidation,
    customValidators
};