/**
 * 統一的錯誤處理工具
 * 解決前端和後端錯誤處理機制不統一的問題
 */
class ErrorHandler {
  /**
   * 標準化的 API 錯誤回應
   * @param {Object} res - Express response 物件
   * @param {Error} error - 錯誤物件
   * @param {string} message - 使用者友善的錯誤訊息
   * @param {number} statusCode - HTTP 狀態碼
   */
  static handleApiError(res, error, message = '操作失敗', statusCode = 500) {
    console.error(message, error);
    console.error('錯誤詳情:', error.stack || error);
    
    let errorDetails = error.message || '未知錯誤';
    
    // 處理不同類型的錯誤
    if (error.code && error.errno) {
      errorDetails = `資料庫錯誤 (${error.code}): ${errorDetails}`;
    }
    
    if (error.code === 'ENOENT') {
      errorDetails = `檔案不存在: ${errorDetails}`;
      statusCode = 404;
    } else if (error.code === 'EACCES') {
      errorDetails = `檔案存取權限不足: ${errorDetails}`;
      statusCode = 403;
    } else if (error.code === 'SQLITE_CONSTRAINT') {
      errorDetails = '資料約束違反，可能是重複的資料';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false, 
      error: message,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }

  /**
   * 處理認證錯誤
   */
  static handleAuthError(res, message = '認證失敗') {
    res.status(401).json({ 
      success: false, 
      error: message,
      code: 'AUTH_FAILED'
    });
  }

  /**
   * 處理權限錯誤
   */
  static handlePermissionError(res, message = '權限不足') {
    res.status(403).json({ 
      success: false, 
      error: message,
      code: 'PERMISSION_DENIED'
    });
  }

  /**
   * 處理驗證錯誤
   */
  static handleValidationError(res, message = '輸入資料無效', details = null) {
    res.status(400).json({ 
      success: false, 
      error: message,
      details: details,
      code: 'VALIDATION_ERROR'
    });
  }

  /**
   * 處理資源不存在錯誤
   */
  static handleNotFoundError(res, message = '資源不存在') {
    res.status(404).json({ 
      success: false, 
      error: message,
      code: 'NOT_FOUND'
    });
  }

  /**
   * 成功回應的標準格式
   */
  static sendSuccess(res, data = null, message = '操作成功') {
    const response = {
      success: true,
      message: message
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    res.json(response);
  }

  /**
   * 包裝 async 路由處理器，自動捕獲錯誤
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Express 錯誤處理中間件
   */
  static errorMiddleware(error, req, res, next) {
    // Multer 錯誤處理
    if (error.code && error.code.startsWith('LIMIT_')) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          error: '檔案大小超過限制（最大10MB）',
          code: 'FILE_TOO_LARGE'
        });
      } else if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ 
          success: false, 
          error: '檔案數量超過限制',
          code: 'TOO_MANY_FILES'
        });
      } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          success: false, 
          error: '不預期的檔案欄位',
          code: 'UNEXPECTED_FILE'
        });
      }
    }
    
    // 檔案類型錯誤
    if (error.message && error.message.includes('不支援的檔案')) {
      return res.status(400).json({ 
        success: false, 
        error: error.message,
        code: 'UNSUPPORTED_FILE_TYPE'
      });
    }
    
    // 預設錯誤處理
    ErrorHandler.handleApiError(res, error, '伺服器內部錯誤');
  }
}

module.exports = ErrorHandler;