/**
 * 全域錯誤處理中間件
 * 統一處理所有應用程式錯誤
 */

class GlobalErrorHandler {
    /**
     * Express 錯誤處理中間件
     * @param {Error} err - 錯誤物件
     * @param {Object} req - Express 請求物件
     * @param {Object} res - Express 回應物件
     * @param {Function} next - Express next 函數
     */
    static handleError(err, req, res, next) {
        // 記錄錯誤
        console.error('❌ 全域錯誤捕獲:', {
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString(),
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });

        // 判斷錯誤類型並設定適當的狀態碼
        let statusCode = err.statusCode || err.status || 500;
        let message = err.message || '伺服器內部錯誤';

        // 特定錯誤類型處理
        if (err.name === 'ValidationError') {
            statusCode = 400;
            message = '資料驗證失敗';
        } else if (err.name === 'UnauthorizedError') {
            statusCode = 401;
            message = '未授權存取';
        } else if (err.name === 'CastError') {
            statusCode = 400;
            message = '資料格式錯誤';
        } else if (err.code === 'ENOENT') {
            statusCode = 404;
            message = '檔案不存在';
        } else if (err.code === 'ECONNREFUSED') {
            statusCode = 503;
            message = '服務暫時無法使用';
        }

        // 開發環境顯示詳細錯誤，生產環境隱藏敏感資訊
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        const errorResponse = {
            success: false,
            message: message,
            statusCode: statusCode,
            timestamp: new Date().toISOString()
        };

        // 開發環境添加詳細錯誤資訊
        if (isDevelopment) {
            errorResponse.error = {
                name: err.name,
                message: err.message,
                stack: err.stack
            };
        }

        // 檢查是否為 API 請求
        const isApiRequest = req.url.startsWith('/api/') || 
                            req.get('Content-Type') === 'application/json' ||
                            req.get('Accept')?.includes('application/json');

        if (isApiRequest) {
            // API 請求返回 JSON 錯誤
            res.status(statusCode).json(errorResponse);
        } else {
            // 網頁請求處理
            if (statusCode === 401) {
                // 認證錯誤重定向到登入頁面
                return res.redirect('/?error=unauthorized');
            } else if (statusCode === 403) {
                // 權限錯誤顯示錯誤頁面
                const path = require('path');
                const errorPagePath = path.join(__dirname, '../public/pages/error.html');
                return res.status(statusCode).sendFile(errorPagePath);
            } else {
                // 其他錯誤顯示錯誤頁面
                const path = require('path');
                const errorPagePath = path.join(__dirname, '../public/pages/error.html');
                res.status(statusCode).sendFile(errorPagePath);
            }
        }
    }

    /**
     * 404 錯誤處理中間件
     * @param {Object} req - Express 請求物件
     * @param {Object} res - Express 回應物件
     * @param {Function} next - Express next 函數
     */
    static handle404(req, res, next) {
        const error = new Error(`找不到路由: ${req.method} ${req.url}`);
        error.statusCode = 404;
        next(error);
    }

    /**
     * 非同步錯誤包裝器
     * @param {Function} fn - 非同步函數
     * @returns {Function} Express 中間件函數
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * 程序異常處理
     */
    static setupProcessHandlers() {
        // 未捕獲的 Promise 拒絕
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ 未處理的 Promise 拒絕:', reason);
            console.error('Promise:', promise);
            // 不要立即退出，記錄錯誤並繼續運行
        });

        // 未捕獲的異常
        process.on('uncaughtException', (error) => {
            console.error('❌ 未捕獲的異常:', error);
            // 優雅關閉
            process.exit(1);
        });

        // SIGTERM 信號處理
        process.on('SIGTERM', () => {
            console.log('📴 收到 SIGTERM 信號，正在優雅關閉...');
            process.exit(0);
        });

        // SIGINT 信號處理 (Ctrl+C)
        process.on('SIGINT', () => {
            console.log('📴 收到 SIGINT 信號，正在優雅關閉...');
            process.exit(0);
        });
    }
}

module.exports = GlobalErrorHandler;