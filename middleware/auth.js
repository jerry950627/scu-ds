/**
 * 權限中間件
 * 統一處理用戶認證和授權邏輯
 */

/**
 * 檢查用戶是否已登入
 * @param {Object} req 請求對象
 * @param {Object} res 響應對象
 * @param {Function} next 下一個中間件
 */
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

/**
 * 檢查用戶是否為管理員
 * @param {Object} req 請求對象
 * @param {Object} res 響應對象
 * @param {Function} next 下一個中間件
 */
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    if (req.session.user.role !== 'admin') {
        return res.status(403).render('error', {
            title: '權限不足 - 東吳大學資料科學系系學會管理系統',
            error: '您沒有權限訪問此頁面',
            user: req.session.user
        });
    }
    
    next();
}

/**
 * 檢查用戶是否已登入（用於重定向已登入用戶）
 * @param {Object} req 請求對象
 * @param {Object} res 響應對象
 * @param {Function} next 下一個中間件
 */
function redirectIfAuthenticated(req, res, next) {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
}

/**
 * 檢查特定角色權限
 * @param {Array} allowedRoles 允許的角色列表
 * @returns {Function} 中間件函數
 */
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        
        if (!allowedRoles.includes(req.session.user.role)) {
            return res.status(403).render('error', {
                title: '權限不足 - 東吳大學資料科學系系學會管理系統',
                error: '您沒有權限訪問此頁面',
                user: req.session.user
            });
        }
        
        next();
    };
}

module.exports = {
    requireAuth,
    requireAdmin,
    redirectIfAuthenticated,
    requireRole
};