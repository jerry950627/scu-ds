/**
 * 日誌配置
 * 統一配置應用的日誌系統
 */

const path = require('path');
const fs = require('fs');

// 確保日誌目錄存在
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 日誌級別配置
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
};

// 日誌顏色配置
const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey'
};

// 基本日誌配置
const baseConfig = {
    // 日誌級別
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    
    // 日誌格式
    format: {
        // 時間戳格式
        timestamp: 'YYYY-MM-DD HH:mm:ss',
        
        // 是否包含堆疊追蹤
        includeStack: process.env.NODE_ENV === 'development',
        
        // 是否美化輸出
        prettyPrint: process.env.NODE_ENV === 'development',
        
        // 是否包含調用者信息
        includeCaller: process.env.NODE_ENV === 'development'
    },
    
    // 日誌輸出目標
    transports: {
        console: {
            enabled: true,
            level: process.env.CONSOLE_LOG_LEVEL || 'debug',
            colorize: process.env.NODE_ENV === 'development',
            handleExceptions: true,
            handleRejections: true
        },
        
        file: {
            enabled: true,
            level: process.env.FILE_LOG_LEVEL || 'info',
            maxSize: '20m',
            maxFiles: 5,
            tailable: true,
            zippedArchive: true
        },
        
        error: {
            enabled: true,
            level: 'error',
            maxSize: '20m',
            maxFiles: 10,
            tailable: true,
            zippedArchive: true
        }
    },
    
    // 異常處理
    exceptions: {
        handleExceptions: true,
        handleRejections: true,
        exitOnError: false
    }
};

// 應用日誌配置
const appLogConfig = {
    // 應用日誌
    app: {
        filename: path.join(logDir, 'app.log'),
        level: 'info',
        maxSize: '20m',
        maxFiles: 5,
        format: 'combined'
    },
    
    // 錯誤日誌
    error: {
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxSize: '20m',
        maxFiles: 10,
        format: 'detailed'
    },
    
    // 存取日誌
    access: {
        filename: path.join(logDir, 'access.log'),
        level: 'http',
        maxSize: '50m',
        maxFiles: 7,
        format: 'combined'
    },
    
    // 安全日誌
    security: {
        filename: path.join(logDir, 'security.log'),
        level: 'warn',
        maxSize: '20m',
        maxFiles: 30,
        format: 'detailed'
    },
    
    // 審計日誌
    audit: {
        filename: path.join(logDir, 'audit.log'),
        level: 'info',
        maxSize: '50m',
        maxFiles: 365,
        format: 'json'
    },
    
    // 效能日誌
    performance: {
        filename: path.join(logDir, 'performance.log'),
        level: 'info',
        maxSize: '20m',
        maxFiles: 7,
        format: 'json'
    },
    
    // 資料庫日誌
    database: {
        filename: path.join(logDir, 'database.log'),
        level: 'debug',
        maxSize: '20m',
        maxFiles: 5,
        format: 'detailed'
    }
};

// 模組日誌配置
const moduleLogConfig = {
    // 認證模組
    auth: {
        filename: path.join(logDir, 'modules/auth.log'),
        level: 'info',
        maxSize: '10m',
        maxFiles: 5
    },
    
    // 活動模組
    activity: {
        filename: path.join(logDir, 'modules/activity.log'),
        level: 'info',
        maxSize: '10m',
        maxFiles: 5
    },
    
    // 財務模組
    finance: {
        filename: path.join(logDir, 'modules/finance.log'),
        level: 'info',
        maxSize: '10m',
        maxFiles: 10 // 財務日誌保留更久
    },
    
    // 秘書模組
    secretary: {
        filename: path.join(logDir, 'modules/secretary.log'),
        level: 'info',
        maxSize: '10m',
        maxFiles: 5
    },
    
    // 設計模組
    design: {
        filename: path.join(logDir, 'modules/design.log'),
        level: 'info',
        maxSize: '10m',
        maxFiles: 5
    },
    
    // 公關模組
    pr: {
        filename: path.join(logDir, 'modules/pr.log'),
        level: 'info',
        maxSize: '10m',
        maxFiles: 5
    },
    
    // 管理模組
    admin: {
        filename: path.join(logDir, 'modules/admin.log'),
        level: 'info',
        maxSize: '10m',
        maxFiles: 10
    },
    
    // 歷史記錄模組
    history: {
        filename: path.join(logDir, 'modules/history.log'),
        level: 'info',
        maxSize: '20m',
        maxFiles: 30
    }
};

