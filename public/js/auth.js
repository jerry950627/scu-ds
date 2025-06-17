// 前端認證管理
const AuthManager = {
    // 登入函數
    login: async function(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.message || '登入失敗');
            }

            // 檢查登入是否成功
            if (data.success) {
                // 登入成功，重定向到儀表板
                window.location.href = '/dashboard';
            } else {
                throw new Error(data.message || data.error || '登入失敗');
            }
        } catch (error) {
            // 如果是網路錯誤或其他錯誤，重新拋出
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('網路連線錯誤，請檢查網路連線');
            }
            throw error;
        }
    },

    // 登出函數
    logout: async function() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });
            
            // 無論登出是否成功都重定向到首頁
            window.location.href = '/';
        } catch (error) {
            // 即使登出失敗也重定向到首頁
            window.location.href = '/';
        }
    },

    // 檢查認證狀態
    checkAuth: async function() {
        try {
            const response = await fetch('/api/auth/check');
            if (!response.ok) {
                return false;
            }
            const data = await response.json();
            return data.authenticated;
        } catch (error) {
            return false;
        }
    }
};

// 如果在登入頁面，綁定登入表單事件
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('errorMsg');
        
        // 基本驗證
        if (!username || !password) {
            const message = '請輸入帳號和密碼';
            if (errorDiv) {
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
            }
            return;
        }
        
        try {
            // 隱藏之前的錯誤訊息
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
            
            await AuthManager.login(username, password);
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            }
        }
    });
}

// 如果有登出按鈕，綁定登出事件
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.confirm('確定要登出嗎？')) {
            AuthManager.logout();
        }
    });
}