/**
 * 認證控制器
 * 處理用戶登入、登出、註冊等認證相關功能
 */

const bcrypt = require('bcrypt');
const BaseController = require('./baseController');
const ErrorHandler = require('../utils/errorHandler');
const DatabaseHelper = require('../utils/dbHelper');

class AuthController extends BaseController {
    /**
     * 用戶登入
     */
    static login = BaseController.asyncHandler(async (req, res) => {
        const { username, password } = req.body;

        try {
            // 查詢用戶
            const user = await DatabaseHelper.get(
                'SELECT * FROM users WHERE username = ? AND is_active = 1',
                [username]
            );

            if (!user) {
                // await BaseController.logAction(req, 'LOGIN_FAILED', `登入失敗 - 用戶不存在: ${username}`);
                return BaseController.error(res, '用戶名或密碼錯誤', 401);
            }

            // 驗證密碼
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                // await BaseController.logAction(req, 'LOGIN_FAILED', `登入失敗 - 密碼錯誤: ${username}`);
                return BaseController.error(res, '用戶名或密碼錯誤', 401);
            }

                    // 註：最後登入時間欄位已移除，改用其他方式記錄

            // 建立會話
            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role,
                full_name: user.full_name
            };

            // await BaseController.logAction(req, 'LOGIN_SUCCESS', `用戶登入成功: ${username}`);

            // 清理敏感資料
            const userData = BaseController.sanitizeData(user);

            return BaseController.success(res, {
                user: userData,
                redirectUrl: AuthController.getRedirectUrl(user.role)
            }, '登入成功');

        } catch (error) {
            console.error('登入錯誤:', error);
            console.error('錯誤堆疊:', error.stack);
            // await BaseController.logAction(req, 'LOGIN_ERROR', `登入系統錯誤: ${error.message}`);
            return BaseController.error(res, '登入失敗，請稍後再試', 500);
        }
    });

    /**
     * 用戶登出
     */
    static logout = BaseController.asyncHandler(async (req, res) => {
        const username = req.session?.user?.username || 'unknown';

        req.session.destroy((err) => {
            if (err) {
                console.error('登出錯誤:', err);
                return BaseController.error(res, '登出失敗', 500);
            }

            res.clearCookie('connect.sid');
            BaseController.logAction(req, 'LOGOUT', `用戶登出: ${username}`);
            return BaseController.success(res, null, '登出成功');
        });
    });

    /**
     * 檢查登入狀態
     */
    static checkAuth = BaseController.asyncHandler(async (req, res) => {
        if (!req.session || !req.session.user) {
            return BaseController.success(res, {
                authenticated: false
            }, '未登入');
        }

        try {
            // 驗證用戶是否仍然存在且啟用
            const user = await DatabaseHelper.get(
                'SELECT id, username, role, full_name, is_active FROM users WHERE id = ? AND is_active = 1',
                [req.session.user.id]
            );

            if (!user) {
                req.session.destroy();
                return BaseController.success(res, {
                    authenticated: false
                }, '用戶不存在或已被停用');
            }

            return BaseController.success(res, {
                authenticated: true,
                user: BaseController.sanitizeData(user)
            }, '已登入');

        } catch (error) {
            console.error('檢查認證狀態錯誤:', error);
            return BaseController.error(res, '驗證失敗', 500);
        }
    });

    /**
     * 用戶註冊
     */
    static register = BaseController.asyncHandler(async (req, res) => {
        const { username, password, name, email, role = 'user' } = req.body;

        try {
            // 檢查用戶名是否已存在
            const existingUser = await DatabaseHelper.get(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );

            if (existingUser) {
                return BaseController.error(res, '用戶名已存在', 400);
            }

            // 加密密碼
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // 創建用戶
            const result = await DatabaseHelper.run(`
            INSERT INTO users (username, password_hash, full_name, role, is_active, created_at)
            VALUES (?, ?, ?, ?, 1, datetime('now'))
        `, [username, passwordHash, name || username, role]);

            await BaseController.logAction(req, 'USER_REGISTER', `新用戶註冊: ${username}`);

            return BaseController.success(res, {
                userId: result.lastID,
                username,
                name,
                role
            }, '註冊成功');

        } catch (error) {
            console.error('註冊錯誤:', error);
            await BaseController.logAction(req, 'REGISTER_ERROR', `註冊系統錯誤: ${error.message}`);
            return BaseController.error(res, '註冊失敗，請稍後再試', 500);
        }
    });

    /**
     * 修改密碼
     */
    static changePassword = BaseController.asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.user.id;

        try {
            // 獲取當前用戶資訊
            const user = await DatabaseHelper.get(
                'SELECT password_hash FROM users WHERE id = ?',
                [userId]
            );

            if (!user) {
                return BaseController.error(res, '用戶不存在', 404);
            }

            // 驗證當前密碼
            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                await BaseController.logAction(req, 'PASSWORD_CHANGE_FAILED', '修改密碼失敗 - 當前密碼錯誤');
                return BaseController.error(res, '當前密碼錯誤', 400);
            }

            // 加密新密碼
            const saltRounds = 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // 更新密碼
            await DatabaseHelper.run(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [newPasswordHash, userId]
            );

            await BaseController.logAction(req, 'PASSWORD_CHANGED', '用戶修改密碼成功');

            return BaseController.success(res, null, '密碼修改成功');

        } catch (error) {
            console.error('修改密碼錯誤:', error);
            await BaseController.logAction(req, 'PASSWORD_CHANGE_ERROR', `修改密碼系統錯誤: ${error.message}`);
            return BaseController.error(res, '修改密碼失敗，請稍後再試', 500);
        }
    });

    /**
     * 獲取當前用戶資訊
     */
    static getCurrentUser = BaseController.asyncHandler(async (req, res) => {
        const userId = req.session.user.id;

        try {
            const user = await DatabaseHelper.get(`
                SELECT id, username, full_name, role, is_active, created_at
                FROM users WHERE id = ?
            `, [userId]);

            if (!user) {
                return BaseController.error(res, '用戶不存在', 404);
            }

            return BaseController.success(res, BaseController.sanitizeData(user), '獲取用戶資訊成功');

        } catch (error) {
            console.error('獲取用戶資訊錯誤:', error);
            return BaseController.error(res, '獲取用戶資訊失敗', 500);
        }
    });

    /**
     * 獲取用戶資訊
     */
    static getProfile = BaseController.asyncHandler(async (req, res) => {
        const userId = req.session.user.id;

        try {
            const user = await DatabaseHelper.get(`
                SELECT id, username, full_name, role, is_active, created_at
                FROM users WHERE id = ?
            `, [userId]);

            if (!user) {
                return BaseController.error(res, '用戶不存在', 404);
            }

            return BaseController.success(res, BaseController.sanitizeData(user), '獲取用戶資訊成功');

        } catch (error) {
            console.error('獲取用戶資訊錯誤:', error);
            return BaseController.error(res, '獲取用戶資訊失敗', 500);
        }
    });

    /**
     * 更新用戶資訊
     */
    static updateProfile = BaseController.asyncHandler(async (req, res) => {
        const { name } = req.body;
        const userId = req.session.user.id;

        try {
            // 更新用戶資訊
            await DatabaseHelper.run(`
                UPDATE users 
                SET full_name = ?
                WHERE id = ?
            `, [name, userId]);

            // 更新會話中的用戶資訊
            req.session.user.full_name = name;

            await BaseController.logAction(req, 'PROFILE_UPDATED', '用戶更新個人資訊');

            return BaseController.success(res, {
                name
            }, '個人資訊更新成功');

        } catch (error) {
            console.error('更新用戶資訊錯誤:', error);
            await BaseController.logAction(req, 'PROFILE_UPDATE_ERROR', `更新個人資訊系統錯誤: ${error.message}`);
            return BaseController.error(res, '更新個人資訊失敗，請稍後再試', 500);
        }
    });

    /**
     * 根據角色獲取重定向 URL
     * @param {string} role - 用戶角色
     * @returns {string} 重定向 URL
     */
    static getRedirectUrl(role) {
        const redirectMap = {
            'admin': '/dashboard',
            'finance': '/finance',
            'secretary': '/secretary',
            'activity': '/activity',
            'user': '/dashboard'
        };

        return redirectMap[role] || '/dashboard';
    }

    /**
     * 驗證會話中間件
     */
    static requireLogin = (req, res, next) => {
        if (!req.session || !req.session.user) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return BaseController.error(res, '請先登入', 401);
            } else {
                return res.redirect('/login');
            }
        }
        next();
    };

    /**
     * 重設密碼（僅管理員可用）
     */
    static resetPassword = BaseController.asyncHandler(async (req, res) => {
        const { userId, newPassword } = req.body;

        try {
            // 檢查目標用戶是否存在
            const targetUser = await DatabaseHelper.get(
                'SELECT id, username FROM users WHERE id = ?',
                [userId]
            );

            if (!targetUser) {
                return BaseController.error(res, '目標用戶不存在', 404);
            }

            // 加密新密碼
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // 更新密碼
            await DatabaseHelper.run(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [hashedPassword, userId]
            );

            await BaseController.logAction(req, 'RESET_PASSWORD', `管理員重設用戶密碼: ${targetUser.username}`);

            return BaseController.success(res, null, '密碼重設成功');

        } catch (error) {
            console.error('重設密碼錯誤:', error);
            return BaseController.error(res, '重設密碼失敗', 500);
        }
    });

    /**
     * 檢查是否需要特定角色權限
     */
    static requireRole = (allowedRoles) => {
        return (req, res, next) => {
            if (!req.session || !req.session.user) {
                return BaseController.error(res, '請先登入', 401);
            }

            if (!allowedRoles.includes(req.session.user.role)) {
                return BaseController.error(res, '權限不足', 403);
            }

            next();
        };
    };
}

module.exports = AuthController;