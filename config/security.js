/**
 * 安全配置
 * 統一配置應用的安全設定
 */

const crypto = require('crypto');

// 認證配置
const authConfig = {
    // JWT 配置
    jwt: {
        secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: process.env.JWT_ISSUER || 'scu-ds',
        audience: process.env.JWT_AUDIENCE || 'scu-ds-users',
        algorithm: 'HS256'
    },
    
    // Session 配置
    session: {
        secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
        name: 'scu-ds-session',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24小時
            sameSite: 'strict'
        },
        // Session 存儲配置
        store: {
            type: process.env.SESSION_STORE || 'memory', // memory, redis, database
            options: {
                // Redis 配置（如果使用）
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
                db: process.env.REDIS_DB || 0,
                prefix: 'scu-ds:sess:'
            }
        }
    },
    
    // 密碼配置
    password: {
        // bcrypt 配置
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
        
        // 密碼強度要求
        requirements: {
            minLength: 8,
            maxLength: 128,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            forbiddenPasswords: [
                'password', '123456', 'admin', 'root', 'user',
                'qwerty', 'abc123', 'password123'
            ]
        },
        
        // 密碼重置配置
        reset: {
            tokenLength: 32,
            tokenExpiry: 60 * 60 * 1000, // 1小時
            maxAttempts: 5,
            lockoutDuration: 15 * 60 * 1000 // 15分鐘
        }
    },
    
    // 兩步驗證配置
    twoFactor: {
        enabled: process.env.TWO_FACTOR_ENABLED === 'true',
        issuer: 'SCU-DS',
        window: 2, // 允許的時間窗口
        tokenLength: 6,
        backupCodesCount: 10
    },
    
    // 登入嘗試限制
    loginAttempts: {
        maxAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15分鐘
        progressiveDelay: true,
        trackByIp: true,
        trackByUsername: true
    }
};

// CORS 配置
const corsConfig = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        // 開發環境允許所有來源
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        // 生產環境檢查白名單
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('不允許的 CORS 來源'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-CSRF-Token',
        'X-Requested-With'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400 // 24小時
};

// CSP (Content Security Policy) 配置
const cspConfig = {
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            "'unsafe-inline'", // 開發環境可能需要
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com'
        ],
        styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
            'https://cdn.jsdelivr.net'
        ],
        fontSrc: [
            "'self'",
            'https://fonts.gstatic.com',
            'data:'
        ],
        imgSrc: [
            "'self'",
            'data:',
            'https:',
            'blob:'
        ],
        connectSrc: [
            "'self'",
            'https://api.github.com' // 如果需要外部 API
        ],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"]
    },
    reportOnly: process.env.NODE_ENV === 'development'
};

// 速率限制配置
const rateLimitConfig = {
    // 全域速率限制
    global: {
        windowMs: 15 * 60 * 1000, // 15分鐘
        max: 1000, // 每個 IP 最多 1000 次請求
        message: {
            error: '請求過於頻繁，請稍後再試',
            retryAfter: '15分鐘'
        },
        standardHeaders: true,
        legacyHeaders: false
    },
    
    // API 速率限制
    api: {
        windowMs: 15 * 60 * 1000, // 15分鐘
        max: 500, // 每個 IP 最多 500 次 API 請求
        message: {
            error: 'API 請求過於頻繁，請稍後再試',
            retryAfter: '15分鐘'
        }
    },
    
    // 登入速率限制
    login: {
        windowMs: 15 * 60 * 1000, // 15分鐘
        max: 10, // 每個 IP 最多 10 次登入嘗試
        skipSuccessfulRequests: true,
        message: {
            error: '登入嘗試過於頻繁，請稍後再試',
            retryAfter: '15分鐘'
        }
    },
    
    // 註冊速率限制
    register: {
        windowMs: 60 * 60 * 1000, // 1小時
        max: 5, // 每個 IP 最多 5 次註冊嘗試
        message: {
            error: '註冊嘗試過於頻繁，請稍後再試',
            retryAfter: '1小時'
        }
    },
    
    // 密碼重置速率限制
    passwordReset: {
        windowMs: 60 * 60 * 1000, // 1小時
        max: 3, // 每個 IP 最多 3 次密碼重置請求
        message: {
            error: '密碼重置請求過於頻繁，請稍後再試',
            retryAfter: '1小時'
        }
    }
};

// 檔案上傳安全配置
const uploadConfig = {
    // 允許的檔案類型
    allowedMimeTypes: [
        // 圖片
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        // 文件
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // 壓縮檔
        'application/zip',
        'application/x-rar-compressed',
        // 文字檔
        'text/plain',
        'text/csv'
    ],
    
    // 檔案大小限制（位元組）
    maxFileSize: {
        image: 5 * 1024 * 1024, // 5MB
        document: 10 * 1024 * 1024, // 10MB
        archive: 50 * 1024 * 1024, // 50MB
        default: 2 * 1024 * 1024 // 2MB
    },
    
    // 檔案名稱安全
    filename: {
        maxLength: 255,
        allowedChars: /^[a-zA-Z0-9._-]+$/,
        sanitize: true,
        addTimestamp: true
    },
    
    // 病毒掃描（如果啟用）
    virusScanning: {
        enabled: process.env.VIRUS_SCANNING_ENABLED === 'true',
        quarantineDir: './quarantine',
        scanTimeout: 30000
    }
};

