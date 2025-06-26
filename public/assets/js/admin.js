document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 檢查管理員權限
        const response = await ApiService.get('/api/auth/check');
        const data = await response.json();
        
        if (!data.user.isAdmin) {
            window.location.href = '/dashboard';
            return;
        }
    } catch (error) {
        console.error('獲取用戶資訊失敗:', error);
        if (typeof ErrorHandler !== 'undefined') {
            ErrorHandler.showError('獲取用戶資訊失敗: ' + error.message);
        }
        window.location.href = '/dashboard';
        return;
    }

    const userTableBody = document.getElementById('userTableBody');
    const addUserForm = document.getElementById('addUserForm');
    const editUserForm = document.getElementById('editUserForm');
    const departmentSelect = document.getElementById('departmentId');
    const editDepartmentSelect = document.getElementById('editDepartmentId');
    const addUserModalEl = document.getElementById('addUserModal');
    const editUserModalEl = document.getElementById('editUserModal');
    const addUserModal = addUserModalEl ? new bootstrap.Modal(addUserModalEl) : null;
    const editUserModal = editUserModalEl ? new bootstrap.Modal(editUserModalEl) : null;

    const yearList = document.getElementById('yearList');
    const addYearForm = document.getElementById('addYearForm');

    // 載入部門到下拉選單
    async function loadDepartments() {
        try {
            if (typeof LoadingIndicator !== 'undefined') {
                LoadingIndicator.show('載入部門列表中...');
            }
            const response = await ApiService.get('/api/admin/departments');
            const departments = await response.json();
            
            if (departmentSelect) {
                departmentSelect.innerHTML = '<option value="">請選擇部門</option>';
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.name;
                    departmentSelect.appendChild(option);
                });
            }
            if (editDepartmentSelect) {
                editDepartmentSelect.innerHTML = '<option value="">請選擇部門</option>';
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.name;
                    editDepartmentSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('載入部門列表失敗:', error);
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError('載入部門列表失敗: ' + error.message);
            } else {
                alert('載入部門列表失敗: ' + error.message);
            }
        } finally {
            if (typeof LoadingIndicator !== 'undefined') {
                LoadingIndicator.hide();
            }
        }
    }

    // 載入使用者列表
    async function loadUsers() {
        if (!userTableBody) return;
        try {
            if (typeof LoadingIndicator !== 'undefined') {
                LoadingIndicator.show('載入使用者列表中...');
            }
            const response = await ApiService.get('/api/admin/users');
            const users = await response.json();
            userTableBody.innerHTML = '';
            users.forEach(user => {
                const row = userTableBody.insertRow();
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.department_name || 'N/A'}</td>
                    <td>${user.role}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-2 edit-user-btn" data-id="${user.id}">編輯</button>
                        <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user.id}">刪除</button>
                    </td>
                `;
            });
            attachUserActionListeners();
        } catch (error) {
            console.error('載入使用者列表失敗:', error);
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError('載入使用者列表失敗: ' + error.message);
            } else {
                alert('載入使用者列表失敗: ' + error.message);
            }
        } finally {
            if (typeof LoadingIndicator !== 'undefined') {
                LoadingIndicator.hide();
            }
        }
    }

    // 綁定使用者操作按鈕事件 (編輯/刪除)
    function attachUserActionListeners() {
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.dataset.id;
                try {
                    const response = await ApiService.get(`/api/admin/users/${userId}/department-role`);
                    const userData = await response.json();
                    
                    document.getElementById('editUserId').value = userId;
                    document.getElementById('editUsername').value = userData.username;
                    editDepartmentSelect.value = userData.department_id || '';
                    document.getElementById('editRole').value = userData.role;
                    if(editUserModal) editUserModal.show();
                } catch (error) {
                    ErrorHandler.showError('獲取使用者資訊失敗: ' + error.message);
                }
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.dataset.id;
                if (window.confirm('確定要刪除此使用者嗎？')) {
                    try {
                        await ApiService.delete(`/api/admin/users/${userId}`);
                        ErrorHandler.showSuccess('使用者已刪除');
                        loadUsers();
                    } catch (error) {
                        ErrorHandler.showError('刪除使用者失敗: ' + error.message);
                    }
                }
            });
        });
    }

    // 新增使用者
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('newUsername').value;
            const password = document.getElementById('newPassword').value;
            const department_id = departmentSelect.value;
            const role = document.getElementById('role').value;

            try {
                await ApiService.post('/auth/register', { username, password, department_id, role });
                ErrorHandler.showSuccess('使用者新增成功');
                addUserForm.reset();
                if(addUserModal) addUserModal.hide();
                loadUsers();
            } catch (error) {
                ErrorHandler.showError('新增使用者失敗: ' + error.message);
            }
        });
    }

    // 編輯使用者
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('editUserId').value;
            const department_id = editDepartmentSelect.value;
            const role = document.getElementById('editRole').value;

            try {
                await ApiService.put(`/api/admin/users/${userId}/department-role`, { department_id, role });
                ErrorHandler.showSuccess('使用者資訊更新成功');
                if(editUserModal) editUserModal.hide();
                loadUsers();
            } catch (error) {
                ErrorHandler.showError('更新使用者資訊失敗: ' + error.message);
            }
        });
    }

    // 載入年份列表
    async function loadYears() {
        if (!yearList) return;
        try {
            const response = await ApiService.get('/api/admin/years');
            const years = await response.json();
            yearList.innerHTML = '';
            years.forEach(year => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.textContent = year.year_name;
                yearList.appendChild(li);
            });
        } catch (error) {
            ErrorHandler.showError('載入年份列表失敗: ' + error.message);
        }
    }

    // 新增年份
    if (addYearForm) {
        addYearForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const yearName = document.getElementById('yearName').value;
            try {
                await ApiService.post('/api/admin/years', { year_name: yearName });
                ErrorHandler.showSuccess('年份新增成功');
                addYearForm.reset();
                loadYears();
            } catch (error) {
                ErrorHandler.showError('新增年份失敗: ' + error.message);
            }
        });
    }

    // 初始化載入
    await Promise.all([
        loadDepartments(),
        loadUsers(),
        loadYears()
    ]);
});