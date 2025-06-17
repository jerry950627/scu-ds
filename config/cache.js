/**
 * 快取配置
 * 統一配置應用的快取系統
 */

const path = require('path');

// 基本快取配置
const baseConfig = {
    // 預設快取類型
    defaultType: process.env.CACHE_TYPE || 'memory',
    
    // 快取前綴
    prefix: process.env.CACHE_PREFIX || 'scu-ds:',
    
    // 預設 TTL（秒）
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL) || 300, // 5分鐘
    
    // 是否啟用快取
    enabled: process.env.CACHE_ENABLED !== 'false',
    
    // 快取統計
    enableStats: process.env.NODE_ENV === 'development',
    
    // 快取壓縮
    compression: {
        enabled: process.env.CACHE_COMPRESSION === 'true',
        algorithm: 'gzip',
        threshold: 1024 // 超過 1KB 才壓縮
    },
    
    // 序列化設定
    serialization: {
        type: 'json', // json, msgpack, pickle
        options: {
            space: 0, // JSON 格式化空格
            replacer: null // JSON 替換函數
        }
    }
};

// 記憶體快取配置
const memoryConfig = {
    // 最大快取項目數
    maxItems: parseInt(process.env.MEMORY_CACHE_MAX_ITEMS) || 1000,
    
    // 最大記憶體使用量（MB）
    maxMemory: parseInt(process.env.MEMORY_CACHE_MAX_MEMORY) || 100,
    
    // 清理策略
    evictionPolicy: 'lru', // lru, lfu, fifo, random
    
    // 清理間隔（毫秒）
    cleanupInterval: 60000, // 1分鐘
    
    // 統計設定
    stats: {
        enabled: true,
        resetInterval: 3600000 // 1小時重置統計
    },
    
    // 預熱設定
    preload: {
        enabled: false,
        keys: [] // 需要預熱的快取鍵
    }
};

// Redis 快取配置
const redisConfig = {
    // 連接設定
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        family: 4, // IPv4
        keepAlive: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3
    },
    
    // 連接池設定
    pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000
    },
    
    // 叢集設定
    cluster: {
        enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
        nodes: process.env.REDIS_CLUSTER_NODES ? 
               process.env.REDIS_CLUSTER_NODES.split(',') : [],
        options: {
            enableOfflineQueue: false,
            redisOptions: {
                password: process.env.REDIS_PASSWORD
            }
        }
    },
    
    // 哨兵設定
    sentinel: {
        enabled: process.env.REDIS_SENTINEL_ENABLED === 'true',
        sentinels: process.env.REDIS_SENTINELS ? 
                  JSON.parse(process.env.REDIS_SENTINELS) : [],
        name: process.env.REDIS_SENTINEL_NAME || 'mymaster'
    },
    
    // 重試設定
    retry: {
        attempts: 3,
        delay: 1000,
        factor: 2,
        maxDelay: 10000
    }
};

// 檔案快取配置
const fileConfig = {
    // 快取目錄
    directory: path.join(__dirname, '../cache'),
    
    // 檔案格式
    format: 'json', // json, binary
    
    // 檔案權限
    permissions: 0o644,
    
    // 目錄權限
    directoryPermissions: 0o755,
    
    // 最大檔案大小（MB）
    maxFileSize: 10,
    
    // 最大檔案數量
    maxFiles: 10000,
    
    // 清理設定
    cleanup: {
        enabled: true,
        interval: 3600000, // 1小時
        maxAge: 86400000, // 24小時
        maxSize: 1024 * 1024 * 1024 // 1GB
    },
    
    // 壓縮設定
    compression: {
        enabled: true,
        algorithm: 'gzip',
        level: 6
    }
};

// 多層快取配置
const tieredConfig = {
    // 啟用多層快取
    enabled: process.env.TIERED_CACHE_ENABLED === 'true',
    
    // 快取層級
    tiers: [
        {
            name: 'L1',
            type: 'memory',
            ttl: 60, // 1分鐘
            maxItems: 100
        },
        {
            name: 'L2',
            type: 'redis',
            ttl: 300, // 5分鐘
            maxItems: 1000
        },
        {
            name: 'L3',
            type: 'file',
            ttl: 3600, // 1小時
            maxItems: 10000
        }
    ],
    
    // 升級策略
    promotion: {
        enabled: true,
        threshold: 3, // 存取次數閾值
        cooldown: 300 // 冷卻時間（秒）
    },
    
    // 降級策略
    demotion: {
        enabled: true,
        threshold: 86400, // 未存取時間閾值（秒）
        batchSize: 100
    }
};

