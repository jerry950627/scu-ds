// 錯誤處理工具函數
const ErrorHandler = {
    showError: function(message, duration = 5000, context = {}) {
        // 記錄錯誤到控制台
        console.error('🚨 用戶界面錯誤:', message, context);
        
        // 使用全域錯誤處理器記錄
        if (window.reportError) {
            window.reportError(new Error(message), { type: 'UI Error', context });
        }
        
        // 移除現有的錯誤訊息
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show error-message';
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
        errorDiv.innerHTML = `
            <strong>錯誤！</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, duration);
    },

    showSuccess: function(message, duration = 3000) {
        // 記錄成功訊息到控制台
        console.log('✅ 操作成功:', message);
        
        // 移除現有的成功訊息
        const existingSuccess = document.querySelector('.success-message');
        if (existingSuccess) {
            existingSuccess.remove();
        }

        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success alert-dismissible fade show success-message';
        successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
        successDiv.innerHTML = `
            <strong>成功！</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(successDiv);

        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, duration);
    },

    handleApiError: async function(response) {
        if (!response.ok) {
            try {
                const errorData = await response.json();
                const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                
                // 詳細記錄API錯誤
                console.group('🌐 API錯誤詳情');
                console.error('URL:', response.url);
                console.error('狀態碼:', response.status);
                console.error('狀態文字:', response.statusText);
                console.error('錯誤訊息:', errorMessage);
                console.error('完整回應:', errorData);
                console.groupEnd();
                
                ErrorHandler.showError(errorMessage, 5000, {
                    url: response.url,
                    status: response.status,
                    statusText: response.statusText,
                    errorData: errorData
                });
                throw new Error(errorMessage);
            } catch (parseError) {
                const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                // 記錄解析錯誤
                console.group('🔍 API回應解析錯誤');
                console.error('URL:', response.url);
                console.error('狀態碼:', response.status);
                console.error('解析錯誤:', parseError);
                console.groupEnd();
                
                ErrorHandler.showError(errorMessage, 5000, {
                    url: response.url,
                    status: response.status,
                    parseError: parseError.message
                });
                throw new Error(errorMessage);
            }
        }
        return response;
    }
};

// API 請求工具函數
const ApiService = {

    get: async function(url) {
        try {
            console.log('📡 GET請求:', url);
            const response = await fetch(url);
            console.log('📡 GET回應:', response.status, response.statusText);
            return await ErrorHandler.handleApiError(response);
        } catch (error) {
            console.error('📡 GET請求失敗:', url, error);
            if (window.reportError) {
                window.reportError(error, { type: 'API GET', url });
            }
            throw error;
        }
    },

    post: async function(url, data) {
        try {
            console.log('📡 POST請求:', url, data);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            console.log('📡 POST回應:', response.status, response.statusText);
            return await ErrorHandler.handleApiError(response);
        } catch (error) {
            console.error('📡 POST請求失敗:', url, error);
            if (window.reportError) {
                window.reportError(error, { type: 'API POST', url, data });
            }
            throw error;
        }
    },

    put: async function(url, data) {
        try {
            console.log('📡 PUT請求:', url, data);
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            console.log('📡 PUT回應:', response.status, response.statusText);
            return await ErrorHandler.handleApiError(response);
        } catch (error) {
            console.error('📡 PUT請求失敗:', url, error);
            if (window.reportError) {
                window.reportError(error, { type: 'API PUT', url, data });
            }
            throw error;
        }
    },

    delete: async function(url) {
        try {
            console.log('📡 DELETE請求:', url);
            const response = await fetch(url, {
                method: 'DELETE'
            });
            console.log('📡 DELETE回應:', response.status, response.statusText);
            return await ErrorHandler.handleApiError(response);
        } catch (error) {
            console.error('📡 DELETE請求失敗:', url, error);
            if (window.reportError) {
                window.reportError(error, { type: 'API DELETE', url });
            }
            throw error;
        }
    },

    uploadFile: async function(url, formData) {
        try {
            console.log('📡 檔案上傳請求:', url);
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            console.log('📡 檔案上傳回應:', response.status, response.statusText);
            return await ErrorHandler.handleApiError(response);
        } catch (error) {
            console.error('📡 檔案上傳失敗:', url, error);
            if (window.reportError) {
                window.reportError(error, { type: 'API Upload', url });
            }
            throw error;
        }
    }
};