// 加密配置
const encryptionConfig = {
    // 對稱加密
    symmetric: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16
    },
    
    // 非對稱加密
    asymmetric: {
        algorithm: 'rsa',
        keySize: 2048,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        hash: 'sha256'
    },
    
    // 雜湊
    hashing: {
        algorithm: 'sha256',
        iterations: 100000,
        keyLength: 64,
        saltLength: 32
    }
};

// 安全標頭配置
const securityHeadersConfig = {
    // Helmet.js 配置
    helmet: {
        contentSecurityPolicy: cspConfig,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: { policy: 'cross-origin' },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        dnsPrefetchControl: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: false,
        referrerPolicy: { policy: 'no-referrer' },
        xssFilter: true
    },
    
    // 自定義安全標頭
    custom: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
};

// 輸入驗證配置
const validationConfig = {
    // 字串驗證
    string: {
        maxLength: 10000,
        allowedChars: /^[\w\s\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}\u{30000}-\u{3134f}.,!?;:()\[\]{}"'-]+$/u,
        sanitize: true
    },
    
    // 數字驗證
    number: {
        min: Number.MIN_SAFE_INTEGER,
        max: Number.MAX_SAFE_INTEGER,
        precision: 10
    },
    
    // 電子郵件驗證
    email: {
        maxLength: 254,
        allowedDomains: [], // 空陣列表示允許所有網域
        blockedDomains: ['tempmail.com', '10minutemail.com']
    },
    
    // URL 驗證
    url: {
        protocols: ['http', 'https'],
        maxLength: 2048,
        allowedDomains: [] // 空陣列表示允許所有網域
    }
};

// 審計日誌配置
const auditConfig = {
    enabled: true,
    
    // 記錄的事件類型
    events: {
        authentication: true,
        authorization: true,
        dataAccess: true,
        dataModification: true,
        systemChanges: true,
        securityEvents: true
    },
    
    // 日誌存儲
    storage: {
        type: 'database', // file, database, external
        retention: 365, // 保留天數
        compression: true,
        encryption: true
    },
    
    // 敏感資料遮罩
    masking: {
        enabled: true,
        fields: ['password', 'token', 'secret', 'key'],
        maskChar: '*',
        showLastChars: 4
    }
};

/**
 * 獲取安全配置
 * @param {string} environment 環境名稱
 * @returns {Object} 安全配置
 */
function getSecurityConfig(environment = process.env.NODE_ENV) {
    const config = {
        auth: authConfig,
        cors: corsConfig,
        csp: cspConfig,
        rateLimit: rateLimitConfig,
        upload: uploadConfig,
        encryption: encryptionConfig,
        headers: securityHeadersConfig,
        validation: validationConfig,
        audit: auditConfig
    };
    
    // 根據環境調整配置
    if (environment === 'development') {
        // 開發環境放寬一些限制
        config.cors.origin = true;
        config.csp.reportOnly = true;
        config.rateLimit.global.max = 10000;
    } else if (environment === 'production') {
        // 生產環境加強安全
        config.auth.session.cookie.secure = true;
        config.headers.helmet.hsts.maxAge = 31536000;
    }
    
    return config;
}

/**
 * 驗證安全配置
 * @param {Object} config 安全配置
 * @returns {Boolean} 是否有效
 */
function validateSecurityConfig(config) {
    try {
        // 檢查必要的密鑰
        if (!config.auth.jwt.secret || config.auth.jwt.secret.length < 32) {
            throw new Error('JWT 密鑰長度不足');
        }
        
        if (!config.auth.session.secret || config.auth.session.secret.length < 32) {
            throw new Error('Session 密鑰長度不足');
        }
        
        // 檢查生產環境設定
        if (process.env.NODE_ENV === 'production') {
            if (!config.auth.session.cookie.secure) {
                console.warn('⚠️  生產環境建議啟用 secure cookies');
            }
            
            if (config.cors.origin === true) {
                console.warn('⚠️  生產環境不建議允許所有 CORS 來源');
            }
        }
        
        return true;
    } catch (error) {
        console.error('安全配置驗證失敗:', error.message);
        return false;
    }
}

module.exports = {
    getSecurityConfig,
    validateSecurityConfig,
    authConfig,
    corsConfig,
    cspConfig,
    rateLimitConfig,
    uploadConfig,
    encryptionConfig,
    securityHeadersConfig,
    validationConfig,
    auditConfig
};