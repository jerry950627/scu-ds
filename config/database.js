const path = require('path');

// 資料庫配置
const databaseConfig = {
    // SQLite 配置
    sqlite: {
        path: process.env.DB_PATH || path.join(__dirname, '../database/scu_ds.db'),
        options: {
            // SQLite 連接選項
            verbose: process.env.NODE_ENV === 'development' ? console.log : null,
            // 啟用外鍵約束
            foreignKeys: true,
            // 連接超時
            timeout: 30000,
            // 忙碌超時
            busyTimeout: 30000
        }
    },
    
    // 連接池配置
    pool: {
        min: 1,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
    },
    
    // 遷移配置
    migrations: {
        directory: path.join(__dirname, '../database/migrations'),
        tableName: 'migrations'
    },
    
    // 種子配置
    seeds: {
        directory: path.join(__dirname, '../database/seeds')
    },
    
    // 備份配置
    backup: {
        directory: path.join(__dirname, '../database/backups'),
        interval: 24 * 60 * 60 * 1000, // 24小時
        maxBackups: 7 // 保留7個備份
    }
};

module.exports = databaseConfig;