// 載入指示器工具函數
const LoadingIndicator = {
    show: function(message = '載入中...') {
        console.log('⏳ 顯示載入指示器:', message);
        
        // 移除現有的載入指示器
        this.hide();
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="d-flex flex-column align-items-center">
                <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">載入中...</span>
                </div>
                <div class="text-primary fw-bold">${message}</div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    },

    hide: function() {
        console.log('✅ 隱藏載入指示器');
        const loadingDiv = document.querySelector('.loading-overlay');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    },

    showError: function(message) {
        console.error('❌ 載入錯誤:', message);
        this.hide();
        ErrorHandler.showError(message);
    }
};

// 通用工具函數
const Utils = {
    formatDate: function(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },

    formatDateTime: function(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        if (!bytes || isNaN(bytes)) return 'N/A';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    sanitizeInput: function(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>"'&]/g, function(match) {
            const escapeMap = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return escapeMap[match];
        });
    },

    escapeHtml: function(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showMessage: function(containerId, type, message, duration = 5000) {
        let messageContainer = document.getElementById(containerId);
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = containerId;
            messageContainer.className = 'mb-3';
            
            // 根據容器ID找到合適的位置插入
            let targetElement;
            if (containerId === 'planMessages') {
                targetElement = document.getElementById('planForm');
            } else if (containerId === 'detailMessages') {
                targetElement = document.getElementById('detailForm');
            }
            
            if (targetElement && targetElement.parentNode) {
                targetElement.parentNode.insertBefore(messageContainer, targetElement);
            }
        }
        
        messageContainer.innerHTML = '';
        
        const alertDiv = document.createElement('div');
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const colorMap = {
            success: 'alert-success',
            error: 'alert-danger',
            warning: 'alert-warning',
            info: 'alert-info'
        };
        
        alertDiv.className = `alert ${colorMap[type]} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="${iconMap[type]} me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        messageContainer.appendChild(alertDiv);
        
        // 自動隱藏
        if (duration > 0) {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, duration);
        }
    },

    toggleLoading: function(button, isLoading) {
        if (!button) return;
        
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>處理中...';
        } else {
            button.disabled = false;
            // 恢復原始文字，這裡使用通用文字
            button.innerHTML = button.getAttribute('data-original-text') || '提交';
        }
    },
    
    // 錯誤調試輔助函數
    debugError: function(error, context = {}) {
        console.group('🐛 錯誤調試信息');
        console.error('錯誤對象:', error);
        console.error('錯誤訊息:', error.message);
        console.error('錯誤堆疊:', error.stack);
        console.error('上下文:', context);
        console.error('當前頁面:', window.location.href);
        console.error('用戶代理:', navigator.userAgent);
        console.error('時間戳:', new Date().toISOString());
        console.groupEnd();
        
        if (window.reportError) {
            window.reportError(error, { ...context, debugInfo: true });
        }
    }
};

// 頁面載入完成後的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 頁面載入完成:', window.location.pathname);
    
    // 添加調試工具到控制台
    window.debugTools = {
        getErrorStats: () => window.getErrorStats ? window.getErrorStats() : '全域錯誤處理器未載入',
        clearErrors: () => window.GlobalErrorHandler ? window.GlobalErrorHandler.clearErrorHistory() : '全域錯誤處理器未載入',
        exportErrors: () => window.GlobalErrorHandler ? window.GlobalErrorHandler.exportErrorReport() : '全域錯誤處理器未載入',
        testError: () => {
            console.log('🧪 測試錯誤處理...');
            throw new Error('這是一個測試錯誤');
        },
        testApiError: async () => {
            console.log('🧪 測試API錯誤處理...');
            try {
                await fetch('/api/nonexistent');
            } catch (error) {
                console.log('✅ API錯誤測試完成');
            }
        }
    };
    
    console.log('🛠️ 調試工具已載入，使用 window.debugTools 查看可用方法');
});