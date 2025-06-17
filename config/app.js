/**
 * 應用配置文件
 * 統一管理應用的基本配置信息
 */

module.exports = {
    app: {
        name: '東吳大學資料科學系系學會管理系統',
        version: '1.0.0',
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    
    session: {
        secret: process.env.SESSION_SECRET || 'scu-ds-secret-key-2024',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            secure: process.env.COOKIE_SECURE === 'true',
            httpOnly: true,
            maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000,
            sameSite: process.env.COOKIE_SAME_SITE || 'lax'
        },
        name: 'scu.ds.sid'
    },
    
    upload: {
        directories: [
            'public/uploads',
            'public/uploads/finance',
            'public/uploads/secretary',
            'public/uploads/design',
            'public/uploads/activity',
            'public/uploads/pr',
            'public/uploads/users'
        ]
    },
    
    views: {
        engine: 'html',
        directory: 'views'
    }
};