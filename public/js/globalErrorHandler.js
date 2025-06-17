/**
 * 全域錯誤處理器
 * 確保所有頁面的錯誤都能在F12控制台中詳細顯示
 */

// 全域錯誤處理配置
const GlobalErrorHandler = {
    // 是否啟用詳細錯誤日誌
    enableDetailedLogging: true,
    
    // 錯誤計數器
    errorCount: 0,
    
    // 錯誤歷史記錄
    errorHistory: [],
    
    // 防止錯誤循環的標記
    isLogging: false,
    
    // 初始化全域錯誤處理
    init: function() {
        this.setupGlobalErrorHandlers();
        this.setupConsoleEnhancements();
        this.setupNetworkErrorHandling();
        console.log('🔧 全域錯誤處理器已啟動');
    },
    
    // 設置全域錯誤處理器
    setupGlobalErrorHandlers: function() {
        // 捕獲未處理的JavaScript錯誤
        window.addEventListener('error', (event) => {
            // 防止錯誤循環
            if (this.isLogging) return;
            
            this.logError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error ? event.error.stack : null,
                timestamp: new Date().toISOString(),
                url: window.location.href
            });
        });
        
        // 捕獲未處理的Promise拒絕
        window.addEventListener('unhandledrejection', (event) => {
            // 防止錯誤循環
            if (this.isLogging) return;
            
            this.logError({
                type: 'Unhandled Promise Rejection',
                message: event.reason ? event.reason.message || event.reason : 'Unknown promise rejection',
                stack: event.reason ? event.reason.stack : null,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                promise: event.promise
            });
        });
        
        // 捕獲資源載入錯誤
        window.addEventListener('error', (event) => {
            // 防止錯誤循環
            if (this.isLogging) return;
            
            if (event.target !== window) {
                this.logError({
                    type: 'Resource Load Error',
                    message: `Failed to load resource: ${event.target.src || event.target.href}`,
                    element: event.target.tagName,
                    src: event.target.src || event.target.href,
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                });
            }
        }, true);
    },
    
    // 增強控制台功能
    setupConsoleEnhancements: function() {
        // 保存原始的console方法
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        
        // 增強console.error - 但要防止循環
        const originalError = console.error;
        console.error = (...args) => {
            originalError.apply(console, args);
            
            // 防止錯誤循環
            if (!this.isLogging) {
                this.logError({
                    type: 'Console Error',
                    message: args.join(' '),
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    stack: new Error().stack
                });
            }
        };
        
        // 添加自定義錯誤報告方法
        window.reportError = (error, context = {}) => {
            if (!this.isLogging) {
                this.logError({
                    type: 'Manual Report',
                    message: error.message || error,
                    stack: error.stack,
                    context: context,
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                });
            }
        };
        
        // 添加錯誤統計方法
        window.getErrorStats = () => {
            return {
                totalErrors: this.errorCount,
                recentErrors: this.errorHistory.slice(-10),
                errorsByType: this.getErrorsByType()
            };
        };
    },
    
    // 設置網路錯誤處理
    setupNetworkErrorHandling: function() {
        // 攔截fetch請求
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch.apply(window, args);
                
                // 記錄HTTP錯誤 - 但不要循環記錄
                if (!response.ok && !this.isLogging) {
                    this.logError({
                        type: 'HTTP Error',
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText,
                        timestamp: new Date().toISOString(),
                        pageUrl: window.location.href
                    });
                }
                
                return response;
            } catch (error) {
                // 記錄網路錯誤 - 但不要循環記錄
                if (!this.isLogging) {
                    this.logError({
                        type: 'Network Error',
                        message: `Network request failed: ${error.message}`,
                        url: args[0],
                        error: error,
                        stack: error.stack,
                        timestamp: new Date().toISOString(),
                        pageUrl: window.location.href
                    });
                }
                throw error;
            }
        };
    },
    
    // 記錄錯誤 - 加入防循環機制
    logError: function(errorInfo) {
        // 防止錯誤循環
        if (this.isLogging) {
            return;
        }
        
        // 限制錯誤頻率 - 如果同一類型錯誤在短時間內重複出現，則跳過
        const now = Date.now();
        const recentSimilarErrors = this.errorHistory.filter(err => 
            err.type === errorInfo.type && 
            err.message === errorInfo.message &&
            now - new Date(err.timestamp).getTime() < 5000 // 5秒內
        );
        
        if (recentSimilarErrors.length > 3) {
            return; // 跳過重複錯誤
        }
        
        try {
            this.isLogging = true;
            
            this.errorCount++;
            this.errorHistory.push(errorInfo);
            
            // 保持錯誤歷史記錄在合理範圍內
            if (this.errorHistory.length > 100) {
                this.errorHistory = this.errorHistory.slice(-50);
            }
            
            // 在控制台中顯示詳細錯誤信息 - 使用原始console方法
            const originalError = console.error;
            const originalLog = console.log;
            const originalGroup = console.group;
            const originalGroupEnd = console.groupEnd;
            
            originalGroup(`🚨 錯誤 #${this.errorCount} - ${errorInfo.type}`);
            originalError('錯誤訊息:', errorInfo.message);
            originalError('發生時間:', errorInfo.timestamp);
            originalError('頁面URL:', errorInfo.url);
            
            if (errorInfo.filename) {
                originalError('檔案:', errorInfo.filename);
                originalError('行號:', errorInfo.lineno);
                originalError('列號:', errorInfo.colno);
            }
            
            if (errorInfo.stack) {
                originalError('堆疊追蹤:', errorInfo.stack);
            }
            
            if (errorInfo.context) {
                originalError('上下文:', errorInfo.context);
            }
            
            if (errorInfo.element) {
                originalError('元素類型:', errorInfo.element);
                originalError('資源URL:', errorInfo.src);
            }
            
            if (errorInfo.status) {
                originalError('HTTP狀態:', errorInfo.status);
                originalError('狀態文字:', errorInfo.statusText);
            }
            
            originalGroupEnd();
            
            // 在開發環境中顯示更多調試信息
            if (this.enableDetailedLogging) {
                console.table({
                    '錯誤類型': errorInfo.type,
                    '錯誤訊息': errorInfo.message.substring(0, 50) + (errorInfo.message.length > 50 ? '...' : ''),
                    '發生時間': errorInfo.timestamp,
                    '總錯誤數': this.errorCount
                });
            }
            
        } catch (logError) {
            // 如果記錄錯誤時出錯，使用最基本的方式記錄
            console.warn('錯誤處理器本身出錯:', logError);
        } finally {
            this.isLogging = false;
        }
    },
    
    // 按類型統計錯誤
    getErrorsByType: function() {
        const stats = {};
        this.errorHistory.forEach(error => {
            stats[error.type] = (stats[error.type] || 0) + 1;
        });
        return stats;
    },
    
    // 清除錯誤歷史
    clearErrorHistory: function() {
        this.errorHistory = [];
        this.errorCount = 0;
        console.log('🧹 錯誤歷史已清除');
    },
    
    // 導出錯誤報告
    exportErrorReport: function() {
        const report = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            totalErrors: this.errorCount,
            errorsByType: this.getErrorsByType(),
            recentErrors: this.errorHistory.slice(-20)
        };
        
        console.log('📊 錯誤報告:', report);
        return report;
    }
};

// 頁面載入完成後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        GlobalErrorHandler.init();
    });
} else {
    GlobalErrorHandler.init();
}

// 導出到全域
window.GlobalErrorHandler = GlobalErrorHandler;