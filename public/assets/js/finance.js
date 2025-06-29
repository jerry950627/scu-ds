document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 財務管理頁面載入中...');
    console.log('📍 當前頁面URL:', window.location.href);
    console.log('📍 當前時間:', new Date().toLocaleString('zh-TW'));
    
    // 檢查是否在財務管理頁面
    const isFinancePage = window.location.pathname === '/finance' || 
                         window.location.pathname.includes('/finance');
    
    if (!isFinancePage) {
        console.log('📍 非財務頁面，跳過財務管理初始化');
        return;
    }
    
    console.log('✅ 確認為財務頁面，開始初始化...');
    
    // DOM 元素檢查
    const addFinanceRecordForm = document.getElementById('addFinanceRecordForm');
    const editFinanceRecordForm = document.getElementById('editFinanceRecordForm');
    const exportForm = document.getElementById('exportForm');
    const sortSelect = document.getElementById('sortOrder');
    const financeRecordsContainer = document.getElementById('financeRecordsContainer');
    const addMoreRecordBtn = document.getElementById('addMoreRecordBtn');
    
    console.log('🔍 DOM 元素檢查結果:');
    console.log('  - addFinanceRecordForm:', addFinanceRecordForm ? '✅ 找到' : '❌ 未找到');
    console.log('  - editFinanceRecordForm:', editFinanceRecordForm ? '✅ 找到' : '❌ 未找到');
    console.log('  - exportForm:', exportForm ? '✅ 找到' : '❌ 未找到');
    console.log('  - sortSelect:', sortSelect ? '✅ 找到' : '❌ 未找到');
    console.log('  - financeRecordsContainer:', financeRecordsContainer ? '✅ 找到' : '❌ 未找到');
    console.log('  - addMoreRecordBtn:', addMoreRecordBtn ? '✅ 找到' : '❌ 未找到');
    
    // 檢查表單內的提交按鈕
    if (addFinanceRecordForm) {
        const submitBtn = addFinanceRecordForm.querySelector('button[type="submit"]');
        console.log('  - 提交按鈕:', submitBtn ? '✅ 找到' : '❌ 未找到');
        if (submitBtn) {
            console.log('    按鈕文字:', submitBtn.textContent.trim());
        }
    }
    
    // 檢查初始記錄項目
    if (financeRecordsContainer) {
        const initialItems = financeRecordsContainer.querySelectorAll('.finance-record-item');
        console.log('  - 初始記錄項目數量:', initialItems.length);
        
        if (initialItems.length > 0) {
            const firstItem = initialItems[0];
            const typeSelect = firstItem.querySelector('.record-type');
            const amountInput = firstItem.querySelector('.record-amount');
            const dateInput = firstItem.querySelector('.record-date');
            
            console.log('    第一個記錄項目的欄位:');
            console.log('    - 類型選擇:', typeSelect ? '✅' : '❌');
            console.log('    - 金額輸入:', amountInput ? '✅' : '❌');
            console.log('    - 日期輸入:', dateInput ? '✅' : '❌');
        }
    }
    
    // 如果關鍵元素缺失，顯示錯誤
    if (!addFinanceRecordForm) {
        console.error('❌ 致命錯誤: 找不到財務記錄表單！');
        showMessage('error', '頁面載入錯誤：找不到財務記錄表單，請重新整理頁面');
        return;
    }
    
    if (!financeRecordsContainer) {
        console.error('❌ 致命錯誤: 找不到記錄容器！');
        showMessage('error', '頁面載入錯誤：找不到記錄容器，請重新整理頁面');
        return;
    }
    
    // DOM 元素
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpenseEl = document.getElementById('totalExpense');
    const balanceEl = document.getElementById('balance');
    const totalBalanceEl = document.getElementById('totalBalance');

    function showMessage(type, message) {
        console.log(`📢 [${type.toUpperCase()}] ${message}`);
        
        // 移除現有的訊息
        const existingMessage = document.querySelector('.custom-alert');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 創建新的訊息元素
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show custom-alert position-fixed`;
        alertDiv.style.cssText = `
            top: 20px; 
            right: 20px; 
            z-index: 9999; 
            min-width: 300px;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        `;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // 自動移除訊息
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, type === 'success' ? 4000 : 6000);
    }

    // 載入財務摘要
    async function loadFinanceSummary() {
        try {
            console.log('📊 開始載入財務摘要...');
            const response = await fetch('/api/finance/summary', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📊 財務摘要 API 響應狀態:', response.status);
            
            if (response.status === 401) {
                console.warn('⚠️ 用戶未登入，重定向到登入頁面');
                window.location.href = '/';
                return;
            }
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 財務摘要數據:', data);
                
                const summary = data.data || data;
                if (totalIncomeEl) {
                    totalIncomeEl.textContent = `NT$ ${(summary.totalIncome || 0).toLocaleString()}`;
                }
                if (totalExpenseEl) {
                    totalExpenseEl.textContent = `NT$ ${(summary.totalExpense || 0).toLocaleString()}`;
                }
                
                // 更新總餘額顯示
                if (totalBalanceEl) {
                    const balance = summary.balance || 0;
                    totalBalanceEl.textContent = `NT$ ${balance.toLocaleString()}`;
                    // 根據餘額正負設定顏色
                    if (balance >= 0) {
                        totalBalanceEl.className = 'text-primary';
                    } else {
                        totalBalanceEl.className = 'text-danger';
                    }
                }
                
                // 更新時間
                const lastUpdateElement = document.getElementById('lastUpdate');
                if (lastUpdateElement) {
                    lastUpdateElement.textContent = new Date().toLocaleString('zh-TW');
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: '未知錯誤' }));
                console.error('❌ 載入財務摘要失敗:', response.status, errorData);
                showMessage('warning', `載入財務摘要失敗: ${errorData.error || '請檢查網路連接'}`);
            }
        } catch (error) {
            console.error('❌ 載入財務摘要網路錯誤:', error);
            showMessage('error', '載入財務摘要時發生網路錯誤，請檢查連接狀態');
        }
    }

    // 載入財務記錄
    async function loadFinanceRecords(sortOrder = 'desc') {
        try {
            console.log('📋 載入財務記錄，排序:', sortOrder);
            
            const response = await fetch(`/api/finance?page=1&limit=50&sort=${sortOrder}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📋 財務記錄 API 響應狀態:', response.status);
            
            if (response.status === 401) {
                console.warn('⚠️ 用戶未登入，重定向到登入頁面');
                window.location.href = '/';
                return;
            }
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 財務記錄數據:', data);
                
                const tbody = document.getElementById('financeRecordsTableBody');
                if (!tbody) {
                    console.error('❌ 找不到表格 tbody');
                    showMessage('error', '頁面結構錯誤，請重新整理頁面');
                    return;
                }

                // 修正：處理多種可能的資料結構
                let records = [];
                if (data.data && data.data.records) {
                    records = data.data.records;
                } else if (data.data && Array.isArray(data.data)) {
                    records = data.data;
                } else if (data.records) {
                    records = data.records;
                } else if (Array.isArray(data)) {
                    records = data;
                }
                
                console.log('📝 解析後的記錄:', records);
                    
                if (records.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                        <td colspan="8" class="text-center text-muted py-4">
                                <i class="fas fa-inbox fa-2x mb-2 d-block"></i>
                                目前還沒有財務記錄
                                <div class="mt-2">
                                    <small>請先新增一些收入或支出記錄</small>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                // 計算累計餘額
                let runningBalance = 0;
                const recordsWithBalance = records.map(record => {
                    if (record.type === 'income') {
                        runningBalance += parseFloat(record.amount);
                    } else {
                        runningBalance -= parseFloat(record.amount);
                    }
                    return {
                        ...record,
                        balance: runningBalance
                    };
                });
                
                tbody.innerHTML = recordsWithBalance.map(record => `
                        <tr>
                            <td>${record.id}</td>
                        <td>${record.date ? new Date(record.date).toLocaleDateString('zh-TW') : ''}</td>
                            <td>
                                <span class="badge ${record.type === 'income' ? 'bg-success' : 'bg-danger'}">
                                    ${record.type === 'income' ? '收入' : '支出'}
                                </span>
                            </td>
                            <td class="${record.type === 'income' ? 'text-success' : 'text-danger'}">
                                ${record.type === 'income' ? '+' : '-'}NT$ ${Math.abs(record.amount).toLocaleString()}
                            </td>
                        <td class="${record.balance >= 0 ? 'text-success' : 'text-danger'} fw-bold">
                            NT$ ${record.balance.toLocaleString()}
                        </td>
                            <td>${record.description || record.title || ''}</td>
                        <td>${record.creator_name || record.created_by_username || record.created_by || ''}</td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewFinanceRecord(${record.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-warning me-1" onclick="editFinanceRecord(${record.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteFinanceRecord(${record.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('');
                
                attachFinanceActionListeners();
            }
            
            loadFinanceSummary(); // 每次載入記錄後更新摘要
        } else {
            const errorData = await response.json().catch(() => ({ error: '未知錯誤' }));
            console.error('❌ 載入財務記錄失敗:', response.status, errorData);
            showMessage('error', `載入財務記錄失敗: ${errorData.error || '請檢查網路連接'}`);
        }
        } catch (error) {
            console.error('❌ 載入財務記錄網路錯誤:', error);
            showMessage('error', '載入財務記錄時發生網路錯誤，請檢查連接狀態');
        }
    }

    // 修正匯出功能
    if (exportForm) {
        exportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const startDate = document.getElementById('exportStartDate').value;
            const endDate = document.getElementById('exportEndDate').value;
            const type = document.getElementById('exportType').value;
            const format = document.getElementById('exportFormat').value;

            let queryParams = [];
            if (startDate) queryParams.push(`startDate=${startDate}`);
            if (endDate) queryParams.push(`endDate=${endDate}`);
            if (type && type !== 'all') queryParams.push(`type=${type}`);
            if (format) queryParams.push(`format=${format}`);

            const queryString = queryParams.join('&');
            let exportUrl;
            
            if (format === 'excel') {
                exportUrl = `/api/finance/export/excel${queryString ? '?' + queryString : ''}`;
            } else {
                // CSV格式 - 使用JSON格式然後轉換
                exportUrl = `/api/finance/export${queryString ? '?' + queryString : ''}`;
            }

            try {
                showMessage('info', '正在準備匯出檔案...');
                
                if (format === 'excel') {
                    // Excel格式直接下載
                    const link = document.createElement('a');
                    link.href = exportUrl;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    showMessage('success', '📥 Excel檔案匯出完成');
                } else {
                    // CSV格式 - 獲取數據後轉換
                    const response = await fetch(exportUrl);
                    if (response.ok) {
                        const data = await response.json();
                        const records = data.data || data;
                        
                        if (records.length === 0) {
                            showMessage('warning', '沒有符合條件的記錄可匯出');
                            return;
                        }
                        
                        // 轉換為CSV
                        const csvHeader = ['日期', '類型', '金額', '描述', '分類', '備註', '創建時間'];
                        const csvRows = records.map(record => [
                            record.date,
                            record.type === 'income' ? '收入' : '支出',
                            record.amount,
                            record.description || record.title || '',
                            record.category || '',
                            record.notes || '',
                            new Date(record.created_at).toLocaleString('zh-TW')
                        ]);
                        
                        const csvContent = [csvHeader, ...csvRows].map(row => 
                            row.map(cell => `"${cell}"`).join(',')
                        ).join('\n');
                        
                        // 下載CSV
                        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        link.setAttribute('href', url);
                        link.setAttribute('download', `財務記錄_${new Date().toISOString().split('T')[0]}.csv`);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        showMessage('success', `📥 CSV檔案匯出完成，共 ${records.length} 筆記錄`);
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                }
                
                // 關閉模態框
                const exportModal = bootstrap.Modal.getInstance(document.getElementById('exportModal'));
                if (exportModal) exportModal.hide();
                
            } catch (error) {
                console.error('匯出錯誤:', error);
                showMessage('error', `匯出失敗：${error.message}`);
            }
        });
    }

    // 綁定財務記錄操作按鈕事件
    function attachFinanceActionListeners() {
        document.querySelectorAll('.view-finance-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const recordId = e.target.dataset.id;
                try {
                    const response = await fetch(`/api/finance/records/${recordId}`);
                    if (!response.ok) throw new Error('無法獲取財務記錄詳情');
                    const record = await response.json();
                    document.getElementById('viewFinanceDate').textContent = new Date(record.date).toLocaleString();
                    document.getElementById('viewFinanceType').textContent = record.type === 'income' ? '收入' : '支出';
                    document.getElementById('viewFinanceAmount').textContent = parseFloat(record.amount).toFixed(2);
                    document.getElementById('viewFinanceDescription').textContent = record.description || 'N/A';
                    document.getElementById('viewFinanceCreatedBy').textContent = record.createdByUsername || 'N/A';
                    const receiptLink = document.getElementById('viewFinanceReceiptLink');
                    if (record.receipt) {
                        receiptLink.href = record.receipt;
                        receiptLink.textContent = record.receipt.split(/[\/]/).pop();
                        receiptLink.style.display = 'inline';
                    } else {
                        receiptLink.style.display = 'none';
                    }
                    if (viewFinanceRecordModal) viewFinanceRecordModal.show();
                } catch (error) {
                    console.error('查看財務記錄失敗:', error);
                    showMessage('error', '查看財務記錄失敗: ' + error.message);
                }
            });
        });

        document.querySelectorAll('.edit-finance-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const recordId = e.target.dataset.id;
                try {
                    const response = await fetch(`/api/finance/records/${recordId}`);
                    if (!response.ok) throw new Error('無法獲取財務記錄以編輯');
                    const record = await response.json();
                    document.getElementById('editFinanceRecordId').value = record.id;
                    document.getElementById('editFinanceType').value = record.type;
                    document.getElementById('editFinanceAmount').value = record.amount;
                    document.getElementById('editFinanceDate').value = record.date.split('T')[0];
                    document.getElementById('editFinanceDescription').value = record.description || '';
                    document.getElementById('editFinanceReceipt').value = ''; // 清空文件選擇
                    if (editFinanceRecordModal) editFinanceRecordModal.show();
                } catch (error) {
                    console.error('編輯財務記錄失敗:', error);
                    showMessage('error', '編輯財務記錄失敗: ' + error.message);
                }
            });
        });

        document.querySelectorAll('.delete-finance-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const recordId = e.target.dataset.id;
                if (window.confirm('確定要刪除此財務記錄嗎？')) {
                    try {
                        const response = await fetch(`/api/finance/records/${recordId}`, { method: 'DELETE' });
                        if (response.ok) {
                            showMessage('success', '<i class="fas fa-check-circle me-2"></i>財務記錄已刪除');
                            loadFinanceRecords(sortSelect ? sortSelect.value : 'desc');
                        } else {
                            const result = await response.json();
                            showMessage('error', '<i class="fas fa-exclamation-triangle me-2"></i>' + (result.error || '刪除財務記錄失敗'));
                        }
                    } catch (error) {
                        console.error('刪除財務記錄失敗:', error);
                        showMessage('error', '<i class="fas fa-exclamation-triangle me-2"></i>刪除財務記錄失敗: ' + error.message);
                    }
                }
            });
        });
    }

    // 新增財務記錄表單處理
    console.log('🎯 開始初始化財務記錄表單...');
    
    // 記錄索引
    let recordIndex = 0;

    // 設定第一筆記錄的預設日期
    const firstDateInput = document.querySelector('.record-date');
    if (firstDateInput) {
        const today = new Date().toISOString().split('T')[0];
        firstDateInput.value = today;
    }

    // 新增更多記錄按鈕
    if (addMoreRecordBtn) {
        addMoreRecordBtn.addEventListener('click', () => {
            recordIndex++;
            const newRecordItem = createRecordItem(recordIndex);
            financeRecordsContainer.appendChild(newRecordItem);
            updateRemoveButtons();
            showMessage('info', `已新增記錄 #${recordIndex + 1}`);
        });
    }

    // 創建新的記錄項目
    function createRecordItem(index) {
        const div = document.createElement('div');
        div.className = 'finance-record-item border rounded p-3 mb-3';
        div.setAttribute('data-record-index', index);
        
        const today = new Date().toISOString().split('T')[0];
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0"><i class="fas fa-file-invoice-dollar me-2"></i>記錄 #${index + 1}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger remove-record-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="row">
                <div class="col-md-6">
                <div class="mb-3">
                        <label class="form-label">類型 <span class="text-danger">*</span></label>
                        <select class="form-select record-type" name="records[${index}][type]" required>
                            <option value="">請選擇</option>
                        <option value="income">收入</option>
                        <option value="expense">支出</option>
                    </select>
                </div>
                </div>
                <div class="col-md-6">
                <div class="mb-3">
                        <label class="form-label">金額 <span class="text-danger">*</span></label>
                        <input type="number" step="0.01" class="form-control record-amount" name="records[${index}][amount]" required min="0.01">
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                <div class="mb-3">
                        <label class="form-label">日期 <span class="text-danger">*</span></label>
                        <input type="date" class="form-control record-date" name="records[${index}][date]" value="${today}" required>
                    </div>
                </div>
                <div class="col-md-6">
                <div class="mb-3">
                        <label class="form-label">分類</label>
                        <input type="text" class="form-control record-category" name="records[${index}][category]" placeholder="例如：學費、活動費用">
                    </div>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">描述</label>
                <textarea class="form-control record-description" name="records[${index}][description]" rows="2" placeholder="請輸入詳細說明"></textarea>
            </div>
            <div class="mb-3">
                <label class="form-label">備註</label>
                <textarea class="form-control record-notes" name="records[${index}][notes]" rows="1" placeholder="額外備註（可選）"></textarea>
            </div>
            <div class="mb-3">
                <label class="form-label">收據 (可選)</label>
                <input type="file" class="form-control record-receipt" name="receipt" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
                <div class="form-text">支援格式：PDF、JPG、PNG、DOC、DOCX，最大10MB</div>
            </div>
            `;
            
        // 綁定移除按鈕事件
        const removeBtn = div.querySelector('.remove-record-btn');
        removeBtn.addEventListener('click', () => {
            div.remove();
            updateRecordNumbers();
            updateRemoveButtons();
            showMessage('info', '已移除一筆記錄');
        });
        
        return div;
    }

    // 更新記錄編號
    function updateRecordNumbers() {
        const items = financeRecordsContainer.querySelectorAll('.finance-record-item');
        items.forEach((item, index) => {
            const title = item.querySelector('h6');
            title.innerHTML = `<i class="fas fa-file-invoice-dollar me-2"></i>記錄 #${index + 1}`;
        });
    }

    // 更新移除按鈕的顯示狀態
    function updateRemoveButtons() {
        const items = financeRecordsContainer.querySelectorAll('.finance-record-item');
        items.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-record-btn');
            if (items.length <= 1) {
                removeBtn.style.display = 'none';
            } else {
                removeBtn.style.display = 'block';
            }
        });
    }

    // 提交表單處理
    if (addFinanceRecordForm) {
        console.log('🎯 綁定財務記錄表單提交事件...');
        
        addFinanceRecordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            console.log('=== 財務記錄表單提交開始 ===');
            console.log('📋 表單元素:', addFinanceRecordForm);
            
            const recordItems = financeRecordsContainer.querySelectorAll('.finance-record-item');
            console.log(`📊 找到 ${recordItems.length} 個記錄項目`);
            
            if (recordItems.length === 0) {
                console.error('❌ 沒有找到任何記錄項目！');
                showMessage('error', '找不到記錄項目，請重新整理頁面');
                return;
            }
            
            const records = [];
            let hasValidRecord = false;
            
            recordItems.forEach((item, index) => {
                const type = item.querySelector('.record-type')?.value?.trim();
                const amount = item.querySelector('.record-amount')?.value?.trim();
                const date = item.querySelector('.record-date')?.value?.trim();
                const category = item.querySelector('.record-category')?.value?.trim() || '其他';
                const description = item.querySelector('.record-description')?.value?.trim() || '';
                const notes = item.querySelector('.record-notes')?.value?.trim() || '';
                
                console.log(`📝 記錄 ${index + 1}:`, { type, amount, date, category, description, notes });
                
                if (type && amount && date) {
                    hasValidRecord = true;
                    const numAmount = parseFloat(amount);
                    
                    records.push({
                        type,
                        amount: numAmount,
                        date,
                        category,
                        description,
                        notes,
                        index: index
                    });
                }
            });
            
            if (!hasValidRecord) {
                console.error('❌ 沒有有效的記錄可以提交');
                showMessage('error', '請至少填寫一筆完整的記錄（類型、金額、日期為必填）');
                return;
            }
            
            console.log(`✅ 準備提交 ${records.length} 筆有效記錄`);
            
            // 驗證每筆記錄
            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                const numAmount = parseFloat(record.amount);
                if (isNaN(numAmount) || numAmount <= 0) {
                    console.error(`❌ 記錄 ${i + 1} 金額驗證失敗:`, { original: record.amount, parsed: numAmount });
                    showMessage('error', `記錄 #${i + 1} 的金額必須是大於0的數字`);
                    return;
                }
            }
            
            // 顯示提交中狀態
            const submitBtn = addFinanceRecordForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>提交中...';
            
            let successCount = 0;
            let failCount = 0;
            const results = [];
            
            try {
                // 逐一提交每筆記錄
                for (let i = 0; i < records.length; i++) {
                    const record = records[i];
                    console.log(`📤 提交記錄 ${i + 1}/${records.length}:`, record);
                    
                    try {
                        const formData = new FormData();
                        formData.append('type', record.type);
                        formData.append('amount', record.amount.toString());
                        formData.append('date', record.date);
                        formData.append('category', record.category);
                        formData.append('description', record.description);
                        formData.append('notes', record.notes);
                        
                        // 檢查對應的收據檔案
                        const recordItem = recordItems[record.index];
                        const receiptInput = recordItem.querySelector('.record-receipt');
                        if (receiptInput && receiptInput.files && receiptInput.files[0]) {
                            formData.append('receipt', receiptInput.files[0]);
                            console.log(`📎 記錄 ${i + 1} 包含收據檔案: ${receiptInput.files[0].name}`);
                        }
                        
                        console.log(`🚀 發送記錄 ${i + 1} 到服務器...`);
                        
                        // 移除超時控制，讓請求自然完成
                        // const controller = new AbortController();
                        // const timeoutId = setTimeout(() => {
                        //     controller.abort();
                        //     console.error(`⏰ 記錄 ${i + 1} 請求超時 (30秒)`);
                        // }, 30000); // 30秒超時
                        
                        const response = await fetch('/api/finance/records', {
                            method: 'POST',
                            credentials: 'include',
                            body: formData
                            // signal: controller.signal  // 移除 signal
                        });
                        
                        // clearTimeout(timeoutId); // 移除清除計時器
                        
                        console.log(`📥 記錄 ${i + 1} 響應狀態:`, response.status);
                        
                        if (response.status === 401) {
                            console.warn('⚠️ 用戶未登入，重定向到登入頁面');
                            window.location.href = '/';
                            return;
                        }
                        
                        if (response.ok) {
                            const result = await response.json();
                            console.log(`✅ 記錄 ${i + 1} 提交成功:`, result);
                            results.push({ index: i + 1, success: true, data: result });
                            successCount++;
                        } else {
                            const errorData = await response.json().catch(() => ({ error: '未知錯誤' }));
                            console.error(`❌ 記錄 ${i + 1} 提交失敗:`, response.status, errorData);
                            results.push({ index: i + 1, success: false, error: errorData.error || '提交失敗' });
                            failCount++;
                        }
                    } catch (fetchError) {
                        console.error(`💥 記錄 ${i + 1} 網路請求失敗:`, fetchError);
                        
                        let errorMessage = `網路錯誤: ${fetchError.message}`;
                        
                        // 詳細錯誤分類
                        if (fetchError.name === 'AbortError') {
                            errorMessage = '請求被中止，這可能是由於瀏覽器擴展干擾造成的';
                        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
                            errorMessage = '網路請求失敗，可能的原因：\n1. 瀏覽器擴展干擾\n2. 網路連接問題\n3. 伺服器未啟動\n\n建議：請嘗試無痕瀏覽模式或停用所有擴展';
                        } else if (fetchError.name === 'SyntaxError') {
                            errorMessage = '伺服器響應格式錯誤';
                        } else if (fetchError.message && fetchError.message.includes('NetworkError')) {
                            errorMessage = '網路連接錯誤，請檢查網路狀態';
                        }
                        
                        // 檢測可能的瀏覽器擴展干擾
                        if (fetchError.stack && fetchError.stack.includes('content_script')) {
                            errorMessage = '⚠️ 檢測到瀏覽器擴展干擾！\n\n解決方案：\n1. 嘗試無痕瀏覽模式\n2. 暫時停用所有瀏覽器擴展\n3. 使用簡化測試頁面：/test_finance_simple.html';
                        }
                        
                        // 如果是網路錯誤，嘗試簡單的連接測試
                        if (fetchError.name === 'TypeError' || fetchError.name === 'NetworkError') {
                            try {
                                const testResponse = await fetch('/api/health', { 
                                    method: 'GET',
                                    cache: 'no-cache',
                                    credentials: 'same-origin'
                                });
                                if (!testResponse.ok) {
                                    errorMessage += '\n\n伺服器健康檢查失敗，請聯繫管理員';
                                } else {
                                    errorMessage += '\n\n伺服器運行正常，問題可能出在瀏覽器擴展干擾';
                                }
                            } catch (testError) {
                                errorMessage += '\n\n無法連接伺服器，請檢查伺服器是否正在運行';
                            }
                        }
                        
                        results.push({ 
                            index: i + 1, 
                            success: false, 
                            error: errorMessage,
                            details: {
                                name: fetchError.name,
                                message: fetchError.message,
                                stack: fetchError.stack,
                                isExtensionInterference: fetchError.stack && fetchError.stack.includes('content_script')
                            }
                        });
                        failCount++;
                    }
                }
                
                // 顯示結果摘要
                console.log('📊 提交結果摘要:', { successCount, failCount, results });
                
                if (successCount > 0 && failCount === 0) {
                    showMessage('success', `🎉 所有 ${successCount} 筆記錄提交成功！`);
                    
                    // 重置表單
                    addFinanceRecordForm.reset();
                    
                    // 重置為一筆記錄
                    const extraItems = financeRecordsContainer.querySelectorAll('.finance-record-item:not(:first-child)');
                    extraItems.forEach(item => item.remove());
                    updateRemoveButtons();
                    
                    // 設定第一筆記錄的預設日期
                    const firstDateInput = financeRecordsContainer.querySelector('.record-date');
                    if (firstDateInput) {
                        firstDateInput.value = new Date().toISOString().split('T')[0];
                    }
                    
                    // 重新載入記錄列表
                    loadFinanceRecords(sortSelect ? sortSelect.value : 'desc');
                    
                } else if (successCount > 0 && failCount > 0) {
                    showMessage('warning', `⚠️ 部分成功：${successCount} 筆成功，${failCount} 筆失敗`);
                    
                    // 顯示失敗的記錄詳情
                    const failedRecords = results.filter(r => !r.success);
                    console.log('❌ 失敗的記錄:', failedRecords);
                    
                    // 重新載入記錄列表
                    loadFinanceRecords(sortSelect ? sortSelect.value : 'desc');
                    
                } else {
                    showMessage('error', `❌ 所有記錄提交失敗，請檢查網路連接或聯繫管理員`);
                }
                
            } catch (error) {
                console.error('💥 網路錯誤:', error);
                showMessage('error', `網路錯誤: ${error.message}`);
            } finally {
                // 恢復提交按鈕
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                console.log('=== 財務記錄表單提交完成 ===');
            }
        });
    }

    // 編輯財務記錄
    if (editFinanceRecordForm) {
        editFinanceRecordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const recordId = document.getElementById('editFinanceRecordId').value;
            const formData = new FormData(editFinanceRecordForm);
            try {
                const response = await fetch(`/api/finance/records/${recordId}`, {
                    method: 'PUT',
                    body: formData,
                });
                if (response.ok) {
                    showMessage('success', '財務記錄更新成功');
                    if (editFinanceRecordModal) editFinanceRecordModal.hide();
                    loadFinanceRecords(sortSelect ? sortSelect.value : 'desc');
                } else {
                    const result = await response.json();
                    showMessage('error', result.error || '更新財務記錄失敗');
                }
            } catch (error) {
                showMessage('error', '更新財務記錄過程中發生錯誤');
            }
        });
    }

    // 排序
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            loadFinanceRecords(e.target.value);
        });
    }

    // 頁面專用：更新統計數據的函數
    window.updateFinanceStats = async function() {
        try {
            const response = await fetch('/api/finance/summary');
            if (response.ok) {
                const summary = await response.json();
                
                // 更新統計卡片
                const totalUsersEl = document.getElementById('totalUsers');
                const totalEventsEl = document.getElementById('totalEvents');
                const totalBalanceEl = document.getElementById('totalBalance');
                
                if (totalBalanceEl) {
                    totalBalanceEl.textContent = `NT$ ${summary.balance.toFixed(0)}`;
                }
                
                // 如果在儀表板頁面，可以設置其他統計數據
                if (totalUsersEl && !totalUsersEl.textContent.includes('$')) {
                    totalUsersEl.textContent = '12';
                }
                if (totalEventsEl && !totalEventsEl.textContent.includes('$')) {
                    totalEventsEl.textContent = '5';
                }
            }
        } catch (error) {
            console.log('更新統計數據失敗:', error.message);
        }
    };

    // 初始化載入
    loadFinanceSummary();
    loadFinanceRecords(sortSelect ? sortSelect.value : 'desc');
    
    // 如果在儀表板頁面，更新統計數據
    if (window.location.pathname === '/dashboard' || window.location.pathname === '/') {
        updateFinanceStats();
    }
    
    // 將必要的函數暴露到全域範圍
    window.viewFinanceRecord = async function(recordId) {
        try {
            const response = await fetch(`/api/finance/${recordId}`);
            if (!response.ok) throw new Error('無法獲取財務記錄詳情');
            const data = await response.json();
            const record = data.data || data;
            
            document.getElementById('viewFinanceDate').textContent = new Date(record.date).toLocaleDateString('zh-TW');
            document.getElementById('viewFinanceType').textContent = record.type === 'income' ? '收入' : '支出';
            document.getElementById('viewFinanceAmount').textContent = `NT$ ${Math.abs(record.amount).toLocaleString()}`;
            document.getElementById('viewFinanceDescription').textContent = record.description || record.title || '無說明';
            document.getElementById('viewFinanceCreatedBy').textContent = record.creator_name || record.created_by || '系統';
            
            const receiptLink = document.getElementById('viewFinanceReceiptLink');
            if (record.receipt_url || record.receipt) {
                receiptLink.href = record.receipt_url || record.receipt;
                receiptLink.textContent = '查看收據';
                receiptLink.style.display = 'inline';
            } else {
                receiptLink.style.display = 'none';
            }
            
            const viewModal = new bootstrap.Modal(document.getElementById('viewFinanceRecordModal'));
            viewModal.show();
        } catch (error) {
            console.error('查看財務記錄失敗:', error);
            showMessage('error', '查看財務記錄失敗: ' + error.message);
        }
    };
    
    window.editFinanceRecord = async function(recordId) {
        try {
            const response = await fetch(`/api/finance/${recordId}`);
            if (!response.ok) throw new Error('無法獲取財務記錄以編輯');
            const data = await response.json();
            const record = data.data || data;
            
            document.getElementById('editFinanceRecordId').value = record.id;
            document.getElementById('editFinanceType').value = record.type;
            document.getElementById('editFinanceAmount').value = Math.abs(record.amount);
            document.getElementById('editFinanceDate').value = record.date.split('T')[0];
            document.getElementById('editFinanceDescription').value = record.description || record.title || '';
            document.getElementById('editFinanceReceipt').value = ''; // 清空文件選擇
            
            const editModal = new bootstrap.Modal(document.getElementById('editFinanceRecordModal'));
            editModal.show();
        } catch (error) {
            console.error('編輯財務記錄失敗:', error);
            showMessage('error', '編輯財務記錄失敗: ' + error.message);
        }
    };
    
    window.deleteFinanceRecord = async function(recordId) {
        if (window.confirm('確定要刪除此財務記錄嗎？')) {
            try {
                const response = await fetch(`/api/finance/${recordId}`, { method: 'DELETE' });
                if (response.ok) {
                    showMessage('success', '<i class="fas fa-check-circle me-2"></i>財務記錄已刪除');
                    loadFinanceRecords(sortSelect ? sortSelect.value : 'desc');
                } else {
                    const result = await response.json();
                    showMessage('error', '<i class="fas fa-exclamation-triangle me-2"></i>' + (result.error || '刪除財務記錄失敗'));
                }
            } catch (error) {
                console.error('刪除財務記錄失敗:', error);
                showMessage('error', '<i class="fas fa-exclamation-triangle me-2"></i>刪除財務記錄失敗: ' + error.message);
            }
        }
    };
});