// 快取策略配置
const strategyConfig = {
    // 寫入策略
    writeStrategy: {
        // 寫入模式：write-through, write-back, write-around
        mode: process.env.CACHE_WRITE_MODE || 'write-through',
        
        // 批次寫入
        batch: {
            enabled: false,
            size: 100,
            timeout: 5000
        },
        
        // 非同步寫入
        async: {
            enabled: process.env.CACHE_ASYNC_WRITE === 'true',
            queueSize: 1000,
            workers: 2
        }
    },
    
    // 讀取策略
    readStrategy: {
        // 讀取模式：cache-aside, read-through
        mode: process.env.CACHE_READ_MODE || 'cache-aside',
        
        // 預取設定
        prefetch: {
            enabled: false,
            patterns: [], // 預取模式
            maxItems: 50
        },
        
        // 回退策略
        fallback: {
            enabled: true,
            timeout: 5000,
            retries: 2
        }
    },
    
    // 失效策略
    invalidation: {
        // 失效模式：ttl, manual, event-based
        mode: 'ttl',
        
        // 事件驅動失效
        events: {
            enabled: false,
            patterns: {
                'user:*': ['user.updated', 'user.deleted'],
                'activity:*': ['activity.updated', 'activity.deleted']
            }
        },
        
        // 標籤失效
        tags: {
            enabled: true,
            separator: ':',
            maxTags: 10
        }
    }
};

// 快取分區配置
const partitionConfig = {
    // 啟用分區
    enabled: process.env.CACHE_PARTITION_ENABLED === 'true',
    
    // 分區策略
    strategy: 'hash', // hash, range, list
    
    // 分區數量
    count: parseInt(process.env.CACHE_PARTITION_COUNT) || 4,
    
    // 雜湊函數
    hashFunction: 'crc32',
    
    // 分區配置
    partitions: {
        // 使用者相關快取
        users: {
            pattern: 'user:*',
            ttl: 1800, // 30分鐘
            maxItems: 1000
        },
        
        // 活動相關快取
        activities: {
            pattern: 'activity:*',
            ttl: 600, // 10分鐘
            maxItems: 500
        },
        
        // 財務相關快取
        finance: {
            pattern: 'finance:*',
            ttl: 3600, // 1小時
            maxItems: 200
        },
        
        // 系統快取
        system: {
            pattern: 'system:*',
            ttl: 7200, // 2小時
            maxItems: 100
        }
    }
};

// 監控配置
const monitoringConfig = {
    // 啟用監控
    enabled: process.env.CACHE_MONITORING_ENABLED !== 'false',
    
    // 指標收集
    metrics: {
        enabled: true,
        interval: 60000, // 1分鐘
        retention: 86400000, // 24小時
        
        // 收集的指標
        collect: {
            hitRate: true,
            missRate: true,
            evictionRate: true,
            memoryUsage: true,
            operationLatency: true,
            errorRate: true
        }
    },
    
    // 警報設定
    alerts: {
        enabled: process.env.NODE_ENV === 'production',
        
        // 警報閾值
        thresholds: {
            hitRate: 0.8, // 命中率低於 80%
            memoryUsage: 0.9, // 記憶體使用率超過 90%
            errorRate: 0.05, // 錯誤率超過 5%
            latency: 1000 // 延遲超過 1 秒
        },
        
        // 通知設定
        notifications: {
            email: process.env.ALERT_EMAIL,
            webhook: process.env.ALERT_WEBHOOK,
            cooldown: 300000 // 5分鐘冷卻時間
        }
    },
    
    // 日誌設定
    logging: {
        enabled: process.env.NODE_ENV === 'development',
        level: 'info',
        operations: {
            get: false,
            set: true,
            delete: true,
            clear: true
        }
    }
};

