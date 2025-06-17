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
            
            // 更新總餘額顯示
            if (typeof updateTotalBalance === 'function') {
                updateTotalBalance();
            }
        } catch (error) {
            // 載入財務摘要失敗時靜默處理
        }
    }

    // 載入財務記錄
    async function loadFinanceRecords(sortOrder = 'desc') {
        if (!financeRecordsTableBody) return;
        try {
            const response = await fetch(`/api/finance/records?sort=${sortOrder}`);
            if (!response.ok) throw new Error('無法獲取財務記錄');
            const records = await response.json();
            financeRecordsTableBody.innerHTML = '';
            records.forEach(record => {
                const row = financeRecordsTableBody.insertRow();
                const recordDate = new Date(record.date).toLocaleDateString();
                const amountClass = record.type === 'income' ? 'text-success' : 'text-danger';
                const amountPrefix = record.type === 'income' ? '+' : '-';
                row.innerHTML = `
                    <td>${record.id}</td>
                    <td>${recordDate}</td>
                    <td>${record.type === 'income' ? '收入' : '支出'}</td>
                    <td class="${amountClass}">${amountPrefix} ${parseFloat(record.amount).toFixed(2)}</td>
                    <td>${record.description || 'N/A'}</td>
                    <td>${record.createdByUsername || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-info me-1 view-finance-btn" data-id="${record.id}">查看</button>
                        <button class="btn btn-sm btn-warning me-1 edit-finance-btn" data-id="${record.id}">編輯</button>
                        <button class="btn btn-sm btn-danger delete-finance-btn" data-id="${record.id}">刪除</button>
                    </td>
                `;
            });
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
                            showMessage('success', '財務記錄已刪除');
                            loadFinanceRecords(sortSelect ? sortSelect.value : 'desc');
                        } else {
                            const result = await response.json();
                            showMessage('error', result.error || '刪除財務記錄失敗');
                        }
                    } catch (error) {
                        console.error('刪除財務記錄失敗:', error);
                        showMessage('error', '刪除財務記錄失敗: ' + error.message);
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
            entryDiv.classList.add('finance-record-entry', 'mb-3', 'p-3', 'border', 'rounded');
            entryDiv.innerHTML = `
                <h5>記錄 ${index + 1}</h5>
                <div class="mb-3">
                    <label for="addFinanceType_${index}" class="form-label">類型</label>
                    <select class="form-select" id="addFinanceType_${index}" name="records[${index}][type]" required>
                        <option value="income">收入</option>
                        <option value="expense">支出</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="addFinanceAmount_${index}" class="form-label">金額</label>
                    <input type="number" step="0.01" class="form-control" id="addFinanceAmount_${index}" name="records[${index}][amount]" required>
                </div>
                <div class="mb-3">
                    <label for="addFinanceDate_${index}" class="form-label">日期</label>
                    <input type="date" class="form-control" id="addFinanceDate_${index}" name="records[${index}][date]" required>
                </div>
                <div class="mb-3">
                    <label for="addFinanceDescription_${index}" class="form-label">描述</label>
                    <textarea class="form-control" id="addFinanceDescription_${index}" name="records[${index}][description]" rows="2"></textarea>
                </div>
                <div class="mb-3">
                    <label for="addFinanceReceipt_${index}" class="form-label">收據/發票 (選填)</label>
                    <input type="file" class="form-control" id="addFinanceReceipt_${index}" name="receipts">
                </div>
            `;
            return entryDiv;
        }

        if (recordsContainer && addMoreRecordButton) {
            // 初始創建一個記錄條目
            recordsContainer.appendChild(createRecordEntry(recordIndex));
            recordIndex++;

            // 新增更多記錄按鈕事件

            addMoreRecordButton.addEventListener('click', () => {
                recordsContainer.appendChild(createRecordEntry(recordIndex));
                recordIndex++;
            });
        }

        addFinanceRecordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addFinanceRecordForm);

            // 收集所有記錄數據
            const records = [];
            const recordEntries = recordsContainer.querySelectorAll('.finance-record-entry');
            
            recordEntries.forEach((entry, index) => {
                const type = entry.querySelector(`[name="records[${index}][type]"]`).value;
                const amount = entry.querySelector(`[name="records[${index}][amount]"]`).value;
                const date = entry.querySelector(`[name="records[${index}][date]"]`).value;
                const description = entry.querySelector(`[name="records[${index}][description]"]`).value;
                
                if (type && amount && date) {
                    records.push({ type, amount, date, description });
                }
            });

            // 如果有多筆記錄，使用批量新增
            if (records.length > 1) {
                // 清除原有的 FormData，重新構建
                const newFormData = new FormData();
                newFormData.append('records', JSON.stringify(records));
                
                // 添加文件
                const fileInputs = recordsContainer.querySelectorAll('input[type="file"]');
                fileInputs.forEach((input, index) => {
                    if (input.files[0]) {
                        newFormData.append('receipts', input.files[0]);
                    }
                });
                
                formData = newFormData;
            }

            try {
                const response = await fetch('/api/finance/records', {
                    method: 'POST',
                    body: formData,
                });
                if (response.ok) {
                    showMessage('success', '財務記錄新增成功');
                    addFinanceRecordForm.reset();
                    if (recordsContainer) {
                        recordsContainer.innerHTML = ''; // 清空動態添加的條目
                        recordIndex = 0;
                        recordsContainer.appendChild(createRecordEntry(recordIndex)); // 重置為一個
                        recordIndex++;
                    }
                    if (addFinanceRecordModal) addFinanceRecordModal.hide();
                    loadFinanceRecords(sortSelect ? sortSelect.value : 'desc');
                } else {
                    const result = await response.json();
                    showMessage('error', result.error || '新增財務記錄失敗');
                }
            } catch (error) {
                showMessage('error', '新增財務記錄過程中發生錯誤');
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

    // 初始化載入
    loadFinanceRecords(sortSelect ? sortSelect.value : 'desc');
});