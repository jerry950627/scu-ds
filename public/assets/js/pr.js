// 公關部廠商管理功能
$(document).ready(function() {
    // server.js的requireAuth已確保用戶已認證
    // 隱藏載入指示器
    $('#loading').fadeOut(500);
    
    // 初始化廠商表格
    initVendorTable();
    
    // 初始化統計圖表
    updateVendorChart();
    
    // 綁定表單提交事件
    $('#vendorForm').submit(function(e) {
        e.preventDefault();
        addVendor();
    });
    
    // 綁定篩選按鈕事件
    $('#filterCooperatedBtn').click(function() {
        filterVendors('cooperated');
    });
    
    $('#filterNotCooperatedBtn').click(function() {
        filterVendors('not-cooperated');
    });
    
    $('#showAllBtn').click(function() {
        filterVendors('all');
    });
    
    // 綁定匯出按鈕事件
    $('#exportBtn').click(function() {
        exportPRData();
    });
    
    // 綁定編輯和刪除按鈕事件（使用事件委託）
    $('#vendorTable').on('click', '.edit-vendor', function() {
        const vendorId = $(this).data('id');
        editVendor(vendorId);
    });
    
    $('#vendorTable').on('click', '.delete-vendor', function() {
        const vendorId = $(this).data('id');
        if (window.confirm('確定要刪除此廠商資料嗎？')) {
            deleteVendor(vendorId);
        }
    });
    
    // 禁用SQLite提示訊息
    localStorage.setItem('sqlite_notification_shown', 'true');
});

// 初始化廠商表格
function initVendorTable() {
    // 檢查表格是否已初始化，如果是則先銷毀
    if ($.fn.DataTable.isDataTable('#vendorTable')) {
        $('#vendorTable').DataTable().destroy();
        $('#vendorTable').empty(); // 清空表頭與內容
    }
    
    $('#vendorTable').DataTable({
        ajax: {
            url: '/api/pr/vendors',
            dataSrc: '',
            error: function(xhr, status, error) {
                console.error('載入廠商資料失敗:', error);
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showError('載入廠商資料失敗: ' + error);
                } else {
                    alert('載入廠商資料失敗: ' + error);
                }
            }
        },
        columns: [
            { data: 'name', title: '廠商名稱' },
            { data: 'email', title: '電子郵件' },
            { data: 'category', title: '商品類別' },
            { 
                data: 'status', 
                title: '合作狀態',
                render: function(data) {
                    return data === 'active' ? '<span class="badge bg-success">已合作</span>' : '<span class="badge bg-secondary">未合作</span>';
                }
            },
            {
                data: 'id',
                title: '操作',
                render: function(data) {
                    return `
                        <button class="btn btn-sm btn-primary edit-vendor" data-id="${data}"><i class="bi bi-pencil"></i> 編輯</button>
                        <button class="btn btn-sm btn-danger delete-vendor" data-id="${data}"><i class="bi bi-trash"></i> 刪除</button>
                    `;
                }
            }
        ],
        language: {
            processing: "處理中...",
            lengthMenu: "顯示 _MENU_ 筆資料",
            zeroRecords: "沒有符合的資料",
            info: "顯示第 _START_ 至 _END_ 筆資料，共 _TOTAL_ 筆",
            infoEmpty: "顯示第 0 至 0 筆資料，共 0 筆",
            infoFiltered: "(從 _MAX_ 筆資料中過濾)",
            search: "搜尋:",
            paginate: {
                first: "首頁",
                previous: "上一頁",
                next: "下一頁",
                last: "末頁"
            },
            aria: {
                sortAscending: ": 升冪排列",
                sortDescending: ": 降冪排列"
            },
            emptyTable: "表格中無資料",
            loadingRecords: "載入中..."
        }
    });
}

// 新增廠商
function addVendor() {
    const vendorId = $('#vendorIndex').val();
    const isEdit = vendorId !== '';
    
    const vendorData = {
        name: $('#vendorName').val(),
        email: $('#vendorEmail').val(),
        category: $('#vendorProduct').val(),
        description: '', // 對應後端的notes欄位
        cooperated: $('#vendorStatus').val() === '合作過' ? 'active' : 'inactive' // 對應後端的status欄位
    };
    
    submitVendorData(vendorData, isEdit, vendorId);
}

// 提交廠商數據
function submitVendorData(vendorData, isEdit, vendorId) {
    $.ajax({
        url: isEdit ? `/api/pr/vendors/${vendorId}` : '/api/pr/vendors',
        method: isEdit ? 'PUT' : 'POST',
        data: vendorData,
        success: function(response) {
            $('#vendorTable').DataTable().ajax.reload();
            $('#vendorForm')[0].reset();
            $('#vendorIndex').val('');
            updateVendorChart(); // 更新統計圖表
            
            // 恢復按鈕文字
            $('.upload-section button[type="submit"]').html('<i class="bi bi-save"></i> 儲存廠商資料');
            
            // 顯示成功訊息
            const alertDiv = $('<div class="alert alert-success alert-dismissible fade show" role="alert">');
            alertDiv.html(`
                <i class="bi bi-check-circle-fill"></i> 廠商資料已成功${isEdit ? '更新' : '儲存'}！
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `);
            $('#vendorForm').before(alertDiv);
            
            // 3秒後自動關閉提示
            setTimeout(function() {
                alertDiv.alert('close');
            }, 3000);
        },
        error: function(xhr, status, error) {
            console.error('新增廠商失敗:', error);
            const alertDiv = $('<div class="alert alert-danger alert-dismissible fade show" role="alert">');
            alertDiv.html(`
                <i class="bi bi-exclamation-triangle-fill"></i> 儲存失敗，請稍後再試。
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `);
            $('#vendorForm').before(alertDiv);
            
            setTimeout(function() {
                alertDiv.alert('close');
            }, 3000);
        }
    });
}

