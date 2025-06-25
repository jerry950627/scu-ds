// 認證配置
const authConfig = {
    // Session 配置
    session: {
        secret: process.env.SESSION_SECRET || 'scu-ds-default-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24小時
            sameSite: 'lax'
        },
        name: 'scu-ds-session'
    },
    
    // 密碼配置
    password: {
        minLength: 6,
        maxLength: 128,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
        // 密碼雜湊配置
        saltRounds: 12
    },
    
    // JWT 配置（如果需要）
    jwt: {
        secret: process.env.JWT_SECRET || 'scu-ds-jwt-secret',
        expiresIn: '24h',
        issuer: 'scu-ds-system',
        audience: 'scu-ds-users'
    },
    
    // 移除登入限制功能
    
    // 角色權限配置
    roles: {
        admin: {
            name: '管理員',
            permissions: ['*'] // 所有權限
        },
        user: {
            name: '一般用戶',
            permissions: [
                'dashboard:read',
                'finance:read',
                'secretary:read',
                'activity:read',
                'design:read',
                'pr:read',
                'history:read'
            ]
        },
        finance: {
            name: '財務部',
            permissions: [
                'dashboard:read',
                'finance:*',
                'history:read'
            ]
        },
        secretary: {
            name: '秘書處',
            permissions: [
                'dashboard:read',
                'secretary:*',
                'history:read'
            ]
        },
        activity: {
            name: '活動部',
            permissions: [
                'dashboard:read',
                'activity:*',
                'history:read'
            ]
        },
        design: {
            name: '設計部',
            permissions: [
                'dashboard:read',
                'design:*',
                'history:read'
            ]
        },
        pr: {
            name: '公關部',
            permissions: [
                'dashboard:read',
                'pr:*',
                'history:read'
            ]
        }
    },
    
    // 預設用戶配置
    defaultUsers: [
        {
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            name: '系統管理員',
            email: 'admin@scu.edu.tw'
        },
        {
            username: 'jerry',
            password: 'jerry123',
            role: 'user',
            name: 'Jerry',
            email: 'jerry@scu.edu.tw'
        },
        {
            username: 'scuds',
            password: 'scuds123',
            role: 'user',
            name: '資科系學會',
            email: 'scuds@scu.edu.tw'
        },
        {
            username: 'scuds13173149',
            password: 'scuds13173149',
            role: 'user',
            name: '資科系學會測試',
            email: 'test@scu.edu.tw'
        }
    ]
};

module.exports = authConfig;