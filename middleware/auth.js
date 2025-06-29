/**
 * 認證中間件
 * 提供用戶認證、權限檢查等功能
 */

const DatabaseHelper = require('../utils/dbHelper');

// 檢查是否已登入
const isAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) {
        // 檢查是否為 API 請求
        const isApiRequest = req.url.startsWith('/api/') || 
                            req.get('Content-Type') === 'application/json' ||
                            req.get('Accept')?.includes('application/json');
        
        if (isApiRequest) {
            return res.status(401).json({
                success: false,
                message: '請先登入',
                code: 'UNAUTHORIZED'
            });
        } else {
            // 網頁請求重定向到登入頁面
            return res.redirect('/?error=unauthorized');
        }
    }
    next();
};

// 檢查是否為管理員
const isAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        // 檢查是否為 API 請求
        const isApiRequest = req.url.startsWith('/api/') || 
                            req.get('Content-Type') === 'application/json' ||
                            req.get('Accept')?.includes('application/json');
        
        if (isApiRequest) {
            return res.status(401).json({
                success: false,
                message: '請先登入',
                code: 'UNAUTHORIZED'
            });
        } else {
            // 網頁請求重定向到登入頁面
            return res.redirect('/?error=unauthorized');
        }
    }
    
    if (req.session.user.role !== 'admin') {
        // 檢查是否為 API 請求
        const isApiRequest = req.url.startsWith('/api/') || 
                            req.get('Content-Type') === 'application/json' ||
                            req.get('Accept')?.includes('application/json');
        
        if (isApiRequest) {
            return res.status(403).json({
                success: false,
                message: '權限不足，需要管理員權限',
                code: 'FORBIDDEN'
            });
        } else {
            // 網頁請求顯示錯誤頁面
            const path = require('path');
            const errorPagePath = path.join(__dirname, '../public/pages/error.html');
            return res.status(403).sendFile(errorPagePath);
        }
    }
    
    next();
};

// 檢查是否屬於特定部門
const isDepartmentMember = (departmentName) => {
    return async (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: '請先登入',
                code: 'UNAUTHORIZED'
            });
        }
        
        try {
            const userDepartment = await DatabaseHelper.get(
                'SELECT d.name FROM departments d JOIN user_departments ud ON d.id = ud.department_id WHERE ud.user_id = ?',
                [req.session.user.id]
            );
            
            if (!userDepartment || userDepartment.name !== departmentName) {
                return res.status(403).json({
                    success: false,
                    message: `權限不足，需要${departmentName}部門權限`,
                    code: 'FORBIDDEN'
                });
            }
            
            next();
        } catch (error) {
            console.error('檢查部門權限錯誤:', error);
            return res.status(500).json({
                success: false,
                message: '權限檢查失敗',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};

// 檢查是否為部門負責人
const isDepartmentLeader = (departmentName) => {
    return async (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: '請先登入',
                code: 'UNAUTHORIZED'
            });
        }
        
        try {
            const userDepartment = await DatabaseHelper.get(
                'SELECT d.name, ud.is_leader FROM departments d JOIN user_departments ud ON d.id = ud.department_id WHERE ud.user_id = ?',
                [req.session.user.id]
            );
            
            if (!userDepartment || userDepartment.name !== departmentName || !userDepartment.is_leader) {
                return res.status(403).json({
                    success: false,
                    message: `權限不足，需要${departmentName}部門負責人權限`,
                    code: 'FORBIDDEN'
                });
            }
            
            next();
        } catch (error) {
            console.error('檢查部門負責人權限錯誤:', error);
            return res.status(500).json({
                success: false,
                message: '權限檢查失敗',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};

// 檢查特定權限
const hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: '請先登入',
                code: 'UNAUTHORIZED'
            });
        }
        
        // 管理員擁有所有權限
        if (req.session.user.role === 'admin') {
            return next();
        }
        
        // 這裡可以根據需要實現更複雜的權限檢查邏輯
        next();
    };
};

// 記錄操作日誌
const logActivity = (action, module = 'system') => {
    return async (req, res, next) => {
        try {
            const userId = req.session?.user?.id || null;
            const username = req.session?.user?.username || 'anonymous';
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent') || '';
            
            // 檢查表是否存在，嘗試記錄到 system_logs
            try {
                await DatabaseHelper.run(
                    'INSERT INTO system_logs (user_id, action, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
                    [userId, action, `Module: ${module}`, ip, userAgent]
                );
            } catch (dbError) {
                console.log('記錄日誌失敗，嘗試 activity_logs 表:', dbError.message);
                try {
                    await DatabaseHelper.run(
                        'INSERT INTO activity_logs (user_id, username, action, module, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
                        [userId, username, action, module, ip, userAgent]
                    );
                } catch (dbError2) {
                    console.log('記錄活動日誌也失敗:', dbError2.message);
                }
            }
        } catch (error) {
            console.error('記錄活動日誌錯誤:', error);
        }
        
        next();
    };
};

// 防止重複提交
const submissionCache = new Map();

