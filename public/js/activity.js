// 活動部管理系統 JavaScript

(function() {
    'use strict';

    // 通用工具函數
    const Utils = {
        // 顯示訊息
        showMessage(containerId, type, message, duration = 5000) {
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
            
            // 自動隱藏訊息
            if (duration > 0) {
                setTimeout(() => {
                    if (alertDiv && alertDiv.parentNode) {
                        alertDiv.remove();
                    }
                }, duration);
            }
        },

        // 格式化檔案大小
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // HTML 轉義
        escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, function(m) { return map[m]; });
        },

        // 切換載入狀態
        toggleLoading(button, isLoading) {
            if (!button) return;
            
            if (isLoading) {
                button.disabled = true;
                const icon = button.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-spinner fa-spin';
                }
            } else {
                button.disabled = false;
                const icon = button.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-sync-alt';
                }
            }
        }
    };

    // 企劃管理器
    class PlanManager {
        constructor() {
            this.isLoading = false;
            this.init();
        }

        init() {
            // 綁定表單提交事件
            const planForm = document.getElementById('planForm');
            if (planForm) {
                planForm.addEventListener('submit', this.handleFormSubmit.bind(this));
            }

            // 檔案選擇事件
            const planFileInput = document.getElementById('planFile');
            if (planFileInput) {
                planFileInput.addEventListener('change', this.handleFileSelect.bind(this));
            }
        }

        handleFileSelect(event) {
            const files = event.target.files;
            const fileInfo = document.getElementById('planFileInfo');
            
            if (files && files.length > 0 && fileInfo) {
                const file = files[0];
                const fileSize = Utils.formatFileSize(file.size);
                fileInfo.innerHTML = `
                    <small class="text-muted">
                        <i class="fas fa-file me-1"></i>
                        ${file.name} (${fileSize})
                    </small>
                `;
            }
        }

        async handleFormSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            const progressBar = document.getElementById('uploadProgress');
            
            // 詳細的前端驗證和日誌
            console.log('📤 開始上傳企劃檔案');
            console.log('表單數據:', {
                name: formData.get('name'),
                file: formData.get('proposal'),
                fileName: formData.get('proposal')?.name,
                fileSize: formData.get('proposal')?.size,
                fileType: formData.get('proposal')?.type
            });
            
            // 前端驗證
            const name = formData.get('name');
            const file = formData.get('proposal');
            
            if (!name || !name.trim()) {
                console.error('❌ 前端驗證失敗: 企劃名稱為空');
                Utils.showMessage('planMessages', 'error', '請輸入企劃名稱');
                return;
            }
            
            if (!file || file.size === 0) {
                console.error('❌ 前端驗證失敗: 未選擇檔案或檔案為空');
                Utils.showMessage('planMessages', 'error', '請選擇要上傳的檔案');
                return;
            }
            
            // 檔案大小檢查 (10MB)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                console.error('❌ 前端驗證失敗: 檔案過大', file.size);
                Utils.showMessage('planMessages', 'error', '檔案大小不能超過 10MB');
                return;
            }
            
            try {
                // 顯示進度條
                if (progressBar) {
                    progressBar.parentElement.style.display = 'block';
                    progressBar.style.width = '0%';
                }

                console.log('🚀 發送請求到後端...');
                const response = await fetch('/api/activity/events', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                console.log('📡 收到後端回應:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ 上傳成功:', result);
                    Utils.showMessage('planMessages', 'success', '企劃上傳成功！');
                    
                    // 清空表單和檔案資訊
                    form.reset();
                    const fileInfo = document.getElementById('planFileInfo');
                    if (fileInfo) {
                        fileInfo.innerHTML = '';
                    }
                    
                    // 重新載入企劃列表
                    this.loadPlans();
                    
                    // 收合表單
                    const formContainer = document.getElementById('planFormContainer');
                    if (formContainer) {
                        formContainer.classList.remove('show');
                    }
                    
                    // 重置按鈕狀態
                    const submitBtn = form.querySelector('button[type="submit"]');
                    if (submitBtn) {
                        Utils.toggleLoading(submitBtn, false);
                    }
                } else {
                    let errorMessage = '上傳失敗';
                    try {
                        const error = await response.json();
                        errorMessage = error.error || error.message || errorMessage;
                        console.error('❌ 後端回應錯誤:', error);
                    } catch (parseError) {
                        console.error('❌ 無法解析錯誤回應:', parseError);
                        const responseText = await response.text();
                        console.error('❌ 原始回應內容:', responseText);
                    }
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showError(errorMessage);
                    } else {
                        Utils.showMessage('planMessages', 'error', errorMessage);
                    }
                }
            } catch (error) {
                console.error('❌ 網路請求失敗:', error);
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showError(`網路錯誤: ${error.message}`);
                } else {
                    Utils.showMessage('planMessages', 'error', `網路錯誤: ${error.message}`);
                }
            } finally {
                // 隱藏進度條
                if (progressBar) {
                    progressBar.parentElement.style.display = 'none';
                }
                // 恢復按鈕狀態
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    Utils.toggleLoading(submitBtn, false);
                }
            }
        }

        async loadPlans() {
            try {
                const response = await fetch('/api/activity/events', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    // 後端使用ErrorHandler.sendSuccess返回格式為{success: true, data: plans}
                    const plans = result.data || result;
                    this.renderPlans(plans);
                } else {
                    console.error('載入企劃列表失敗:', response.status, response.statusText);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showError('載入企劃列表失敗');
                    } else {
                        Utils.showMessage('planMessages', 'error', '載入企劃列表失敗');
                    }
                }
            } catch (error) {
                console.error('載入企劃列表錯誤:', error);
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showError('網路錯誤，請稍後再試');
                } else {
                    Utils.showMessage('planMessages', 'error', '網路錯誤，請稍後再試');
                }
            }
        }

        renderPlans(plans) {
            const planList = document.getElementById('planList');
            if (!planList) return;

            if (plans.length === 0) {
                planList.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center text-muted py-4">
                            <i class="fas fa-inbox fa-2x mb-2"></i><br>
                            尚無企劃資料
                        </td>
                    </tr>
                `;
                return;
            }

            planList.innerHTML = plans.map(plan => `
                <tr>
                    <td>${Utils.escapeHtml(plan.name)}</td>
                    <td>${new Date(plan.created_at).toLocaleString('zh-TW')}</td>
                    <td class="text-end">
                        <div class="btn-group btn-group-sm">
                            ${plan.proposal_path ? `<button class="btn btn-outline-primary" onclick="window.planManager.viewPlan(${plan.id})">
                                <i class="fas fa-eye"></i> 查看
                            </button>` : ''}
                            <button class="btn btn-outline-warning" onclick="window.planManager.editPlan(${plan.id})">
                                <i class="fas fa-edit"></i> 編輯
                            </button>
                            <button class="btn btn-outline-success" onclick="window.planManager.downloadPlan(${plan.id})">
                                <i class="fas fa-download"></i> 下載
                            </button>
                            <button class="btn btn-outline-danger" onclick="window.planManager.deletePlan(${plan.id})">
                                <i class="fas fa-trash"></i> 刪除
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        viewPlan(id) {
            // 直接在瀏覽器中查看檔案
            window.open(`/api/activity/events/${id}/view`, '_blank');
        }

        async editPlan(id) {
            try {
                const response = await fetch(`/api/activity/events/${id}`, {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    const plan = result.data || result;
                    
                    // 填充編輯表單
                    document.getElementById('editPlanId').value = plan.id;
                    document.getElementById('editPlanName').value = plan.name;
                    
                    // 顯示模態框
                    document.getElementById('editPlanModal').style.display = 'block';
                } else {
                    console.error('載入企劃資料失敗:', response.status, response.statusText);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showError('載入企劃資料失敗');
                    } else {
                        Utils.showMessage('planMessages', 'error', '載入企劃資料失敗');
                    }
                }
            } catch (error) {
                console.error('編輯企劃錯誤:', error);
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showError('網路錯誤，請稍後再試');
                } else {
                    Utils.showMessage('planMessages', 'error', '網路錯誤，請稍後再試');
                }
            }
        }

        downloadPlan(id) {
            window.open(`/api/activity/events/${id}/download`, '_blank');
        }

        async deletePlan(id) {
            if (!confirm('確定要刪除此企劃嗎？')) return;

            try {
                const response = await fetch(`/api/activity/events/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (response.ok) {
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showSuccess('企劃刪除成功');
                    } else {
                        Utils.showMessage('planMessages', 'success', '企劃刪除成功');
                    }
                    this.loadPlans();
                } else {
                    const error = await response.json();
                    console.error('刪除企劃失敗:', error);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showError(error.message || '刪除失敗');
                    } else {
                        Utils.showMessage('planMessages', 'error', error.message || '刪除失敗');
                    }
                }
            } catch (error) {
                console.error('刪除企劃錯誤:', error);
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showError('網路錯誤，請稍後再試');
                } else {
                    Utils.showMessage('planMessages', 'error', '網路錯誤，請稍後再試');
                }
            }
        }
    }

    // 細流管理器
    class DetailManager {
        constructor() {
            this.isLoading = false;
            this.init();
        }

        init() {
            // 綁定表單提交事件
            const detailForm = document.getElementById('detailForm');
            if (detailForm) {
                detailForm.addEventListener('submit', this.handleFormSubmit.bind(this));
            }

            // 檔案選擇事件
            const detailFileInput = document.getElementById('detailFile');
            if (detailFileInput) {
                detailFileInput.addEventListener('change', this.handleFileSelect.bind(this));
            }
        }

        handleFileSelect(event) {
            const files = event.target.files;
            const fileInfo = document.getElementById('detailFileInfo');
            
            if (files && files.length > 0 && fileInfo) {
                const file = files[0];
                const fileSize = Utils.formatFileSize(file.size);
                fileInfo.innerHTML = `
                    <small class="text-muted">
                        <i class="fas fa-file me-1"></i>
                        ${file.name} (${fileSize})
                    </small>
                `;
            }
        }

        async handleFormSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            const progressBar = document.getElementById('detailProgress');
            
            try {
                // 顯示進度條
                if (progressBar) {
                    progressBar.parentElement.style.display = 'block';
                    progressBar.style.width = '0%';
                }

                const response = await fetch('/api/activity/details', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ 細流上傳成功:', result);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showSuccess('細流上傳成功！');
                    } else {
                        Utils.showMessage('detailMessages', 'success', '細流上傳成功！');
                    }
                    
                    // 清空表單和檔案資訊
                    form.reset();
                    const fileInfo = document.getElementById('detailFileInfo');
                    if (fileInfo) {
                        fileInfo.innerHTML = '';
                    }
                    
                    // 重新載入細流列表
                    this.loadDetails();
                    
                    // 收合表單
                    const formContainer = document.getElementById('detailFormContainer');
                    if (formContainer) {
                        formContainer.classList.remove('show');
                    }
                    
                    // 重置按鈕狀態
                    const submitBtn = form.querySelector('button[type="submit"]');
                    if (submitBtn) {
                        Utils.toggleLoading(submitBtn, false);
                    }
                } else {
                    const error = await response.json();
                    console.error('細流上傳失敗:', error);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showError(error.message || '上傳失敗');
                    } else {
                        Utils.showMessage('detailMessages', 'error', error.message || '上傳失敗');
                    }
                }
            } catch (error) {
                console.error('細流上傳錯誤:', error);
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showError('網路錯誤，請稍後再試');
                } else {
                    Utils.showMessage('detailMessages', 'error', '網路錯誤，請稍後再試');
                }
            } finally {
                // 隱藏進度條
                if (progressBar) {
                    progressBar.parentElement.style.display = 'none';
                }
                // 恢復按鈕狀態
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    Utils.toggleLoading(submitBtn, false);
                }
            }
        }

        async loadDetails() {
            try {
                const response = await fetch('/api/activity/details', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    // 後端返回格式為{success: true, data: details}
                    const details = result.data || result;
                    this.renderDetails(details);
                } else {
                    console.error('載入細流列表失敗:', response.status, response.statusText);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showError('載入細流列表失敗');
                    } else {
                        Utils.showMessage('detailMessages', 'error', '載入細流列表失敗');
                    }
                }
            } catch (error) {
                console.error('載入細流列表錯誤:', error);
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showError('網路錯誤，請稍後再試');
                } else {
                    Utils.showMessage('detailMessages', 'error', '網路錯誤，請稍後再試');
                }
            }
        }

        renderDetails(details) {
            const detailList = document.getElementById('detailList');
            if (!detailList) return;

            if (details.length === 0) {
                detailList.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center text-muted py-4">
                            <i class="fas fa-inbox fa-2x mb-2"></i><br>
                            尚無細流資料
                        </td>
                    </tr>
                `;
                return;
            }

            detailList.innerHTML = details.map(detail => `
                <tr>
                    <td>${Utils.escapeHtml(detail.title)}</td>
                    <td>${new Date(detail.created_at).toLocaleString('zh-TW')}</td>
                    <td class="text-end">
                        <div class="btn-group btn-group-sm">
                            ${detail.file_path ? `<button class="btn btn-outline-primary" onclick="window.detailManager.viewDetail(${detail.id})">
                                <i class="fas fa-eye"></i> 查看
                            </button>` : ''}
                            <button class="btn btn-outline-warning" onclick="window.detailManager.editDetail(${detail.id})">
                                <i class="fas fa-edit"></i> 編輯
                            </button>
                            <button class="btn btn-outline-success" onclick="window.detailManager.downloadDetail(${detail.id})">
                                <i class="fas fa-download"></i> 下載
                            </button>
                            <button class="btn btn-outline-danger" onclick="window.detailManager.deleteDetail(${detail.id})">
                                <i class="fas fa-trash"></i> 刪除
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        viewDetail(id) {
            // 直接在瀏覽器中查看檔案
            window.open(`/api/activity/details/${id}/view`, '_blank');
        }

        async editDetail(id) {
            try {
                const response = await fetch(`/api/activity/details/${id}`, {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    const detail = result.data || result;
                    
                    // 填充編輯表單
                    document.getElementById('editDetailId').value = detail.id;
                    document.getElementById('editDetailTitle').value = detail.title;
                    
                    // 顯示模態框
                    document.getElementById('editDetailModal').style.display = 'block';
                } else {
                    console.error('載入細流資料失敗:', response.status, response.statusText);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showError('載入細流資料失敗');
                    } else {
                        Utils.showMessage('detailMessages', 'error', '載入細流資料失敗');
                    }
                }
            } catch (error) {
                console.error('編輯細流錯誤:', error);
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showError('網路錯誤，請稍後再試');
                } else {
                    Utils.showMessage('detailMessages', 'error', '網路錯誤，請稍後再試');
                }
            }
        }

        downloadDetail(id) {
            window.open(`/api/activity/details/${id}/download`, '_blank');
        }

        async deleteDetail(id) {
            if (!confirm('確定要刪除此細流嗎？')) return;

            try {
                const response = await fetch(`/api/activity/details/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (response.ok) {
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showSuccess('細流刪除成功');
                    } else {
                        Utils.showMessage('detailMessages', 'success', '細流刪除成功');
                    }
                    this.loadDetails();
                } else {
                    const error = await response.json();
                    console.error('刪除細流失敗:', error);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showError(error.message || '刪除失敗');
                    } else {
                        Utils.showMessage('detailMessages', 'error', error.message || '刪除失敗');
                    }
                }
            } catch (error) {
                console.error('刪除細流錯誤:', error);
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showError('網路錯誤，請稍後再試');
                } else {
                    Utils.showMessage('detailMessages', 'error', '網路錯誤，請稍後再試');
                }
            }
        }
    }

    // 初始化管理器
    window.planManager = new PlanManager();
    window.detailManager = new DetailManager();

    // 編輯企劃表單提交
    document.addEventListener('DOMContentLoaded', function() {
        const editPlanForm = document.getElementById('editPlanForm');
        if (editPlanForm) {
            editPlanForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = new FormData(this);
                const planId = formData.get('planId');
                
                try {
                    const response = await fetch(`/api/activity/events/${planId}`, {
                        method: 'PUT',
                        body: formData,
                        credentials: 'include'
                    });
                    
                    if (response.ok) {
                        if (typeof ErrorHandler !== 'undefined') {
                            ErrorHandler.showSuccess('企劃更新成功');
                        } else {
                            Utils.showMessage('planMessages', 'success', '企劃更新成功');
                        }
                        document.getElementById('editPlanModal').style.display = 'none';
                        
                        // 重置表單
                        this.reset();
                        
                        // 重新載入企劃列表
                        window.planManager.loadPlans();
                    } else {
                        const error = await response.json();
                        console.error('企劃更新失敗:', error);
                        if (typeof ErrorHandler !== 'undefined') {
                            ErrorHandler.showError(error.message || '更新失敗');
                        } else {
                            Utils.showMessage('planMessages', 'error', error.message || '更新失敗');
                        }
                    }
                } catch (error) {
                    console.error('企劃更新錯誤:', error);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showError('網路錯誤，請稍後再試');
                    } else {
                        Utils.showMessage('planMessages', 'error', '網路錯誤，請稍後再試');
                    }
                }
            });
        }
        
        // 編輯細流表單提交
        const editDetailForm = document.getElementById('editDetailForm');
        if (editDetailForm) {
            editDetailForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = new FormData(this);
                const detailId = formData.get('detailId');
                
                try {
                    const response = await fetch(`/api/activity/details/${detailId}`, {
                        method: 'PUT',
                        body: formData,
                        credentials: 'include'
                    });
                    
                    if (response.ok) {
                        if (typeof ErrorHandler !== 'undefined') {
                            ErrorHandler.showSuccess('細流更新成功');
                        } else {
                            Utils.showMessage('detailMessages', 'success', '細流更新成功');
                        }
                        document.getElementById('editDetailModal').style.display = 'none';
                        
                        // 重置表單
                        this.reset();
                        
                        // 重新載入細流列表
                        window.detailManager.loadDetails();
                    } else {
                        const error = await response.json();
                        console.error('細流更新失敗:', error);
                        if (typeof ErrorHandler !== 'undefined') {
                            ErrorHandler.showError(error.message || '更新失敗');
                        } else {
                            Utils.showMessage('detailMessages', 'error', error.message || '更新失敗');
                        }
                    }
                } catch (error) {
                    console.error('細流更新錯誤:', error);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.showError('網路錯誤，請稍後再試');
                    } else {
                        Utils.showMessage('detailMessages', 'error', '網路錯誤，請稍後再試');
                    }
                }
            });
        }
    });

    // 匯出活動數據功能
    window.exportActivityData = async function() {
        try {
            const response = await fetch('/api/activity/export', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                // 創建下載連結
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `activity_export_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showSuccess('數據匯出成功！');
                } else {
                    Utils.showMessage('planMessages', 'success', '數據匯出成功！');
                }
            } else {
                const error = await response.json();
                console.error('數據匯出失敗:', error);
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showError(error.message || '匯出失敗');
                } else {
                    Utils.showMessage('planMessages', 'error', error.message || '匯出失敗');
                }
            }
        } catch (error) {
            console.error('匯出錯誤:', error);
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError('網路錯誤，請稍後再試');
            } else {
                Utils.showMessage('planMessages', 'error', '網路錯誤，請稍後再試');
            }
        }
    };

})();