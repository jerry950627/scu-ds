/**
 * 配置管理入口文件
 * 統一管理和驗證所有配置模組
 */

const path = require('path');
const fs = require('fs');

// 導入所有配置模組
const appConfig = require('./app');
const authConfig = require('./auth');
const databaseConfig = require('./database');
const { getSecurityConfig, validateSecurityConfig } = require('./security');
const { getCacheConfig, validateCacheConfig } = require('./cache');
const { getLogConfig, validateLogConfig } = require('./logging');
// validation 配置已移至 middleware/validation.js

/**
 * 獲取完整的應用配置
 * @param {string} environment 環境名稱
 * @returns {Object} 完整配置對象
 */
function getConfig(environment = process.env.NODE_ENV || 'development') {
    const config = {
        app: appConfig,
        auth: authConfig,
        database: databaseConfig,
        security: getSecurityConfig(environment),
        cache: getCacheConfig(),
        logging: getLogConfig(environment),
        // validation 已移至 middleware
    };

    // 根據環境調整配置
    if (environment === 'development') {
        config.app.debug = true;
        config.logging.level = 'debug';
    } else if (environment === 'production') {
        config.app.debug = false;
        config.logging.level = 'info';
        config.security.auth.session.cookie.secure = true;
    }

    return config;
}

/**
 * 驗證所有配置
 * @param {Object} config 配置對象
 * @returns {Object} 驗證結果
 */
function validateAllConfigs(config = null) {
    if (!config) {
        config = getConfig();
    }

    const results = {
        valid: true,
        errors: [],
        warnings: []
    };

    try {
        // 驗證安全配置
        if (!validateSecurityConfig(config.security)) {
            results.valid = false;
            results.errors.push('安全配置驗證失敗');
        }

        // 驗證快取配置
        if (!validateCacheConfig(config.cache)) {
            results.valid = false;
            results.errors.push('快取配置驗證失敗');
        }

        // 驗證日誌配置
        if (!validateLogConfig(config.logging)) {
            results.valid = false;
            results.errors.push('日誌配置驗證失敗');
        }

        // 檢查必要的環境變數
        const requiredEnvVars = [
            'NODE_ENV',
            'PORT'
        ];

        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingEnvVars.length > 0) {
            results.warnings.push(`缺少環境變數: ${missingEnvVars.join(', ')}`);
        }

        // 檢查生產環境特定配置
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
                results.errors.push('生產環境需要設置足夠長度的 JWT_SECRET');
                results.valid = false;
            }

            if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
                results.errors.push('生產環境需要設置足夠長度的 SESSION_SECRET');
                results.valid = false;
            }

            if (!config.security.auth.session.cookie.secure) {
                results.warnings.push('生產環境建議啟用 secure cookies');
            }
        }

        // 檢查資料庫文件路徑
        const dbPath = path.dirname(config.database.sqlite.path);
        if (!fs.existsSync(dbPath)) {
            try {
                fs.mkdirSync(dbPath, { recursive: true });
                results.warnings.push(`已創建資料庫目錄: ${dbPath}`);
            } catch (error) {
                results.errors.push(`無法創建資料庫目錄: ${dbPath}`);
                results.valid = false;
            }
        }

        // 檢查上傳目錄
        config.app.upload.directories.forEach(dir => {
            const uploadPath = path.join(__dirname, '..', dir);
            if (!fs.existsSync(uploadPath)) {
                try {
                    fs.mkdirSync(uploadPath, { recursive: true });
                    results.warnings.push(`已創建上傳目錄: ${uploadPath}`);
                } catch (error) {
                    results.errors.push(`無法創建上傳目錄: ${uploadPath}`);
                    results.valid = false;
                }
            }
        });

    } catch (error) {
        results.valid = false;
        results.errors.push(`配置驗證過程發生錯誤: ${error.message}`);
    }

    return results;
}

/**
 * 初始化配置
 * 在應用啟動時調用，驗證並設置配置
 */
function initializeConfig() {
    console.log('🔧 正在初始化配置...');
    
    const config = getConfig();
    const validation = validateAllConfigs(config);

    // 輸出驗證結果
    if (validation.warnings.length > 0) {
        console.log('⚠️  配置警告:');
        validation.warnings.forEach(warning => {
            console.log(`   - ${warning}`);
        });
    }

    if (!validation.valid) {
        console.error('❌ 配置驗證失敗:');
        validation.errors.forEach(error => {
            console.error(`   - ${error}`);
        });
        throw new Error('配置驗證失敗，無法啟動應用');
    }

    console.log('✅ 配置初始化完成');
    return config;
}

/**
 * 獲取環境特定配置
 * @param {string} key 配置鍵
 * @param {*} defaultValue 預設值
 * @returns {*} 配置值
 */
function getEnvConfig(key, defaultValue = null) {
    return process.env[key] || defaultValue;
}

/**
 * 檢查是否為開發環境
 * @returns {boolean}
 */
function isDevelopment() {
    return process.env.NODE_ENV === 'development';
}

/**
 * 檢查是否為生產環境
 * @returns {boolean}
 */
function isProduction() {
    return process.env.NODE_ENV === 'production';
}

/**
 * 檢查是否為測試環境
 * @returns {boolean}
 */
function isTest() {
    return process.env.NODE_ENV === 'test';
}

module.exports = {
    getConfig,
    validateAllConfigs,
    initializeConfig,
    getEnvConfig,
    isDevelopment,
    isProduction,
    isTest,
    
    // 直接導出各個配置模組
    app: appConfig,
    auth: authConfig,
    database: databaseConfig
};