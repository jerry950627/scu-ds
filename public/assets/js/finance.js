document.addEventListener('DOMContentLoaded', function() {
    // 顯示訊息函數
    function showMessage(type, message) {
        if (typeof ErrorHandler !== 'undefined') {
            if (type === 'error') {
                ErrorHandler.showError(message);
            } else if (type === 'success') {
                ErrorHandler.showSuccess(message);
            } else {
                // 對於其他類型，使用原有的實現
                const alertDiv = document.createElement('div');
                alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
                alertDiv.innerHTML = `
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                
                const container = document.querySelector('.container-fluid') || document.body;
                container.insertBefore(alertDiv, container.firstChild);
                
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.remove();
                    }
                }, 3000);
            }
        } else {
            // 備用實現
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    const financeRecordsTableBody = document.getElementById('financeRecordsTableBody');
    const addFinanceRecordForm = document.getElementById('addFinanceRecordForm');
    const editFinanceRecordForm = document.getElementById('editFinanceRecordForm');
    const addFinanceRecordModalEl = document.getElementById('addFinanceRecordModal');
    const editFinanceRecordModalEl = document.getElementById('editFinanceRecordModal');
    const addFinanceRecordModal = addFinanceRecordModalEl ? new bootstrap.Modal(addFinanceRecordModalEl) : null;
    const editFinanceRecordModal = editFinanceRecordModalEl ? new bootstrap.Modal(editFinanceRecordModalEl) : null;
    const viewFinanceRecordModalEl = document.getElementById('viewFinanceRecordModal');
    const viewFinanceRecordModal = viewFinanceRecordModalEl ? new bootstrap.Modal(viewFinanceRecordModalEl) : null;

    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpenseEl = document.getElementById('totalExpense');
    const balanceEl = document.getElementById('balance');
    const sortSelect = document.getElementById('sortOrder');
    const exportForm = document.getElementById('exportForm');

    // 載入財務摘要
    async function loadFinanceSummary() {
        try {
            const response = await fetch('/api/finance/summary');
            if (!response.ok) throw new Error('無法獲取財務摘要');
            const summary = await response.json();
            if (totalIncomeEl) totalIncomeEl.textContent = summary.totalIncome.toFixed(2);
            if (totalExpenseEl) totalExpenseEl.textContent = summary.totalExpense.toFixed(2);
            if (balanceEl) balanceEl.textContent = summary.balance.toFixed(2);
            
            // 更新頁面上的總餘額顯示
            const totalBalanceEl = document.getElementById('totalBalance');
            if (totalBalanceEl) {
                totalBalanceEl.textContent = `NT$ ${summary.balance.toFixed(2)}`;
            }
            
            // 更新最後更新時間
            const lastUpdateEl = document.getElementById('lastUpdate');
            if (lastUpdateEl) {
                lastUpdateEl.textContent = new Date().toLocaleString('zh-TW');
            }
            
            // 如果存在，調用全局的更新函數
            if (typeof updateTotalBalance === 'function') {
                updateTotalBalance();
            }
        } catch (error) {
            // 載入財務摘要失敗時靜默處理
            console.log('無法載入財務摘要:', error.message);
        }
    }

    // 載入財務記錄
    async function loadFinanceRecords(sortOrder = 'desc') {
        if (!financeRecordsTableBody) return;
        try {
            const response = await fetch(`/api/finance/records?sort=${sortOrder}`);
            if (!response.ok) throw new Error('無法獲取財務記錄');
            const result = await response.json();
            
            console.log('API 回應結構:', result);
            
            // 處理分頁格式的回應
            const records = result.data?.records || result.records || result.data || [];
            
            console.log('解析出的記錄:', records);
            
            financeRecordsTableBody.innerHTML = '';
            if (Array.isArray(records)) {
                records.forEach(record => {
                    const row = financeRecordsTableBody.insertRow();
                    const recordDate = new Date(record.date).toLocaleDateString();
                    const amountClass = record.type === 'income' ? 'text-success' : 'text-danger';
                    const amountPrefix = record.type === 'income' ? '+' : '-';
                    row.innerHTML = `
                        <td>${record.id}</td>
                        <td>${recordDate}</td>
                        <td><span class="badge-modern ${record.type === 'income' ? 'btn-success-modern' : 'btn-danger-modern'}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">${record.type === 'income' ? '收入' : '支出'}</span></td>
                        <td class="${amountClass}" style="font-weight: 600;">${amountPrefix} ${parseFloat(record.amount).toFixed(2)}</td>
                        <td>${record.description || 'N/A'}</td>
                        <td>${record.creator_name || record.createdByUsername || 'N/A'}</td>
                        <td>
                            <button class="btn-info-modern btn-sm me-1 view-finance-btn" data-id="${record.id}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                                <i class="fas fa-eye me-1"></i>查看
                            </button>
                            <button class="btn-warning-modern btn-sm me-1 edit-finance-btn" data-id="${record.id}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                                <i class="fas fa-edit me-1"></i>編輯
                            </button>
                            <button class="btn-danger-modern btn-sm delete-finance-btn" data-id="${record.id}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                                <i class="fas fa-trash me-1"></i>刪除
                            </button>
                        </td>
                    `;
                });
            } else {
                console.error('記錄格式錯誤，期待陣列但得到:', typeof records, records);
                financeRecordsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">無法載入財務記錄 - 資料格式錯誤</td></tr>';
            }
            attachFinanceActionListeners();
            loadFinanceSummary(); // 每次載入記錄後更新摘要
        } catch (error) {
            console.error('載入財務記錄失敗:', error);
            showMessage('error', '載入財務記錄失敗: ' + error.message);
        }
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

    // 新增財務記錄 (支持批量)
    if (addFinanceRecordForm) {
        const recordsContainer = document.getElementById('financeRecordsContainer');
        const addMoreRecordButton = document.getElementById('addMoreFinanceRecord');
        let recordIndex = 0;

        function createRecordEntry(index) {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('finance-record-entry', 'mb-3', 'p-3');
            entryDiv.style.cssText = `
                border: 2px solid rgba(233, 30, 99, 0.1);
                border-radius: 15px;
                background: rgba(255, 255, 255, 0.8);
                box-shadow: 0 4px 15px rgba(233, 30, 99, 0.1);
                transition: all 0.3s ease;
            `;
            entryDiv.innerHTML = `
                <h5 style="color: var(--gray-800); font-weight: 600; margin-bottom: 1rem;">
                    <i class="fas fa-receipt me-2"></i>記錄 ${index + 1}
                </h5>
                <div class="mb-3">
                    <label for="addFinanceType_${index}" class="form-label-modern">類型</label>
                    <select class="form-control-modern" id="addFinanceType_${index}" name="records[${index}][type]" required>
                        <option value="income">收入</option>
                        <option value="expense">支出</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="addFinanceAmount_${index}" class="form-label-modern">金額</label>
                    <input type="number" step="0.01" class="form-control-modern" id="addFinanceAmount_${index}" name="records[${index}][amount]" required>
                </div>
                <div class="mb-3">
                    <label for="addFinanceDate_${index}" class="form-label-modern">日期</label>
                    <input type="date" class="form-control-modern" id="addFinanceDate_${index}" name="records[${index}][date]" required>
                </div>
                <div class="mb-3">
                    <label for="addFinanceDescription_${index}" class="form-label-modern">描述</label>
                    <textarea class="form-control-modern" id="addFinanceDescription_${index}" name="records[${index}][description]" rows="2"></textarea>
                </div>
                <div class="mb-3">
                    <label for="addFinanceReceipt_${index}" class="form-label-modern">收據/發票 (選填)</label>
                    <input type="file" class="form-control form-control-modern" id="addFinanceReceipt_${index}" name="receipts">
                </div>
                <div class="text-end">
                    <button type="button" class="btn btn-outline-danger btn-sm remove-record-btn" onclick="removeRecordEntry(this);" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 25px; padding: 8px 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); transition: all 0.3s ease;">
                        <i class="fas fa-times me-1"></i>移除此記錄
                    </button>
                </div>
            `;
            
            // 使用 setTimeout 確保 DOM 元素完全創建後再添加事件
            setTimeout(() => {
                // 為記錄條目添加懸停效果
                entryDiv.addEventListener('mouseenter', () => {
                    entryDiv.style.transform = 'translateY(-2px)';
                    entryDiv.style.boxShadow = '0 8px 25px rgba(233, 30, 99, 0.2)';
                    entryDiv.style.borderColor = 'rgba(233, 30, 99, 0.3)';
                });
                
                entryDiv.addEventListener('mouseleave', () => {
                    entryDiv.style.transform = 'translateY(0)';
                    entryDiv.style.boxShadow = '0 4px 15px rgba(233, 30, 99, 0.1)';
                    entryDiv.style.borderColor = 'rgba(233, 30, 99, 0.1)';
                });
                
                // 為移除按鈕添加懸停效果
                const removeBtn = entryDiv.querySelector('.remove-record-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('mouseenter', () => {
                        removeBtn.style.transform = 'translateY(-2px)';
                        removeBtn.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.4)';
                        removeBtn.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                    });
                    
                    removeBtn.addEventListener('mouseleave', () => {
                        removeBtn.style.transform = 'translateY(0)';
                        removeBtn.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
                        removeBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                    });
                }
            }, 0);
            
            return entryDiv;
        }

        // 移除記錄條目的函數
        window.removeRecordEntry = function(button) {
            const recordEntry = button.closest('.finance-record-entry');
            const remainingEntries = recordsContainer.querySelectorAll('.finance-record-entry');
            
            if (remainingEntries.length > 1) {
                recordEntry.remove();
                showMessage('info', '已移除記錄條目');
            } else {
                showMessage('warning', '至少需要保留一個記錄條目');
            }
        };
        


        if (recordsContainer && addMoreRecordButton) {
            // 初始創建一個記錄條目
            const initialEntry = createRecordEntry(recordIndex);
            recordsContainer.appendChild(initialEntry);
            recordIndex++;

            // 新增更多記錄按鈕事件
            addMoreRecordButton.addEventListener('click', () => {
                const newEntry = createRecordEntry(recordIndex);
                recordsContainer.appendChild(newEntry);
                recordIndex++;
                showMessage('info', '已新增記錄條目');
            });
            
            // 設置新增更多記錄按鈕樣式
            if (addMoreRecordButton) {
                addMoreRecordButton.style.cssText = `
                    background: linear-gradient(135deg, #06b6d4, #0891b2);
                    color: white;
                    border: none;
                    border-radius: 25px;
                    padding: 12px 25px;
                    font-weight: 600;
                    box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
                    transition: all 0.3s ease;
                `;
                
                addMoreRecordButton.addEventListener('mouseenter', () => {
                    addMoreRecordButton.style.transform = 'translateY(-2px)';
                    addMoreRecordButton.style.boxShadow = '0 8px 25px rgba(6, 182, 212, 0.4)';
                });
                
                addMoreRecordButton.addEventListener('mouseleave', () => {
                    addMoreRecordButton.style.transform = 'translateY(0)';
                    addMoreRecordButton.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.3)';
                });
            }
        }

        // 清除財務記錄表單
        const clearFinanceRecords = document.getElementById('clearFinanceRecords');
        if (clearFinanceRecords) {
            clearFinanceRecords.addEventListener('click', () => {
                if (confirm('確定要清除所有已填寫的資料嗎？')) {
                    recordsContainer.innerHTML = '';
                    recordIndex = 0;
                    const newEntry = createRecordEntry(recordIndex);
                    recordsContainer.appendChild(newEntry);
                    recordIndex++;
                    showMessage('info', '已清除所有資料');
                }
            });
            
            // 設置清除資料按鈕樣式
            clearFinanceRecords.style.cssText = `
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                border: none;
                border-radius: 25px;
                padding: 12px 25px;
                font-weight: 600;
                box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
                transition: all 0.3s ease;
            `;
            
            clearFinanceRecords.addEventListener('mouseenter', () => {
                clearFinanceRecords.style.transform = 'translateY(-2px)';
                clearFinanceRecords.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.4)';
                clearFinanceRecords.style.background = 'linear-gradient(135deg, #d97706, #b45309)';
            });
            
            clearFinanceRecords.addEventListener('mouseleave', () => {
                clearFinanceRecords.style.transform = 'translateY(0)';
                clearFinanceRecords.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.3)';
                clearFinanceRecords.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            });
        }
        
        // 設置儲存紀錄按鈕樣式
        const saveFinanceRecords = document.getElementById('saveFinanceRecords');
        if (saveFinanceRecords) {
            saveFinanceRecords.style.cssText = `
                background: linear-gradient(135deg, #e91e63, #ad1457);
                color: white;
                border: none;
                border-radius: 25px;
                padding: 12px 25px;
                font-weight: 600;
                box-shadow: 0 4px 15px rgba(233, 30, 99, 0.3);
                transition: all 0.3s ease;
            `;
            
            saveFinanceRecords.addEventListener('mouseenter', () => {
                saveFinanceRecords.style.transform = 'translateY(-2px)';
                saveFinanceRecords.style.boxShadow = '0 8px 25px rgba(233, 30, 99, 0.4)';
                saveFinanceRecords.style.background = 'linear-gradient(135deg, #ad1457, #880e4f)';
            });
            
            saveFinanceRecords.addEventListener('mouseleave', () => {
                saveFinanceRecords.style.transform = 'translateY(0)';
                saveFinanceRecords.style.boxShadow = '0 4px 15px rgba(233, 30, 99, 0.3)';
                saveFinanceRecords.style.background = 'linear-gradient(135deg, #e91e63, #ad1457)';
            });
        }

        addFinanceRecordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 收集所有記錄數據
            const records = [];
            const recordEntries = recordsContainer.querySelectorAll('.finance-record-entry');
            
            recordEntries.forEach((entry, index) => {
                const typeEl = entry.querySelector(`select[id*="Type"]`);
                const amountEl = entry.querySelector(`input[id*="Amount"]`);
                const dateEl = entry.querySelector(`input[id*="Date"]`);
                const descriptionEl = entry.querySelector(`textarea[id*="Description"]`);
                
                const type = typeEl ? typeEl.value : '';
                const amount = amountEl ? amountEl.value : '';
                const date = dateEl ? dateEl.value : '';
                const description = descriptionEl ? descriptionEl.value : '';
                
                if (type && amount && date) {
                    records.push({ type, amount, date, description });
                }
            });

            if (records.length === 0) {
                showMessage('warning', '請至少填寫一筆記錄資料');
                return;
            }

            // 檢查記錄資料的完整性
            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                if (!record.type || !record.amount || !record.date) {
                    showMessage('error', `記錄 ${i + 1} 缺少必要資料：類型、金額和日期為必填`);
                    return;
                }
                
                const amount = parseFloat(record.amount);
                if (isNaN(amount) || amount <= 0) {
                    showMessage('error', `記錄 ${i + 1} 的金額無效：必須是大於0的數字`);
                    return;
                }
                
                // 檢查日期格式
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(record.date)) {
                    showMessage('error', `記錄 ${i + 1} 的日期格式無效：請選擇正確的日期`);
                    return;
                }
            }

            // 逐筆新增記錄 (修正為支援單筆新增)
            try {
                console.log('準備新增記錄:', records);
                console.log('記錄驗證通過，開始提交...');
                let successCount = 0;
                for (const record of records) {
                    const formData = new FormData();
                    formData.append('type', record.type);
                    formData.append('amount', record.amount);
                    formData.append('date', record.date);
                    formData.append('description', record.description);

                    console.log('發送請求到 /api/finance/records', record);
                    console.log('FormData 內容:', {
                        type: record.type,
                        amount: record.amount,
                        date: record.date,
                        description: record.description
                    });
                    
                    const response = await fetch('/api/finance/records', {
                        method: 'POST',
                        body: formData,
                        headers: {
                            // 不要設置 Content-Type，讓瀏覽器自動設置
                        }
                    });
                    
                    console.log('響應狀態:', response.status);
                    console.log('響應 headers:', Object.fromEntries(response.headers.entries()));
                    
                    if (response.ok) {
                        successCount++;
                        const result = await response.json();
                        console.log('成功響應:', result);
                    } else {
                        const responseText = await response.text();
                        console.error('失敗響應狀態:', response.status);
                        console.error('失敗響應內容:', responseText);
                        
                        try {
                            const result = JSON.parse(responseText);
                            showMessage('error', `<i class="fas fa-exclamation-triangle me-2"></i>新增記錄失敗: ${result.error || result.message || '未知錯誤'}`);
                        } catch (jsonError) {
                            showMessage('error', `<i class="fas fa-exclamation-triangle me-2"></i>新增記錄失敗: 服務器錯誤 (${response.status})`);
                        }
                    }
                }

                if (successCount > 0) {
                    showMessage('success', `<i class="fas fa-check-circle me-2"></i>成功新增 ${successCount} 筆財務記錄`);
                    addFinanceRecordForm.reset();
                    if (recordsContainer) {
                        recordsContainer.innerHTML = ''; // 清空動態添加的條目
                        recordIndex = 0;
                        recordsContainer.appendChild(createRecordEntry(recordIndex)); // 重置為一個
                        recordIndex++;
                    }
                    loadFinanceRecords(sortSelect ? sortSelect.value : 'desc');
                }
            } catch (error) {
                console.error('新增財務記錄錯誤:', error);
                showMessage('error', '<i class="fas fa-exclamation-triangle me-2"></i>新增財務記錄過程中發生錯誤: ' + error.message);
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

    // 匯出 CSV
    if (exportForm) {
        exportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const startDate = document.getElementById('exportStartDate').value;
            const endDate = document.getElementById('exportEndDate').value;
            const type = document.getElementById('exportType').value;

            let queryParams = [];
            if (startDate) queryParams.push(`startDate=${startDate}`);
            if (endDate) queryParams.push(`endDate=${endDate}`);
            if (type && type !== 'all') queryParams.push(`type=${type}`);

            const queryString = queryParams.join('&');
            const exportUrl = `/api/finance/export${queryString ? '?' + queryString : ''}`;

            // 直接導向到下載連結，瀏覽器會處理下載
            window.location.href = exportUrl;
            
            // 關閉模態框
            const exportModal = bootstrap.Modal.getInstance(document.getElementById('exportModal'));
            if (exportModal) exportModal.hide();
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
});