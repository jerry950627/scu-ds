document.addEventListener('DOMContentLoaded', async () => {
    // server.js的requireAuth已確保用戶已認證

    const historyTableBody = document.getElementById('historyTableBody');
    const filterForm = document.getElementById('historyFilterForm');

    async function loadHistory(filters = {}) {
        if (!historyTableBody) return;

        let queryParams = [];
        if (filters.action) queryParams.push(`action=${encodeURIComponent(filters.action)}`);
        if (filters.tableName) queryParams.push(`tableName=${encodeURIComponent(filters.tableName)}`);
        if (filters.userId) queryParams.push(`userId=${encodeURIComponent(filters.userId)}`);
        if (filters.startDate) queryParams.push(`startDate=${encodeURIComponent(filters.startDate)}`);
        if (filters.endDate) queryParams.push(`endDate=${encodeURIComponent(filters.endDate)}`);
        const queryString = queryParams.join('&');

        try {
            const response = await fetch(`/api/history${queryString ? '?' + queryString : ''}`);
            if (!response.ok) throw new Error('無法獲取歷史記錄');
            const logs = await response.json();
            historyTableBody.innerHTML = '';
            logs.forEach(log => {
                const row = historyTableBody.insertRow();
                const timestamp = new Date(log.timestamp).toLocaleString();
                row.innerHTML = `
                    <td>${log.id}</td>
                    <td>${timestamp}</td>
                    <td>${log.action}</td>
                    <td>${log.tableName}</td>
                    <td>${log.recordId || 'N/A'}</td>
                    <td>${log.username || 'N/A'} (ID: ${log.userId})</td>
                    <td><pre>${log.oldValue ? JSON.stringify(JSON.parse(log.oldValue), null, 2) : 'N/A'}</pre></td>
                    <td><pre>${log.newValue ? JSON.stringify(JSON.parse(log.newValue), null, 2) : 'N/A'}</pre></td>
                `;
            });
        } catch (error) {
            console.error('載入歷史記錄失敗:', error);
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError('載入歷史記錄失敗: ' + error.message);
            } else {
                console.error('ErrorHandler 未定義，無法顯示錯誤訊息');
                alert('載入歷史記錄失敗: ' + error.message);
            }
        }
    }

    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const filters = {
                action: document.getElementById('filterAction')?.value || '',
                tableName: document.getElementById('filterTable')?.value || '',
                userId: document.getElementById('filterUser')?.value || '',
                startDate: document.getElementById('filterStartDate')?.value || '',
                endDate: document.getElementById('filterEndDate')?.value || '',
            };
            loadHistory(filters);
        });
    }

    // 初始化載入
    loadHistory();

    // 載入使用者篩選列表
    async function loadUsersForFilter() {
        const userFilterSelect = document.getElementById('filterUser');
        if (!userFilterSelect) return;
        try {
            const response = await fetch('/api/admin/users');
            if (!response.ok) throw new Error('無法獲取使用者列表');
            const users = await response.json();
            userFilterSelect.innerHTML = '<option value="">所有使用者</option>';
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.username} (ID: ${user.id})`;
                userFilterSelect.appendChild(option);
            });
        } catch (error) {
            // 靜默處理錯誤
        }
    }
    loadUsersForFilter();
});