// 日誌格式配置
const formatConfig = {
    // 簡單格式
    simple: {
        template: '${timestamp} [${level}] ${message}',
        colorize: true
    },
    
    // 詳細格式
    detailed: {
        template: '${timestamp} [${level}] [${label}] ${message}',
        includeStack: true,
        includeCaller: true,
        colorize: false
    },
    
    // 組合格式
    combined: {
        template: '${timestamp} [${level}] [${module}] ${message} ${meta}',
        includeStack: false,
        colorize: false
    },
    
    // JSON 格式
    json: {
        stringify: true,
        space: process.env.NODE_ENV === 'development' ? 2 : 0,
        includeStack: true
    },
    
    // 開發格式
    development: {
        template: '${timestamp} [${level}] ${message}',
        colorize: true,
        prettyPrint: true,
        includeStack: true
    },
    
    // 生產格式
    production: {
        template: '${timestamp} [${level}] [${hostname}] [${pid}] ${message}',
        colorize: false,
        includeStack: false
    }
};

// 日誌過濾配置
const filterConfig = {
    // 敏感資料過濾
    sensitive: {
        enabled: true,
        fields: [
            'password',
            'token',
            'secret',
            'key',
            'authorization',
            'cookie',
            'session'
        ],
        replacement: '[FILTERED]'
    },
    
    // 個人資料過濾
    personal: {
        enabled: process.env.NODE_ENV === 'production',
        fields: [
            'email',
            'phone',
            'address',
            'idNumber'
        ],
        replacement: '[REDACTED]'
    },
    
    // 雜訊過濾
    noise: {
        enabled: true,
        patterns: [
            /favicon\.ico/,
            /robots\.txt/,
            /health$/,
            /ping$/
        ]
    }
};

// 日誌輪轉配置
const rotationConfig = {
    // 按大小輪轉
    size: {
        enabled: true,
        maxSize: '20m',
        maxFiles: 5
    },
    
    // 按時間輪轉
    time: {
        enabled: true,
        frequency: 'daily',
        maxFiles: '30d'
    },
    
    // 壓縮設定
    compression: {
        enabled: true,
        algorithm: 'gzip'
    },
    
    // 清理設定
    cleanup: {
        enabled: true,
        maxAge: '90d',
        maxSize: '1g'
    }
};

// 監控配置
const monitoringConfig = {
    // 效能監控
    performance: {
        enabled: true,
        slowThreshold: 1000, // 慢請求閾值（毫秒）
        memoryThreshold: 100 * 1024 * 1024, // 記憶體使用閾值（位元組）
        cpuThreshold: 80 // CPU 使用率閾值（百分比）
    },
    
    // 錯誤監控
    error: {
        enabled: true,
        alertThreshold: 10, // 錯誤數量閾值
        alertWindow: 60000, // 監控窗口（毫秒）
        includeStack: true
    },
    
    // 安全監控
    security: {
        enabled: true,
        suspiciousPatterns: [
            /sql injection/i,
            /xss/i,
            /csrf/i,
            /unauthorized/i,
            /forbidden/i
        ],
        alertOnMatch: true
    }
};

// 外部日誌服務配置
const externalConfig = {
    // Elasticsearch
    elasticsearch: {
        enabled: process.env.ELASTICSEARCH_ENABLED === 'true',
        host: process.env.ELASTICSEARCH_HOST || 'localhost:9200',
        index: process.env.ELASTICSEARCH_INDEX || 'scu-ds-logs',
        type: '_doc',
        level: 'info'
    },
    
    // Syslog
    syslog: {
        enabled: process.env.SYSLOG_ENABLED === 'true',
        host: process.env.SYSLOG_HOST || 'localhost',
        port: process.env.SYSLOG_PORT || 514,
        protocol: process.env.SYSLOG_PROTOCOL || 'udp4',
        facility: 'local0'
    },
    
    // HTTP 日誌服務
    http: {
        enabled: process.env.HTTP_LOG_ENABLED === 'true',
        url: process.env.HTTP_LOG_URL,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.HTTP_LOG_TOKEN
        },
        timeout: 5000
    }
};