// 效能調優配置
const performanceConfig = {
    // 連接池調優
    connectionPool: {
        warmup: true,
        healthCheck: {
            enabled: true,
            interval: 30000,
            timeout: 5000
        }
    },
    
    // 序列化調優
    serialization: {
        // 使用更快的序列化庫
        fastJson: process.env.CACHE_FAST_JSON === 'true',
        
        // 二進制序列化
        binary: {
            enabled: false,
            format: 'msgpack' // msgpack, protobuf
        }
    },
    
    // 網路調優
    network: {
        // 啟用 TCP_NODELAY
        nodelay: true,
        
        // 啟用 keepalive
        keepalive: true,
        
        // 緩衝區大小
        bufferSize: 64 * 1024, // 64KB
        
        // 批次操作
        batching: {
            enabled: false,
            maxSize: 100,
            timeout: 10
        }
    },
    
    // 記憶體調優
    memory: {
        // 垃圾回收調優
        gc: {
            enabled: true,
            threshold: 0.8,
            interval: 60000
        },
        
        // 記憶體池
        pool: {
            enabled: false,
            initialSize: 1024 * 1024, // 1MB
            maxSize: 100 * 1024 * 1024 // 100MB
        }
    }
};

/**
 * 獲取快取配置
 * @param {string} type 快取類型
 * @returns {Object} 快取配置
 */
function getCacheConfig(type = null) {
    const config = {
        base: baseConfig,
        memory: memoryConfig,
        redis: redisConfig,
        file: fileConfig,
        tiered: tieredConfig,
        strategy: strategyConfig,
        partition: partitionConfig,
        monitoring: monitoringConfig,
        performance: performanceConfig
    };
    
    if (type) {
        return config[type] || null;
    }
    
    return config;
}

/**
 * 驗證快取配置
 * @param {Object} config 快取配置
 * @returns {Boolean} 是否有效
 */
function validateCacheConfig(config) {
    try {
        // 檢查基本配置
        if (!config.base || !config.base.defaultType) {
            throw new Error('缺少基本快取配置');
        }
        
        // 檢查快取類型配置
        const cacheType = config.base.defaultType;
        if (!config[cacheType]) {
            throw new Error(`缺少 ${cacheType} 快取配置`);
        }
        
        // 檢查 Redis 配置
        if (cacheType === 'redis') {
            const redisConf = config.redis;
            if (!redisConf.connection.host || !redisConf.connection.port) {
                throw new Error('Redis 連接配置不完整');
            }
        }
        
        // 檢查檔案快取目錄
        if (cacheType === 'file') {
            const fs = require('fs');
            const cacheDir = config.file.directory;
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
                console.log(`✅ 創建快取目錄: ${cacheDir}`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('快取配置驗證失敗:', error.message);
        return false;
    }
}

/**
 * 獲取快取鍵
 * @param {string} namespace 命名空間
 * @param {string} key 鍵名
 * @param {Object} options 選項
 * @returns {string} 完整的快取鍵
 */
function getCacheKey(namespace, key, options = {}) {
    const prefix = options.prefix || baseConfig.prefix;
    const parts = [prefix, namespace, key].filter(Boolean);
    
    if (options.tags && Array.isArray(options.tags)) {
        parts.push(...options.tags);
    }
    
    return parts.join(':');
}

/**
 * 計算快取 TTL
 * @param {number|string} ttl TTL 值
 * @param {Object} options 選項
 * @returns {number} TTL（秒）
 */
function calculateTtl(ttl, options = {}) {
    if (typeof ttl === 'number') {
        return ttl;
    }
    
    if (typeof ttl === 'string') {
        const units = {
            's': 1,
            'm': 60,
            'h': 3600,
            'd': 86400,
            'w': 604800
        };
        
        const match = ttl.match(/^(\d+)([smhdw]?)$/);
        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2] || 's';
            return value * (units[unit] || 1);
        }
    }
    
    return options.defaultTtl || baseConfig.defaultTtl;
}

module.exports = {
    getCacheConfig,
    validateCacheConfig,
    getCacheKey,
    calculateTtl,
    baseConfig,
    memoryConfig,
    redisConfig,
    fileConfig,
    tieredConfig,
    strategyConfig,
    partitionConfig,
    monitoringConfig,
    performanceConfig
};