// 篩選廠商
function filterVendors(status) {
    const table = $('#vendorTable').DataTable();
    if (status === 'all') {
        table.search('').draw();
    } else {
        const isCooperated = status === 'cooperated';
        table.column(3).search(isCooperated ? '已合作' : '未合作').draw();
    }
}

// 更新廠商統計圖表
function updateVendorChart() {
    $.ajax({
        url: '/api/pr/vendors',
        method: 'GET',
        success: function(data) {
            // 計算合作和未合作廠商數量
            const cooperated = data.filter(vendor => vendor.status === 'active').length;
            const notCooperated = data.length - cooperated;
            
            // 如果圖表已存在，先銷毀
            if (window.vendorChart instanceof Chart) {
                window.vendorChart.destroy();
            }
            
            // 創建新圖表
            const ctx = document.getElementById('vendorChart').getContext('2d');
            window.vendorChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['已合作', '未合作'],
                    datasets: [{
                        data: [cooperated, notCooperated],
                        backgroundColor: ['#28a745', '#6c757d'],
                        borderColor: ['#1e7e34', '#5a6268'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 14
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        },
        error: function(error) {
            // 靜默處理錯誤
        }
    });
}

// 編輯廠商
function editVendor(vendorId) {
    // 獲取廠商數據
    $.ajax({
        url: `/api/pr/vendors/${vendorId}`,
        method: 'GET',
        success: function(vendor) {
            // 填充表單
            $('#vendorIndex').val(vendor.id);
            $('#vendorName').val(vendor.name);
            $('#vendorEmail').val(vendor.email);
            $('#vendorProduct').val(vendor.category);
            $('#vendorStatus').val(vendor.status === 'active' ? '合作過' : '未合作');
            
            // 滾動到表單
            $('html, body').animate({
                scrollTop: $('.upload-section').offset().top - 100
            }, 500);
            
            // 更改按鈕文字
            $('.upload-section button[type="submit"]').html('<i class="bi bi-save"></i> 更新廠商資料');
        },
        error: function(xhr, status, error) {
            console.error('載入廠商資料失敗:', error);
            const alertDiv = $('<div class="alert alert-danger alert-dismissible fade show" role="alert">');
            alertDiv.html(`
                <i class="bi bi-exclamation-triangle-fill"></i> 獲取廠商資料失敗，請稍後再試。
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `);
            $('.upload-section').prepend(alertDiv);
            
            setTimeout(function() {
                alertDiv.alert('close');
            }, 3000);
        }
    });
}

// 刪除廠商
function deleteVendor(vendorId) {
    $.ajax({
        url: `/api/pr/vendors/${vendorId}`,
        method: 'DELETE',
        success: function() {
            // 重新加載表格和圖表
            $('#vendorTable').DataTable().ajax.reload();
            updateVendorChart();
            
            // 顯示成功訊息
            const alertDiv = $('<div class="alert alert-success alert-dismissible fade show" role="alert">');
            alertDiv.html(`
                <i class="bi bi-check-circle-fill"></i> 廠商資料已成功刪除！
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `);
            $('.vendor-list-section').prepend(alertDiv);
            
            // 3秒後自動關閉提示
            setTimeout(function() {
                alertDiv.alert('close');
            }, 3000);
        },
        error: function(xhr, status, error) {
            console.error('刪除廠商失敗:', error);
            const alertDiv = $('<div class="alert alert-danger alert-dismissible fade show" role="alert">');
            alertDiv.html(`
                <i class="bi bi-exclamation-triangle-fill"></i> 刪除失敗，請稍後再試。
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `);
            $('.vendor-list-section').prepend(alertDiv);
            
            setTimeout(function() {
                alertDiv.alert('close');
            }, 3000);
        }
    });
}

// 匯出公關部數據
function exportPRData() {
    // 獲取廠商數據
    $.ajax({
        url: '/api/pr/vendors',
        method: 'GET',
        success: function(data) {
            // 創建CSV內容，添加BOM解決中文亂碼
            let csvContent = '\uFEFF廠商名稱,電子郵件,商品類別,合作狀態\n';
            data.forEach(vendor => {
                const status = vendor.status === 'active' ? '已合作' : '未合作';
                csvContent += `"${vendor.name || ''}","${vendor.email || ''}","${vendor.category || ''}","${status}"\n`;
            });
            
            // 創建並下載文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `公關部廠商資料_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 顯示成功訊息
            const alertDiv = $('<div class="alert alert-success alert-dismissible fade show" role="alert">');
            alertDiv.html(`
                <i class="bi bi-check-circle-fill"></i> 數據匯出成功！
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `);
            $('.vendor-list-section').prepend(alertDiv);
            
            // 3秒後自動關閉提示
            setTimeout(function() {
                alertDiv.alert('close');
            }, 3000);
        },
        error: function() {
            const alertDiv = $('<div class="alert alert-danger alert-dismissible fade show" role="alert">');
            alertDiv.html(`
                <i class="bi bi-exclamation-triangle-fill"></i> 匯出失敗，請稍後再試。
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `);
            $('.vendor-list-section').prepend(alertDiv);
            
            setTimeout(function() {
                alertDiv.alert('close');
            }, 3000);
        }
    });
}