/**
 * 獲取日誌配置
 * @param {string} environment 環境名稱
 * @returns {Object} 日誌配置
 */
function getLogConfig(environment = process.env.NODE_ENV) {
    const config = {
        levels: logLevels,
        colors: logColors,
        base: baseConfig,
        app: appLogConfig,
        modules: moduleLogConfig,
        formats: formatConfig,
        filters: filterConfig,
        rotation: rotationConfig,
        monitoring: monitoringConfig,
        external: externalConfig
    };
    
    // 根據環境調整配置
    if (environment === 'development') {
        config.base.level = 'debug';
        config.base.format.prettyPrint = true;
        config.base.format.colorize = true;
    } else if (environment === 'production') {
        config.base.level = 'info';
        config.base.format.prettyPrint = false;
        config.base.format.colorize = false;
        config.filters.personal.enabled = true;
    } else if (environment === 'test') {
        config.base.level = 'error';
        config.base.transports.console.enabled = false;
    }
    
    return config;
}

/**
 * 創建日誌目錄
 * @param {Object} config 日誌配置
 */
function createLogDirectories(config) {
    const directories = new Set();
    
    // 收集所有日誌檔案的目錄
    Object.values(config.app).forEach(logConfig => {
        if (logConfig.filename) {
            directories.add(path.dirname(logConfig.filename));
        }
    });
    
    Object.values(config.modules).forEach(logConfig => {
        if (logConfig.filename) {
            directories.add(path.dirname(logConfig.filename));
        }
    });
    
    // 創建目錄
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ 創建日誌目錄: ${dir}`);
        }
    });
}

/**
 * 驗證日誌配置
 * @param {Object} config 日誌配置
 * @returns {Boolean} 是否有效
 */
function validateLogConfig(config) {
    try {
        // 檢查日誌級別
        if (!config.levels || typeof config.levels !== 'object') {
            throw new Error('無效的日誌級別配置');
        }
        
        // 檢查日誌目錄權限
        const testFile = path.join(logDir, 'test.log');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        
        // 創建必要的目錄
        createLogDirectories(config);
        
        return true;
    } catch (error) {
        console.error('日誌配置驗證失敗:', error.message);
        return false;
    }
}

/**
 * 獲取日誌統計信息
 * @returns {Object} 日誌統計
 */
function getLogStats() {
    const stats = {
        totalSize: 0,
        fileCount: 0,
        oldestFile: null,
        newestFile: null,
        files: []
    };
    
    try {
        if (fs.existsSync(logDir)) {
            const files = fs.readdirSync(logDir, { recursive: true });
            
            files.forEach(file => {
                const filePath = path.join(logDir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isFile()) {
                    stats.totalSize += stat.size;
                    stats.fileCount++;
                    
                    const fileInfo = {
                        name: file,
                        size: stat.size,
                        created: stat.birthtime,
                        modified: stat.mtime
                    };
                    
                    stats.files.push(fileInfo);
                    
                    if (!stats.oldestFile || stat.birthtime < stats.oldestFile.created) {
                        stats.oldestFile = fileInfo;
                    }
                    
                    if (!stats.newestFile || stat.birthtime > stats.newestFile.created) {
                        stats.newestFile = fileInfo;
                    }
                }
            });
        }
    } catch (error) {
        console.error('獲取日誌統計失敗:', error.message);
    }
    
    return stats;
}

module.exports = {
    getLogConfig,
    validateLogConfig,
    createLogDirectories,
    getLogStats,
    logLevels,
    logColors,
    baseConfig,
    appLogConfig,
    moduleLogConfig,
    formatConfig,
    filterConfig,
    rotationConfig,
    monitoringConfig,
    externalConfig
};