// 全域變數宣告
let allDesigns = [];
let currentEditId = null;
let uniformForm, uniformImage, uniformFilePreview, uniformTableBody, uniformFilter;
let postForm, postImage, postFilePreview, postTableBody;
let editDesignModal, saveEditBtn, loadingOverlay;

document.addEventListener('DOMContentLoaded', () => {
    // 初始化 DOM 元素
    uniformForm = document.getElementById('uniformForm');
    uniformImage = document.getElementById('uniformImage');
    uniformFilePreview = document.getElementById('uniformFilePreview');
    uniformTableBody = document.getElementById('uniformTableBody');
    uniformFilter = document.getElementById('uniformFilter');
    
    postForm = document.getElementById('postForm');
    postImage = document.getElementById('postImage');
    postFilePreview = document.getElementById('postFilePreview');
    postTableBody = document.getElementById('postTableBody');
    
    editDesignModal = document.getElementById('editDesignModal');
    saveEditBtn = document.getElementById('saveEditBtn');
    loadingOverlay = document.getElementById('loading');

    (async () => {
        try {
            // 檢查用戶認證狀態
            const response = await fetch('/api/auth/check', {
            method: 'GET',
            credentials: 'include'
        });
            if (!response.ok) {
                throw new Error('認證檢查失敗');
            }
            const data = await response.json();
            
            if (!data.authenticated) {
                // 用戶未登入，重定向到登入頁面
                window.location.replace('/');
                return;
            }
            
            // 用戶已認證，隱藏加載指示器，顯示頁面
            document.getElementById('loading').style.display = 'none';
            document.body.style.display = 'block';
            
            // 初始化所有功能
            await loadDesigns();
            setupUniformFilePreview();
            setupPostFilePreview();
            
            // 設定編輯類型變更事件
            const editDesignType = document.getElementById('editDesignType');
            editDesignType?.addEventListener('change', (e) => {
                toggleVendorFields(e.target.value === '系服');
            });
            
            // 設定系服篩選器
            uniformFilter?.addEventListener('change', () => {
                const filterValue = uniformFilter.value;
                const filteredDesigns = allDesigns.filter(design => {
                    if (design.type !== '系服') return false;
                    if (filterValue === 'all') return true;
                    return design.vendor_name === filterValue || design.vendor_name_from_table === filterValue;
                });
                renderUniformTable(filteredDesigns);
            });
            
        } catch (error) {
            // 認證檢查失敗，重定向到登入頁面
            console.error('初始化失敗:', error);
            document.getElementById('loading').style.display = 'none';
            ErrorHandler.showError('頁面初始化失敗: ' + error.message);
            window.location.replace('/');
            return;
        }
    })();
    
    // DOM 元素已在檔案開頭初始化

    // 顯示錯誤訊息
    function showError(message) {
        if (typeof ErrorHandler !== 'undefined') {
            ErrorHandler.showError(message);
        } else {
            console.error('錯誤:', message);
            alert('錯誤: ' + message);
        }
    }

    // 顯示成功訊息
    function showSuccess(message) {
        if (typeof ErrorHandler !== 'undefined') {
            ErrorHandler.showSuccess(message);
        } else {
            console.log('成功:', message);
            alert('成功: ' + message);
        }
    }

    // 顯示載入中遮罩
    function showLoading(message = '載入中...') {
        if (loadingOverlay) {
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = message;
            loadingOverlay.style.display = 'flex';
        } else {
            Utils.toggleLoading(true, message);
        }
    }

    // 隱藏載入中遮罩
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        } else if (typeof LoadingIndicator !== 'undefined') {
            LoadingIndicator.hide();
        }
    }

    // 獲取檔案副檔名
    function getFileExtension(filePath) {
        if (!filePath) return 'FILE';
        return filePath.split('.').pop() || 'FILE';
    }

    // 系服檔案預覽功能
    function setupUniformFilePreview() {
        if (uniformImage) {
            uniformImage.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        if (file.type.startsWith('image/')) {
                            uniformFilePreview.innerHTML = `
                                <div class="mt-2">
                                    <img src="${e.target.result}" class="file-preview" alt="系服預覽圖" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                                    <p class="small text-muted mt-1">檔案名稱: ${file.name}</p>
                                    <p class="small text-muted">檔案大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            `;
                        } else {
                            uniformFilePreview.innerHTML = `
                                <div class="mt-2 p-2 bg-light rounded">
                                    <i class="bi bi-file-earmark"></i> ${file.name}
                                    <small class="text-muted d-block">檔案大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</small>
                                </div>
                            `;
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    uniformFilePreview.innerHTML = '';
                }
            });
        }
    }

    // 貼文檔案預覽功能
    function setupPostFilePreview() {
        if (postImage) {
            postImage.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        if (file.type.startsWith('image/')) {
                            postFilePreview.innerHTML = `
                                <div class="mt-2">
                                    <img src="${e.target.result}" class="file-preview" alt="貼文預覽圖" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                                    <p class="small text-muted mt-1">檔案名稱: ${file.name}</p>
                                    <p class="small text-muted">檔案大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            `;
                        } else {
                            postFilePreview.innerHTML = `
                                <div class="mt-2 p-2 bg-light rounded">
                                    <i class="bi bi-file-earmark"></i> ${file.name}
                                    <small class="text-muted d-block">檔案大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</small>
                                </div>
                            `;
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    postFilePreview.innerHTML = '';
                }
            });
        }
    }

    // 載入設計作品
    async function loadDesigns() {
        try {
            showLoading('載入設計作品中...');
            const response = await fetch('/api/design/works');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            allDesigns = data;
            renderUniformTable(allDesigns.filter(design => design.type === '系服'));
            renderPostTable(allDesigns.filter(design => design.type !== '系服'));
        } catch (error) {
            showError('載入設計作品失敗: ' + error.message);
        } finally {
            hideLoading();
        }
    }

    // 渲染系服表格
    function renderUniformTable(designs) {
        if (!uniformTableBody) return;

        if (designs.length === 0) {
            uniformTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-inbox"></i> 尚無系服設計作品
                    </td>
                </tr>
            `;
            return;
        }

        uniformTableBody.innerHTML = '';
        designs.forEach(design => {
            const row = document.createElement('tr');
            
            const vendorInfo = design.vendor_name || design.vendor_name_from_table || '未指定';
            const priceInfo = design.price ? `NT$ ${parseInt(design.price).toLocaleString()}` : '未設定';
            const vendorDisplay = `${vendorInfo}<br><span class="price-display">${priceInfo}</span>`;
            
            const ratingDisplay = design.rating ? 
                '⭐'.repeat(parseInt(design.rating)) + ` (${design.rating}分)` : 
                '<span class="text-muted">未評分</span>';
            
            const fileExtension = getFileExtension(design.file_path);
            const fileDisplay = `
                <button class="btn btn-sm btn-outline-primary download-btn" 
                        data-id="${design.id}" 
                        data-title="${design.title}" 
                        data-path="${design.file_path}">
                    <i class="bi bi-download"></i> ${fileExtension.toUpperCase()}
                </button>
            `;
            
            const createdDate = new Date(design.created_at).toLocaleDateString('zh-TW');
            
            row.innerHTML = `
                <td>${design.title}</td>
                <td>👕 ${design.type}</td>
                <td>${vendorDisplay}</td>
                <td>${ratingDisplay}</td>
                <td>${fileDisplay}</td>
                <td>${createdDate}</td>
                <td>
                    <div class="d-flex flex-column gap-1">
                        <button class="btn btn-sm btn-warning edit-design-btn" data-id="${design.id}">
                            <i class="bi bi-pencil"></i> 編輯
                        </button>
                        <button class="btn btn-sm btn-danger delete-design-btn" data-id="${design.id}">
                            <i class="bi bi-trash"></i> 刪除
                        </button>
                    </div>
                </td>
            `;
            uniformTableBody.appendChild(row);
        });
        
        attachActionListeners();
    }

    // 渲染貼文表格 - 簡化版本，只顯示標題、檔案、創建日期、操作
    function renderPostTable(designs) {
        if (!postTableBody) return;

        if (designs.length === 0) {
            postTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="bi bi-inbox"></i> 尚無貼文設計作品
                    </td>
                </tr>
            `;
            return;
        }

        postTableBody.innerHTML = '';
        designs.forEach(design => {
            const row = document.createElement('tr');
            
            const fileExtension = getFileExtension(design.file_path);
            const fileDisplay = `
                <button class="btn btn-sm btn-outline-primary download-btn" 
                        data-id="${design.id}" 
                        data-title="${design.title}" 
                        data-path="${design.file_path}">
                    <i class="bi bi-download"></i> ${fileExtension.toUpperCase()}
                </button>
            `;
            
            const createdDate = new Date(design.created_at).toLocaleDateString('zh-TW');
            
            row.innerHTML = `
                <td>${design.title}</td>
                <td>${fileDisplay}</td>
                <td>${createdDate}</td>
                <td>
                    <div class="d-flex flex-column gap-1">
                        <button class="btn btn-sm btn-warning edit-design-btn" data-id="${design.id}">
                            <i class="bi bi-pencil"></i> 編輯
                        </button>
                        <button class="btn btn-sm btn-danger delete-design-btn" data-id="${design.id}">
                            <i class="bi bi-trash"></i> 刪除
                        </button>
                    </div>
                </td>
            `;
            postTableBody.appendChild(row);
        });
        
        attachActionListeners();
    }

    // 綁定操作按鈕事件
    function attachActionListeners() {
        // 下載按鈕
        document.querySelectorAll('.download-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const filePath = e.target.closest('button').dataset.path;
                const title = e.target.closest('button').dataset.title;
                
                if (filePath) {
                    const link = document.createElement('a');
                    link.href = filePath;
                    link.download = title || 'design-file';
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    showError('檔案路徑不存在');
                }
            });
        });

        // 刪除按鈕
        document.querySelectorAll('.delete-design-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const designId = e.target.closest('button').dataset.id;
                const design = allDesigns.find(d => d.id == designId);
                
                if (window.confirm(`確定要刪除「${design?.title || '此設計作品'}」嗎？\n此操作無法復原。`)) {
                    try {
                        showLoading('刪除設計作品中...');
                        const response = await fetch(`/api/design/works/${designId}`, {
                            method: 'DELETE'
                        });
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        const result = await response.json();
                        
                        if (result.success) {
                            showSuccess(result.message || '設計作品已刪除');
                            await loadDesigns(); // 這會在 finally 中隱藏載入指示器
                        } else {
                            throw new Error(result.error || result.message || '刪除失敗');
                        }
                    } catch (error) {
                        showError('刪除設計作品失敗: ' + error.message);
                        hideLoading(); // 確保在錯誤時隱藏載入指示器
                    }
                }
            });
        });

        // 編輯按鈕
        document.querySelectorAll('.edit-design-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const designId = e.target.closest('button').dataset.id;
                openEditModal(designId);
            });
        });
    }

    // 切換編輯模態框中廠商相關欄位的顯示
    function toggleVendorFields(isUniform) {
        const vendorRequiredElements = document.querySelectorAll('.vendor-required');
        const vendorNameField = document.getElementById('editVendorName');
        const ratingField = document.getElementById('editDesignRating');
        const priceField = document.getElementById('editPrice');
        
        if (isUniform) {
            vendorRequiredElements.forEach(el => el.style.display = 'inline');
            vendorNameField.parentElement.style.display = 'block';
            ratingField.parentElement.style.display = 'block';
            priceField.parentElement.style.display = 'block';
        } else {
            vendorRequiredElements.forEach(el => el.style.display = 'none');
            vendorNameField.parentElement.style.display = 'none';
            ratingField.parentElement.style.display = 'none';
            priceField.parentElement.style.display = 'none';
            // 清空非系服類型的廠商相關欄位
            vendorNameField.value = '';
            ratingField.value = '';
            priceField.value = '';
        }
    }

    // 開啟編輯模態框
    function openEditModal(designId) {
        const design = allDesigns.find(d => d.id == designId);
        if (!design) return;

        currentEditId = designId;
        
        document.getElementById('editDesignId').value = design.id;
        document.getElementById('editDesignTitle').value = design.title;
        document.getElementById('editDesignType').value = design.type;
        document.getElementById('editVendorName').value = design.vendor_name || '';
        document.getElementById('editDesignRating').value = design.rating || '';
        document.getElementById('editPrice').value = design.price || '';
        document.getElementById('editDesignDescription').value = design.description || '';
        
        // 根據設計類型顯示/隱藏廠商相關欄位
        toggleVendorFields(design.type === '系服');
        
        const currentFileInfo = document.getElementById('currentFileInfo');
        if (design.file_path) {
            const fileName = design.file_path.split(/[\/]/).pop();
            currentFileInfo.innerHTML = `
                <small class="text-muted">
                    <i class="bi bi-file-earmark"></i> 目前檔案: ${fileName}
                </small>
            `;
        }
        
        const modal = new bootstrap.Modal(editDesignModal);
        modal.show();
    }

    // 系服表單提交
    if (uniformForm) {
        uniformForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 驗證系服必填欄位
            const title = document.getElementById('uniformTitle').value.trim();
            const vendorName = document.getElementById('uniformVendor').value.trim();
            const rating = document.getElementById('uniformRating').value;
            const price = document.getElementById('uniformPrice').value;
            
            if (!title) {
                showError('請填寫系服標題');
                return;
            }
            if (!vendorName) {
                showError('請填寫廠商名稱');
                return;
            }
            if (!rating) {
                showError('請選擇廠商評分');
                return;
            }
            if (!price) {
                showError('請填寫購買價格');
                return;
            }
            
            const formData = new FormData(uniformForm);
            formData.set('type', '系服'); // 強制設定為系服類型
            
            try {
                showLoading('上傳系服設計中...');
                const response = await fetch('/api/design/works', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const result = await response.json();
                
                if (result.success) {
                    showSuccess('系服設計上傳成功！');
                    uniformForm.reset();
                    uniformFilePreview.innerHTML = '';
                    loadDesigns();
                } else {
                    throw new Error(result.error || '上傳失敗');
                }
            } catch (error) {
                showError('上傳系服設計失敗: ' + error.message);
                hideLoading();
            }
        });
    }

    // 貼文表單提交
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 驗證貼文必填欄位
            const title = document.getElementById('postTitle').value.trim();
            
            if (!title) {
                showError('請填寫貼文標題');
                return;
            }
            
            const formData = new FormData(postForm);
            
            try {
                showLoading('上傳貼文設計中...');
                const response = await fetch('/api/design/works', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const result = await response.json();
                
                if (result.success) {
                    showSuccess('貼文設計上傳成功！');
                    postForm.reset();
                    postFilePreview.innerHTML = '';
                    loadDesigns();
                } else {
                    throw new Error(result.error || '上傳失敗');
                }
            } catch (error) {
                showError('上傳貼文設計失敗: ' + error.message);
                hideLoading();
            }
        });
    }

    // 編輯表單提交
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', async () => {
            // 檢查是否為系服類型，如果是則驗證必填欄位
            const editType = document.getElementById('editDesignType').value;
            if (editType === '系服') {
                const vendorName = document.getElementById('editVendorName').value.trim();
                const rating = document.getElementById('editDesignRating').value;
                const price = document.getElementById('editPrice').value;
                
                if (!vendorName) {
                    showError('請填寫廠商名稱');
                    return;
                }
                if (!rating) {
                    showError('請選擇廠商評分');
                    return;
                }
                if (!price) {
                    showError('請填寫購買價格');
                    return;
                }
            }
            
            const formData = new FormData();
            formData.append('title', document.getElementById('editDesignTitle').value);
            formData.append('description', document.getElementById('editDesignDescription').value);
            formData.append('type', document.getElementById('editDesignType').value);
            
            // 只有系服類型才添加廠商相關欄位
            if (editType === '系服') {
                formData.append('vendor_name', document.getElementById('editVendorName').value);
                formData.append('rating', document.getElementById('editDesignRating').value);
                formData.append('price', document.getElementById('editPrice').value);
            }
            
            const fileInput = document.getElementById('editDesignImage');
            if (fileInput.files[0]) {
                formData.append('image', fileInput.files[0]);
            }
            
            try {
                showLoading('更新設計作品中...');
                const response = await fetch(`/api/design/works/${currentEditId}`, {
                    method: 'PUT',
                    body: formData
                });
                const result = await response.json();
                
                if (result.success) {
                    showSuccess(result.message || '設計作品更新成功！');
                    const modal = bootstrap.Modal.getInstance(editDesignModal);
                    modal.hide();
                    await loadDesigns();
                } else {
                    throw new Error(result.error || result.message || '更新失敗');
                }
            } catch (error) {
                showError('更新設計作品失敗: ' + error.message);
                hideLoading();
            }
        });
    }

    // 系服篩選功能
    if (uniformFilter) {
        uniformFilter.addEventListener('change', (e) => {
            const filterValue = e.target.value;
            // 修正篩選邏輯：如果有選擇特定值，則篩選該值；否則顯示所有系服
            const filteredDesigns = allDesigns.filter(design => design.type === '系服');
            renderUniformTable(filteredDesigns);
        });
    }

    // 匯出設計資料功能
    window.exportDesignData = async function() {
        try {
            showLoading('正在匯出設計資料...');
            
            const response = await fetch('/api/design/works');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const designs = await response.json();
            
            if (designs.length === 0) {
                showError('沒有設計資料可以匯出');
                hideLoading();
                return;
            }
            
            // 準備CSV資料
            const csvHeaders = ['ID', '標題', '類型', '廠商名稱', '評分', '價格', '描述', '檔案路徑', '創建日期'];
            const csvRows = designs.map(design => [
                design.id || '',
                design.title || '',
                design.type || '',
                design.vendor_name || design.vendor_name_from_table || '',
                design.rating || '',
                design.price || '',
                design.description || '',
                design.file_path || '',
                design.created_at ? new Date(design.created_at).toLocaleString('zh-TW') : ''
            ]);
            
            // 建立CSV內容
            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                .join('\n');
            
            // 建立並下載檔案
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `設計部資料_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showSuccess(`成功匯出 ${designs.length} 筆設計資料`);
        } catch (error) {
            showError('匯出設計資料失敗: ' + error.message);
        } finally {
            hideLoading();
        }
    };
});