const preventDuplicateSubmission = (identifier = 'default') => {
    return (req, res, next) => {
        const userId = req.session?.user?.id || 'anonymous';
        const key = `${userId}_${identifier}_${req.method}_${req.path}`;
        const now = Date.now();
        
        // 檢查是否在3秒內重複提交
        if (submissionCache.has(key)) {
            const lastSubmission = submissionCache.get(key);
            if (now - lastSubmission < 3000) {
                return res.status(429).json({
                    success: false,
                    message: '請勿重複提交，請稍後再試',
                    code: 'TOO_MANY_REQUESTS'
                });
            }
        }
        
        submissionCache.set(key, now);
        
        // 清理過期的緩存項目
        setTimeout(() => {
            submissionCache.delete(key);
        }, 3000);
        
        next();
    };
};

// 檢查用戶是否啟用
const isUserActive = async (req, res, next) => {
    if (!req.session || !req.session.user) {
        // 檢查是否為 API 請求
        const isApiRequest = req.url.startsWith('/api/') || 
                            req.get('Content-Type') === 'application/json' ||
                            req.get('Accept')?.includes('application/json');
        
        if (isApiRequest) {
            return res.status(401).json({
                success: false,
                message: '請先登入',
                code: 'UNAUTHORIZED'
            });
        } else {
            // 網頁請求重定向到登入頁面
            return res.redirect('/?error=unauthorized');
        }
    }
    
    try {
        const user = await DatabaseHelper.get(
            'SELECT is_active FROM users WHERE id = ?',
            [req.session.user.id]
        );
        
        if (!user || !user.is_active) {
            req.session.destroy();
            
            // 檢查是否為 API 請求
            const isApiRequest = req.url.startsWith('/api/') || 
                                req.get('Content-Type') === 'application/json' ||
                                req.get('Accept')?.includes('application/json');
            
            if (isApiRequest) {
                return res.status(403).json({
                    success: false,
                    message: '帳戶已被停用',
                    code: 'ACCOUNT_DISABLED'
                });
            } else {
                // 網頁請求重定向到登入頁面並顯示錯誤訊息
                return res.redirect('/?error=account_disabled');
            }
        }
        
        next();
    } catch (error) {
        console.error('檢查用戶狀態錯誤:', error);
        
        // 檢查是否為 API 請求
        const isApiRequest = req.url.startsWith('/api/') || 
                            req.get('Content-Type') === 'application/json' ||
                            req.get('Accept')?.includes('application/json');
        
        if (isApiRequest) {
            return res.status(500).json({
                success: false,
                message: '用戶狀態檢查失敗',
                code: 'INTERNAL_ERROR'
            });
        } else {
            // 網頁請求顯示錯誤頁面
            const path = require('path');
            const errorPagePath = path.join(__dirname, '../public/pages/error.html');
            return res.status(500).sendFile(errorPagePath);
        }
    }
};

// API 速率限制
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requestCounts = new Map();
    
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // 清理過期的記錄
        for (const [key, data] of requestCounts.entries()) {
            if (data.timestamp < windowStart) {
                requestCounts.delete(key);
            }
        }
        
        // 檢查當前IP的請求次數
        const currentCount = requestCounts.get(ip);
        if (currentCount && currentCount.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: '請求過於頻繁，請稍後再試',
                code: 'RATE_LIMIT_EXCEEDED'
            });
        }
        
        // 更新請求計數
        requestCounts.set(ip, {
            count: currentCount ? currentCount.count + 1 : 1,
            timestamp: now
        });
        
        next();
    };
};

// 需要認證的中間件組合
const requireAuth = [isAuthenticated, isUserActive];

// 需要管理員權限的中間件組合
const requireAdmin = [isAuthenticated, isUserActive, isAdmin];

// 需要特定角色的中間件
const requireRole = (roles) => {
    return (req, res, next) => {
        console.log('=== requireRole 中間件檢查 ===');
        console.log('要求的角色:', roles);
        console.log('Session 存在:', !!req.session);
        console.log('User 存在:', !!req.session?.user);
        console.log('用戶角色:', req.session?.user?.role);
        
        if (!req.session || !req.session.user) {
            console.log('❌ 未登入，拒絕存取');
            return res.status(401).json({
                success: false,
                message: '請先登入',
                code: 'UNAUTHORIZED'
            });
        }
        
        const userRole = req.session.user.role;
        if (!roles.includes(userRole)) {
            console.log('❌ 權限不足，拒絕存取');
            return res.status(403).json({
                success: false,
                message: `權限不足，需要以下角色之一: ${roles.join(', ')}，您的角色: ${userRole}`,
                code: 'FORBIDDEN'
            });
        }
        
        console.log('✅ 權限檢查通過');
        next();
    };
};

// 重定向已認證用戶
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isDepartmentMember,
    isDepartmentLeader,
    hasPermission,
    logActivity,
    preventDuplicateSubmission,
    isUserActive,
    rateLimit,
    requireAuth,
    requireAdmin,
    requireRole,
    redirectIfAuthenticated
};