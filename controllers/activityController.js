/**
 * 活動控制器
 * 處理活動計劃、活動詳情等相關功能
 */

const BaseController = require('./baseController');
const ErrorHandler = require('../utils/errorHandler');
const DatabaseHelper = require('../utils/dbHelper');
const fs = require('fs').promises;
const path = require('path');

class ActivityController extends BaseController {
    /**
     * 獲取活動列表
     */
    static getActivities = BaseController.asyncHandler(async (req, res) => {
        const { page, limit, offset } = BaseController.getPaginationParams(req);
        const { field, order } = BaseController.getSortParams(req, ['id', 'title', 'event_date', 'created_at'], 'created_at');
        const { search, conditions } = BaseController.getSearchParams(req, ['title', 'description', 'location']);

        try {
            let whereClause = '';
            let params = [];

            if (conditions.length > 0) {
                whereClause = `WHERE (${conditions.join(' OR ')})`;
                params = new Array(conditions.length).fill(search);
            }

            // 獲取總數
            const countQuery = `SELECT COUNT(*) as total FROM event_plans ${whereClause}`;
            const { total } = await DatabaseHelper.get(countQuery, params);

            // 獲取活動列表
            const query = `
                SELECT ep.*, u.name as creator_name
                FROM event_plans ep
                LEFT JOIN users u ON ep.created_by = u.id
                ${whereClause}
                ORDER BY ${field} ${order}
                LIMIT ? OFFSET ?
            `;
            
            const activities = await DatabaseHelper.all(query, [...params, limit, offset]);

            return BaseController.paginated(res, activities, { page, limit, total });

        } catch (error) {
            console.error('獲取活動列表錯誤:', error);
            return BaseController.error(res, '獲取活動列表失敗', 500);
        }
    });

    /**
     * 獲取單個活動詳情
     */
    static getActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        
        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            const activity = await DatabaseHelper.get(`
                SELECT ep.*, u.name as creator_name
                FROM event_plans ep
                LEFT JOIN users u ON ep.created_by = u.id
                WHERE ep.id = ?
            `, [activityId]);

            if (!activity) {
                return BaseController.error(res, '活動不存在', 404);
            }

            // 獲取活動詳情
            const details = await DatabaseHelper.all(`
                SELECT ad.*, u.name as creator_name
                FROM activity_details ad
                LEFT JOIN users u ON ad.created_by = u.id
                WHERE ad.event_plan_id = ?
                ORDER BY ad.created_at DESC
            `, [activityId]);

            activity.details = details;

            return BaseController.success(res, activity, '獲取活動詳情成功');

        } catch (error) {
            console.error('獲取活動詳情錯誤:', error);
            return BaseController.error(res, '獲取活動詳情失敗', 500);
        }
    });

    /**
     * 創建新活動
     */
    static createActivity = BaseController.asyncHandler(async (req, res) => {
        const { title, description, event_date, location, budget, status = 'planning' } = req.body;
        const userId = req.session.user.id;

        try {
            const result = await DatabaseHelper.run(`
                INSERT INTO event_plans (title, description, event_date, location, budget, status, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [title, description, event_date, location, budget, status, userId]);

            await BaseController.logAction(req, 'ACTIVITY_CREATED', `創建活動: ${title}`, { activityId: result.lastID });

            return BaseController.success(res, {
                id: result.lastID,
                title,
                description,
                event_date,
                location,
                budget,
                status
            }, '活動創建成功', 201);

        } catch (error) {
            console.error('創建活動錯誤:', error);
            await BaseController.logAction(req, 'ACTIVITY_CREATE_ERROR', `創建活動失敗: ${error.message}`);
            return BaseController.error(res, '創建活動失敗', 500);
        }
    });

    /**
     * 更新活動
     */
    static updateActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const { title, description, event_date, location, budget, status } = req.body;
        const userId = req.session.user.id;

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            // 檢查活動是否存在
            const activity = await DatabaseHelper.get('SELECT * FROM event_plans WHERE id = ?', [activityId]);
            if (!activity) {
                return BaseController.error(res, '活動不存在', 404);
            }

            // 檢查權限（只有創建者或管理員可以修改）
            if (activity.created_by !== userId && req.session.user.role !== 'admin') {
                return BaseController.error(res, '權限不足', 403);
            }

            await DatabaseHelper.run(`
                UPDATE event_plans 
                SET title = ?, description = ?, event_date = ?, location = ?, budget = ?, status = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [title, description, event_date, location, budget, status, activityId]);

            await BaseController.logAction(req, 'ACTIVITY_UPDATED', `更新活動: ${title}`, { activityId });

            return BaseController.success(res, {
                id: activityId,
                title,
                description,
                event_date,
                location,
                budget,
                status
            }, '活動更新成功');

        } catch (error) {
            console.error('更新活動錯誤:', error);
            await BaseController.logAction(req, 'ACTIVITY_UPDATE_ERROR', `更新活動失敗: ${error.message}`);
            return BaseController.error(res, '更新活動失敗', 500);
        }
    });

    /**
     * 刪除活動
     */
    static deleteActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const userId = req.session.user.id;

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            // 檢查活動是否存在
            const activity = await DatabaseHelper.get('SELECT * FROM event_plans WHERE id = ?', [activityId]);
            if (!activity) {
                return BaseController.error(res, '活動不存在', 404);
            }

            // 檢查權限（只有創建者或管理員可以刪除）
            if (activity.created_by !== userId && req.session.user.role !== 'admin') {
                return BaseController.error(res, '權限不足', 403);
            }

            // 刪除相關的活動詳情
            await DatabaseHelper.run('DELETE FROM activity_details WHERE event_plan_id = ?', [activityId]);
            
            // 刪除活動
            await DatabaseHelper.run('DELETE FROM event_plans WHERE id = ?', [activityId]);

            await BaseController.logAction(req, 'ACTIVITY_DELETED', `刪除活動: ${activity.title}`, { activityId });

            return BaseController.success(res, null, '活動刪除成功');

        } catch (error) {
            console.error('刪除活動錯誤:', error);
            await BaseController.logAction(req, 'ACTIVITY_DELETE_ERROR', `刪除活動失敗: ${error.message}`);
            return BaseController.error(res, '刪除活動失敗', 500);
        }
    });

    /**
     * 添加活動詳情
     */
    static addActivityDetail = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const { title, content, detail_type = 'general' } = req.body;
        const userId = req.session.user.id;

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            // 檢查活動是否存在
            const activity = await DatabaseHelper.get('SELECT id FROM event_plans WHERE id = ?', [activityId]);
            if (!activity) {
                return BaseController.error(res, '活動不存在', 404);
            }

            const result = await DatabaseHelper.run(`
                INSERT INTO activity_details (event_plan_id, title, content, detail_type, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [activityId, title, content, detail_type, userId]);

            await BaseController.logAction(req, 'ACTIVITY_DETAIL_ADDED', `添加活動詳情: ${title}`, { 
                activityId, 
                detailId: result.lastID 
            });

            return BaseController.success(res, {
                id: result.lastID,
                event_plan_id: activityId,
                title,
                content,
                detail_type
            }, '活動詳情添加成功', 201);

        } catch (error) {
            console.error('添加活動詳情錯誤:', error);
            await BaseController.logAction(req, 'ACTIVITY_DETAIL_ADD_ERROR', `添加活動詳情失敗: ${error.message}`);
            return BaseController.error(res, '添加活動詳情失敗', 500);
        }
    });

    /**
     * 更新活動詳情
     */
    static updateActivityDetail = BaseController.asyncHandler(async (req, res) => {
        const detailId = BaseController.validateId(req.params.detailId);
        const { title, content, detail_type } = req.body;
        const userId = req.session.user.id;

        if (!detailId) {
            return BaseController.error(res, '無效的詳情 ID', 400);
        }

        try {
            // 檢查詳情是否存在
            const detail = await DatabaseHelper.get('SELECT * FROM activity_details WHERE id = ?', [detailId]);
            if (!detail) {
                return BaseController.error(res, '活動詳情不存在', 404);
            }

            // 檢查權限（只有創建者或管理員可以修改）
            if (detail.created_by !== userId && req.session.user.role !== 'admin') {
                return BaseController.error(res, '權限不足', 403);
            }

            await DatabaseHelper.run(`
                UPDATE activity_details 
                SET title = ?, content = ?, detail_type = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [title, content, detail_type, detailId]);

            await BaseController.logAction(req, 'ACTIVITY_DETAIL_UPDATED', `更新活動詳情: ${title}`, { detailId });

            return BaseController.success(res, {
                id: detailId,
                title,
                content,
                detail_type
            }, '活動詳情更新成功');

        } catch (error) {
            console.error('更新活動詳情錯誤:', error);
            await BaseController.logAction(req, 'ACTIVITY_DETAIL_UPDATE_ERROR', `更新活動詳情失敗: ${error.message}`);
            return BaseController.error(res, '更新活動詳情失敗', 500);
        }
    });

    /**
     * 刪除活動詳情
     */
    static deleteActivityDetail = BaseController.asyncHandler(async (req, res) => {
        const detailId = BaseController.validateId(req.params.detailId);
        const userId = req.session.user.id;

        if (!detailId) {
            return BaseController.error(res, '無效的詳情 ID', 400);
        }

        try {
            // 檢查詳情是否存在
            const detail = await DatabaseHelper.get('SELECT * FROM activity_details WHERE id = ?', [detailId]);
            if (!detail) {
                return BaseController.error(res, '活動詳情不存在', 404);
            }

            // 檢查權限（只有創建者或管理員可以刪除）
            if (detail.created_by !== userId && req.session.user.role !== 'admin') {
                return BaseController.error(res, '權限不足', 403);
            }

            await DatabaseHelper.run('DELETE FROM activity_details WHERE id = ?', [detailId]);

            await BaseController.logAction(req, 'ACTIVITY_DETAIL_DELETED', `刪除活動詳情: ${detail.title}`, { detailId });

            return BaseController.success(res, null, '活動詳情刪除成功');

        } catch (error) {
            console.error('刪除活動詳情錯誤:', error);
            await BaseController.logAction(req, 'ACTIVITY_DETAIL_DELETE_ERROR', `刪除活動詳情失敗: ${error.message}`);
            return BaseController.error(res, '刪除活動詳情失敗', 500);
        }
    });

    /**
     * 上傳活動相關檔案
     */
    static uploadFile = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const userId = req.session.user.id;

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        if (!req.file) {
            return BaseController.error(res, '請選擇要上傳的檔案', 400);
        }

        try {
            // 檢查活動是否存在
            const activity = await DatabaseHelper.get('SELECT id FROM event_plans WHERE id = ?', [activityId]);
            if (!activity) {
                return BaseController.error(res, '活動不存在', 404);
            }

            const file = req.file;
            const fileName = `${Date.now()}_${file.originalname}`;
            const filePath = path.join(process.env.UPLOAD_PATH || 'public/uploads', 'activities', fileName);

            // 確保目錄存在
            await fs.mkdir(path.dirname(filePath), { recursive: true });

            // 移動檔案
            await fs.rename(file.path, filePath);

            // 記錄檔案資訊到資料庫（可以擴展 activity_details 表或創建新的檔案表）
            const result = await DatabaseHelper.run(`
                INSERT INTO activity_details (event_plan_id, title, content, detail_type, file_path, created_by, created_at)
                VALUES (?, ?, ?, 'file', ?, ?, datetime('now'))
            `, [activityId, file.originalname, `檔案上傳: ${file.originalname}`, filePath, userId]);

            await BaseController.logAction(req, 'ACTIVITY_FILE_UPLOADED', `上傳活動檔案: ${file.originalname}`, {
                activityId,
                fileName,
                fileSize: file.size
            });

            return BaseController.success(res, {
                id: result.lastID,
                fileName: file.originalname,
                filePath: `/uploads/activities/${fileName}`,
                fileSize: file.size
            }, '檔案上傳成功', 201);

        } catch (error) {
            console.error('上傳檔案錯誤:', error);
            await BaseController.logAction(req, 'ACTIVITY_FILE_UPLOAD_ERROR', `上傳活動檔案失敗: ${error.message}`);
            return BaseController.error(res, '檔案上傳失敗', 500);
        }
    });

    /**
     * 獲取活動統計資訊
     */
    static getStatistics = BaseController.asyncHandler(async (req, res) => {
        try {
            const stats = await DatabaseHelper.get(`
                SELECT 
                    COUNT(*) as total_activities,
                    COUNT(CASE WHEN status = 'planning' THEN 1 END) as planning_count,
                    COUNT(CASE WHEN status = 'ongoing' THEN 1 END) as ongoing_count,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
                    SUM(budget) as total_budget,
                    AVG(budget) as average_budget
                FROM event_plans
            `);

            const recentActivities = await DatabaseHelper.all(`
                SELECT ep.id, ep.title, ep.event_date, ep.status, u.name as creator_name
                FROM event_plans ep
                LEFT JOIN users u ON ep.created_by = u.id
                ORDER BY ep.created_at DESC
                LIMIT 5
            `);

            return BaseController.success(res, {
                statistics: stats,
                recentActivities
            }, '獲取活動統計成功');

        } catch (error) {
            console.error('獲取活動統計錯誤:', error);
            return BaseController.error(res, '獲取活動統計失敗', 500);
        }
    });

    /**
     * 活動報名
     */
    static registerActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const userId = req.session.user.id;

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            // 檢查活動是否存在
            const activity = await DatabaseHelper.get('SELECT * FROM event_plans WHERE id = ?', [activityId]);
            if (!activity) {
                return BaseController.error(res, '活動不存在', 404);
            }

            // 檢查是否已經報名
            const existingRegistration = await DatabaseHelper.get(
                'SELECT id FROM activity_registrations WHERE event_plan_id = ? AND user_id = ?',
                [activityId, userId]
            );

            if (existingRegistration) {
                return BaseController.error(res, '您已經報名此活動', 400);
            }

            // 創建報名記錄
            const result = await DatabaseHelper.run(`
                INSERT INTO activity_registrations (event_plan_id, user_id, status, registered_at)
                VALUES (?, ?, 'pending', datetime('now'))
            `, [activityId, userId]);

            await BaseController.logAction(req, 'ACTIVITY_REGISTERED', `報名活動: ${activity.title}`, {
                activityId,
                registrationId: result.lastID
            });

            return BaseController.success(res, {
                registrationId: result.lastID,
                status: 'pending'
            }, '活動報名成功', 201);

        } catch (error) {
            console.error('活動報名錯誤:', error);
            await BaseController.logAction(req, 'ACTIVITY_REGISTER_ERROR', `活動報名失敗: ${error.message}`);
            return BaseController.error(res, '活動報名失敗', 500);
        }
    });

    /**
     * 取消活動報名
     */
    static unregisterActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const userId = req.session.user.id;

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            // 檢查報名記錄是否存在
            const registration = await DatabaseHelper.get(
                'SELECT * FROM activity_registrations WHERE event_plan_id = ? AND user_id = ?',
                [activityId, userId]
            );

            if (!registration) {
                return BaseController.error(res, '您尚未報名此活動', 400);
            }

            // 刪除報名記錄
            await DatabaseHelper.run(
                'DELETE FROM activity_registrations WHERE event_plan_id = ? AND user_id = ?',
                [activityId, userId]
            );

            await BaseController.logAction(req, 'ACTIVITY_UNREGISTERED', `取消報名活動: ${activityId}`, {
                activityId,
                registrationId: registration.id
            });

            return BaseController.success(res, null, '取消報名成功');

        } catch (error) {
            console.error('取消報名錯誤:', error);
            await BaseController.logAction(req, 'ACTIVITY_UNREGISTER_ERROR', `取消報名失敗: ${error.message}`);
            return BaseController.error(res, '取消報名失敗', 500);
        }
    });

    /**
     * 獲取活動報名列表
     */
    static getActivityRegistrations = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const { page, limit, offset } = BaseController.getPaginationParams(req);

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            // 獲取總數
            const { total } = await DatabaseHelper.get(
                'SELECT COUNT(*) as total FROM activity_registrations WHERE event_plan_id = ?',
                [activityId]
            );

            // 獲取報名列表
            const registrations = await DatabaseHelper.all(`
                SELECT ar.*, u.name, u.email, u.student_id
                FROM activity_registrations ar
                LEFT JOIN users u ON ar.user_id = u.id
                WHERE ar.event_plan_id = ?
                ORDER BY ar.registered_at DESC
                LIMIT ? OFFSET ?
            `, [activityId, limit, offset]);

            return BaseController.paginated(res, registrations, { page, limit, total });

        } catch (error) {
            console.error('獲取報名列表錯誤:', error);
            return BaseController.error(res, '獲取報名列表失敗', 500);
        }
    });

    /**
     * 更新報名狀態
     */
    static updateRegistrationStatus = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const registrationId = BaseController.validateId(req.params.registrationId);
        const { status } = req.body;

        if (!activityId || !registrationId) {
            return BaseController.error(res, '無效的 ID', 400);
        }

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return BaseController.error(res, '無效的狀態', 400);
        }

        try {
            // 檢查報名記錄是否存在
            const registration = await DatabaseHelper.get(
                'SELECT * FROM activity_registrations WHERE id = ? AND event_plan_id = ?',
                [registrationId, activityId]
            );

            if (!registration) {
                return BaseController.error(res, '報名記錄不存在', 404);
            }

            // 更新狀態
            await DatabaseHelper.run(
                'UPDATE activity_registrations SET status = ?, updated_at = datetime(\'now\') WHERE id = ?',
                [status, registrationId]
            );

            await BaseController.logAction(req, 'REGISTRATION_STATUS_UPDATED', `更新報名狀態: ${status}`, {
                activityId,
                registrationId,
                status
            });

            return BaseController.success(res, { status }, '報名狀態更新成功');

        } catch (error) {
            console.error('更新報名狀態錯誤:', error);
            return BaseController.error(res, '更新報名狀態失敗', 500);
        }
    });

    /**
     * 獲取用戶的報名記錄
     */
    static getUserRegistrations = BaseController.asyncHandler(async (req, res) => {
        const userId = req.session.user.id;
        const { page, limit, offset } = BaseController.getPaginationParams(req);

        try {
            // 獲取總數
            const { total } = await DatabaseHelper.get(
                'SELECT COUNT(*) as total FROM activity_registrations WHERE user_id = ?',
                [userId]
            );

            // 獲取報名記錄
            const registrations = await DatabaseHelper.all(`
                SELECT ar.*, ep.title, ep.event_date, ep.location
                FROM activity_registrations ar
                LEFT JOIN event_plans ep ON ar.event_plan_id = ep.id
                WHERE ar.user_id = ?
                ORDER BY ar.registered_at DESC
                LIMIT ? OFFSET ?
            `, [userId, limit, offset]);

            return BaseController.paginated(res, registrations, { page, limit, total });

        } catch (error) {
            console.error('獲取用戶報名記錄錯誤:', error);
            return BaseController.error(res, '獲取報名記錄失敗', 500);
        }
    });

    /**
     * 獲取活動統計
     */
    static getActivityStats = BaseController.asyncHandler(async (req, res) => {
        try {
            const stats = await DatabaseHelper.get(`
                SELECT 
                    COUNT(*) as total_activities,
                    COUNT(CASE WHEN status = 'planning' THEN 1 END) as planning_count,
                    COUNT(CASE WHEN status = 'ongoing' THEN 1 END) as ongoing_count,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
                    SUM(budget) as total_budget,
                    AVG(budget) as average_budget
                FROM event_plans
            `);

            const registrationStats = await DatabaseHelper.get(`
                SELECT 
                    COUNT(*) as total_registrations,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_registrations,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_registrations,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_registrations
                FROM activity_registrations
            `);

            const monthlyStats = await DatabaseHelper.all(`
                SELECT 
                    strftime('%Y-%m', event_date) as month,
                    COUNT(*) as activity_count,
                    SUM(budget) as total_budget
                FROM event_plans
                WHERE event_date >= date('now', '-12 months')
                GROUP BY strftime('%Y-%m', event_date)
                ORDER BY month
            `);

            return BaseController.success(res, {
                activityStats: stats,
                registrationStats,
                monthlyStats
            }, '獲取活動統計成功');

        } catch (error) {
            console.error('獲取活動統計錯誤:', error);
            return BaseController.error(res, '獲取活動統計失敗', 500);
        }
    });

    /**
     * 獲取活動數量
     */
    static getCount = BaseController.asyncHandler(async (req, res) => {
        try {
            const result = await DatabaseHelper.get('SELECT COUNT(*) as count FROM event_plans');
            
            res.json({
                success: true,
                data: {
                    count: result.count || 0
                }
            });
        } catch (error) {
            throw new ErrorHandler('獲取活動數量失敗', 500, error);
        }
    });

    /**
     * 導出活動數據
     */
    static exportActivityData = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const { format = 'json' } = req.query;

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            // 獲取活動詳情
            const activity = await DatabaseHelper.get(`
                SELECT ep.*, u.name as creator_name
                FROM event_plans ep
                LEFT JOIN users u ON ep.created_by = u.id
                WHERE ep.id = ?
            `, [activityId]);

            if (!activity) {
                return BaseController.error(res, '活動不存在', 404);
            }

            // 獲取報名數據
            const registrations = await DatabaseHelper.all(`
                SELECT ar.*, u.name, u.email, u.student_id
                FROM activity_registrations ar
                LEFT JOIN users u ON ar.user_id = u.id
                WHERE ar.event_plan_id = ?
                ORDER BY ar.registered_at
            `, [activityId]);

            const exportData = {
                activity: BaseController.sanitizeData(activity),
                registrations: registrations.map(reg => BaseController.sanitizeData(reg)),
                exportedAt: new Date().toISOString(),
                totalRegistrations: registrations.length
            };

            if (format === 'csv') {
                // 簡單的 CSV 格式
                let csv = 'Name,Email,Student ID,Status,Registered At\n';
                registrations.forEach(reg => {
                    csv += `"${reg.name}","${reg.email}","${reg.student_id}","${reg.status}","${reg.registered_at}"\n`;
                });
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="activity_${activityId}_registrations.csv"`);
                return res.send(csv);
            }

            await BaseController.logAction(req, 'ACTIVITY_DATA_EXPORTED', `導出活動數據: ${activity.title}`, {
                activityId,
                format,
                registrationCount: registrations.length
            });

            return BaseController.success(res, exportData, '活動數據導出成功');

        } catch (error) {
            console.error('導出活動數據錯誤:', error);
            return BaseController.error(res, '導出活動數據失敗', 500);
        }
    });

    /**
     * 獲取企劃書列表
     */
    static getEvents = BaseController.asyncHandler(async (req, res) => {
        try {
            const query = `
                SELECT ep.*, u.name as creator_name
                FROM event_plans ep
                LEFT JOIN users u ON ep.created_by = u.id
                ORDER BY ep.created_at DESC
            `;
            
            const events = await DatabaseHelper.all(query);
            
            return BaseController.success(res, events, '獲取企劃列表成功');
        } catch (error) {
            console.error('獲取企劃列表錯誤:', error);
            return BaseController.error(res, '獲取企劃列表失敗', 500);
        }
    });

    /**
     * 創建企劃書
     */
    static createEvent = BaseController.asyncHandler(async (req, res) => {
        const { title, description, event_date, location, max_participants } = req.body;
        const userId = req.user?.id;
        
        if (!title) {
            return BaseController.error(res, '企劃名稱為必填項', 400);
        }
        
        try {
            const proposalPath = req.file ? req.file.filename : null;
            
            const query = `
                INSERT INTO event_plans (title, description, event_date, location, max_participants, proposal_path, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await DatabaseHelper.run(query, [
                title,
                description || null,
                event_date || null,
                location || null,
                max_participants || null,
                proposalPath,
                userId
            ]);
            
            await BaseController.logAction(req, 'EVENT_CREATED', `創建企劃: ${title}`, {
                eventId: result.lastID,
                title
            });
            
            return BaseController.success(res, { id: result.lastID }, '企劃創建成功');
        } catch (error) {
            console.error('創建企劃錯誤:', error);
            return BaseController.error(res, '創建企劃失敗', 500);
        }
    });

    /**
     * 獲取單個企劃書詳情
     */
    static getEvent = BaseController.asyncHandler(async (req, res) => {
        const eventId = BaseController.validateId(req.params.id);
        
        if (!eventId) {
            return BaseController.error(res, '無效的企劃 ID', 400);
        }
        
        try {
            const query = `
                SELECT ep.*, u.name as creator_name
                FROM event_plans ep
                LEFT JOIN users u ON ep.created_by = u.id
                WHERE ep.id = ?
            `;
            
            const event = await DatabaseHelper.get(query, [eventId]);
            
            if (!event) {
                return BaseController.error(res, '企劃不存在', 404);
            }
            
            return BaseController.success(res, event, '獲取企劃詳情成功');
        } catch (error) {
            console.error('獲取企劃詳情錯誤:', error);
            return BaseController.error(res, '獲取企劃詳情失敗', 500);
        }
    });

    /**
     * 更新企劃書
     */
    static updateEvent = BaseController.asyncHandler(async (req, res) => {
        const eventId = BaseController.validateId(req.params.id);
        const { title, description, event_date, location, max_participants } = req.body;
        
        if (!eventId) {
            return BaseController.error(res, '無效的企劃 ID', 400);
        }
        
        if (!title) {
            return BaseController.error(res, '企劃名稱為必填項', 400);
        }
        
        try {
            // 檢查企劃是否存在
            const existingEvent = await DatabaseHelper.get('SELECT * FROM event_plans WHERE id = ?', [eventId]);
            if (!existingEvent) {
                return BaseController.error(res, '企劃不存在', 404);
            }
            
            let updateFields = [];
            let updateValues = [];
            
            updateFields.push('title = ?', 'description = ?', 'event_date = ?', 'location = ?', 'max_participants = ?');
            updateValues.push(title, description || null, event_date || null, location || null, max_participants || null);
            
            // 如果有新的檔案上傳
            if (req.file) {
                updateFields.push('proposal_path = ?');
                updateValues.push(req.file.filename);
            }
            
            updateValues.push(eventId);
            
            const query = `UPDATE event_plans SET ${updateFields.join(', ')} WHERE id = ?`;
            await DatabaseHelper.run(query, updateValues);
            
            await BaseController.logAction(req, 'EVENT_UPDATED', `更新企劃: ${title}`, {
                eventId,
                title
            });
            
            return BaseController.success(res, null, '企劃更新成功');
        } catch (error) {
            console.error('更新企劃錯誤:', error);
            return BaseController.error(res, '更新企劃失敗', 500);
        }
    });

    /**
     * 刪除企劃書
     */
    static deleteEvent = BaseController.asyncHandler(async (req, res) => {
        const eventId = BaseController.validateId(req.params.id);
        
        if (!eventId) {
            return BaseController.error(res, '無效的企劃 ID', 400);
        }
        
        try {
            // 檢查企劃是否存在
            const event = await DatabaseHelper.get('SELECT * FROM event_plans WHERE id = ?', [eventId]);
            if (!event) {
                return BaseController.error(res, '企劃不存在', 404);
            }
            
            // 刪除企劃
            await DatabaseHelper.run('DELETE FROM event_plans WHERE id = ?', [eventId]);
            
            // 如果有檔案，嘗試刪除檔案
            if (event.proposal_path) {
                try {
                    const filePath = path.join(__dirname, '../uploads/activity', event.proposal_path);
                    await fs.unlink(filePath);
                } catch (fileError) {
                    console.warn('刪除企劃檔案失敗:', fileError.message);
                }
            }
            
            await BaseController.logAction(req, 'EVENT_DELETED', `刪除企劃: ${event.title}`, {
                eventId,
                title: event.title
            });
            
            return BaseController.success(res, null, '企劃刪除成功');
        } catch (error) {
            console.error('刪除企劃錯誤:', error);
            return BaseController.error(res, '刪除企劃失敗', 500);
        }
    });

    /**
     * 查看企劃書檔案
     */
    static viewEvent = BaseController.asyncHandler(async (req, res) => {
        const eventId = BaseController.validateId(req.params.id);
        
        if (!eventId) {
            return BaseController.error(res, '無效的企劃 ID', 400);
        }
        
        try {
            const event = await DatabaseHelper.get('SELECT proposal_path FROM event_plans WHERE id = ?', [eventId]);
            
            if (!event || !event.proposal_path) {
                return BaseController.error(res, '企劃檔案不存在', 404);
            }
            
            const filePath = path.join(__dirname, '../uploads/activity', event.proposal_path);
            
            try {
                await fs.access(filePath);
                return res.sendFile(path.resolve(filePath));
            } catch (fileError) {
                return BaseController.error(res, '檔案不存在', 404);
            }
        } catch (error) {
            console.error('查看企劃檔案錯誤:', error);
            return BaseController.error(res, '查看企劃檔案失敗', 500);
        }
    });

    /**
     * 下載企劃書檔案
     */
    static downloadEvent = BaseController.asyncHandler(async (req, res) => {
        const eventId = BaseController.validateId(req.params.id);
        
        if (!eventId) {
            return BaseController.error(res, '無效的企劃 ID', 400);
        }
        
        try {
            const event = await DatabaseHelper.get('SELECT title, proposal_path FROM event_plans WHERE id = ?', [eventId]);
            
            if (!event || !event.proposal_path) {
                return BaseController.error(res, '企劃檔案不存在', 404);
            }
            
            const filePath = path.join(__dirname, '../uploads/activity', event.proposal_path);
            
            try {
                await fs.access(filePath);
                const ext = path.extname(event.proposal_path);
                const downloadName = `${event.title}_企劃書${ext}`;
                
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
                return res.sendFile(path.resolve(filePath));
            } catch (fileError) {
                return BaseController.error(res, '檔案不存在', 404);
            }
        } catch (error) {
            console.error('下載企劃檔案錯誤:', error);
            return BaseController.error(res, '下載企劃檔案失敗', 500);
        }
    });

    /**
     * 導出所有活動數據
     */
    static exportAllActivityData = BaseController.asyncHandler(async (req, res) => {
        try {
            const activities = await DatabaseHelper.all(`
                SELECT ep.*, u.name as creator_name
                FROM event_plans ep
                LEFT JOIN users u ON ep.created_by = u.id
                ORDER BY ep.created_at DESC
            `, []);
            
            return BaseController.success(res, activities, '活動數據導出成功');
        } catch (error) {
            console.error('導出活動數據錯誤:', error);
            return BaseController.error(res, '導出活動數據失敗', 500);
        }
    });

    /**
     * 獲取細流列表
     */
    static getDetails = BaseController.asyncHandler(async (req, res) => {
        const { page, limit, offset } = BaseController.getPaginationParams(req);
        const { field, order } = BaseController.getSortParams(req, ['id', 'title', 'created_at'], 'created_at');
        const { search, conditions } = BaseController.getSearchParams(req, ['title', 'description']);

        try {
            let whereClause = '';
            let params = [];

            if (conditions.length > 0) {
                whereClause = `WHERE (${conditions.join(' OR ')})`;
                params = new Array(conditions.length).fill(search);
            }

            // 獲取總數
            const countQuery = `SELECT COUNT(*) as total FROM activity_details ${whereClause}`;
            const { total } = await DatabaseHelper.get(countQuery, params);

            // 獲取細流列表
            const query = `
                SELECT ad.*, u.name as creator_name, ep.title as event_title
                FROM activity_details ad
                LEFT JOIN users u ON ad.created_by = u.id
                LEFT JOIN event_plans ep ON ad.event_plan_id = ep.id
                ${whereClause}
                ORDER BY ${field} ${order}
                LIMIT ? OFFSET ?
            `;
            
            const details = await DatabaseHelper.all(query, [...params, limit, offset]);

            return BaseController.paginated(res, details, { page, limit, total });

        } catch (error) {
            console.error('獲取細流列表錯誤:', error);
            return BaseController.error(res, '獲取細流列表失敗', 500);
        }
    });

    /**
     * 創建細流
     */
    static createDetail = BaseController.asyncHandler(async (req, res) => {
        const { title, description, event_plan_id, content } = req.body;
        const userId = req.session.user.id;
        const file = req.file;

        try {
            let filePath = null;
            if (file) {
                filePath = file.filename;
            }

            const sql = `
                INSERT INTO activity_details (title, description, event_plan_id, content, file_path, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `;
            
            const result = await DatabaseHelper.run(sql, [title, description, event_plan_id, content, filePath, userId]);
            
            await BaseController.logAction(req, 'DETAIL_CREATED', `創建細流: ${title}`, {
                detailId: result.lastID,
                title,
                eventPlanId: event_plan_id
            });
            
            return BaseController.success(res, { id: result.lastID }, '細流創建成功');
        } catch (error) {
            console.error('創建細流錯誤:', error);
            return BaseController.error(res, '創建細流失敗', 500);
        }
    });

    /**
     * 獲取單個細流詳情
     */
    static getDetail = BaseController.asyncHandler(async (req, res) => {
        const detailId = BaseController.validateId(req.params.id);
        
        if (!detailId) {
            return BaseController.error(res, '無效的細流 ID', 400);
        }

        try {
            const detail = await DatabaseHelper.get(`
                SELECT ad.*, u.name as creator_name, ep.title as event_title
                FROM activity_details ad
                LEFT JOIN users u ON ad.created_by = u.id
                LEFT JOIN event_plans ep ON ad.event_plan_id = ep.id
                WHERE ad.id = ?
            `, [detailId]);

            if (!detail) {
                return BaseController.error(res, '細流不存在', 404);
            }

            return BaseController.success(res, detail, '獲取細流詳情成功');

        } catch (error) {
            console.error('獲取細流詳情錯誤:', error);
            return BaseController.error(res, '獲取細流詳情失敗', 500);
        }
    });

    /**
     * 更新細流
     */
    static updateDetail = BaseController.asyncHandler(async (req, res) => {
        const detailId = BaseController.validateId(req.params.id);
        const { title, description, content } = req.body;
        const file = req.file;
        
        if (!detailId) {
            return BaseController.error(res, '無效的細流 ID', 400);
        }

        try {
            // 檢查細流是否存在
            const existingDetail = await DatabaseHelper.get('SELECT * FROM activity_details WHERE id = ?', [detailId]);
            
            if (!existingDetail) {
                return BaseController.error(res, '細流不存在', 404);
            }

            let filePath = existingDetail.file_path;
            if (file) {
                filePath = file.filename;
                
                // 刪除舊檔案
                if (existingDetail.file_path) {
                    const oldFilePath = path.join(__dirname, '../uploads/activity', existingDetail.file_path);
                    try {
                        await fs.unlink(oldFilePath);
                    } catch (unlinkError) {
                        console.warn('刪除舊檔案失敗:', unlinkError.message);
                    }
                }
            }

            const sql = `
                UPDATE activity_details 
                SET title = ?, description = ?, content = ?, file_path = ?, updated_at = datetime('now')
                WHERE id = ?
            `;
            
            await DatabaseHelper.run(sql, [title, description, content, filePath, detailId]);
            
            await BaseController.logAction(req, 'DETAIL_UPDATED', `更新細流: ${title}`, {
                detailId,
                title
            });
            
            return BaseController.success(res, null, '細流更新成功');
        } catch (error) {
            console.error('更新細流錯誤:', error);
            return BaseController.error(res, '更新細流失敗', 500);
        }
    });

    /**
     * 刪除細流
     */
    static deleteDetail = BaseController.asyncHandler(async (req, res) => {
        const detailId = BaseController.validateId(req.params.id);
        
        if (!detailId) {
            return BaseController.error(res, '無效的細流 ID', 400);
        }

        try {
            const detail = await DatabaseHelper.get('SELECT * FROM activity_details WHERE id = ?', [detailId]);
            
            if (!detail) {
                return BaseController.error(res, '細流不存在', 404);
            }

            // 刪除檔案
            if (detail.file_path) {
                const filePath = path.join(__dirname, '../uploads/activity', detail.file_path);
                try {
                    await fs.unlink(filePath);
                } catch (unlinkError) {
                    console.warn('刪除檔案失敗:', unlinkError.message);
                }
            }

            await DatabaseHelper.run('DELETE FROM activity_details WHERE id = ?', [detailId]);
            
            await BaseController.logAction(req, 'DETAIL_DELETED', `刪除細流: ${detail.title}`, {
                detailId,
                title: detail.title
            });
            
            return BaseController.success(res, null, '細流刪除成功');
        } catch (error) {
            console.error('刪除細流錯誤:', error);
            return BaseController.error(res, '刪除細流失敗', 500);
        }
    });

    /**
     * 查看細流檔案
     */
    static viewDetail = BaseController.asyncHandler(async (req, res) => {
        const detailId = BaseController.validateId(req.params.id);
        
        if (!detailId) {
            return BaseController.error(res, '無效的細流 ID', 400);
        }
        
        try {
            const detail = await DatabaseHelper.get('SELECT file_path FROM activity_details WHERE id = ?', [detailId]);
            
            if (!detail || !detail.file_path) {
                return BaseController.error(res, '細流檔案不存在', 404);
            }
            
            const filePath = path.join(__dirname, '../uploads/activity', detail.file_path);
            
            try {
                await fs.access(filePath);
                return res.sendFile(path.resolve(filePath));
            } catch (fileError) {
                return BaseController.error(res, '檔案不存在', 404);
            }
        } catch (error) {
            console.error('查看細流檔案錯誤:', error);
            return BaseController.error(res, '查看細流檔案失敗', 500);
        }
    });

    /**
     * 下載細流檔案
     */
    static downloadDetail = BaseController.asyncHandler(async (req, res) => {
        const detailId = BaseController.validateId(req.params.id);
        
        if (!detailId) {
            return BaseController.error(res, '無效的細流 ID', 400);
        }
        
        try {
            const detail = await DatabaseHelper.get('SELECT title, file_path FROM activity_details WHERE id = ?', [detailId]);
            
            if (!detail || !detail.file_path) {
                return BaseController.error(res, '細流檔案不存在', 404);
            }
            
            const filePath = path.join(__dirname, '../uploads/activity', detail.file_path);
            
            try {
                await fs.access(filePath);
                const ext = path.extname(detail.file_path);
                const downloadName = `${detail.title}_細流${ext}`;
                
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
                return res.sendFile(path.resolve(filePath));
            } catch (fileError) {
                return BaseController.error(res, '檔案不存在', 404);
            }
        } catch (error) {
            console.error('下載細流檔案錯誤:', error);
            return BaseController.error(res, '下載細流檔案失敗', 500);
        }
    });
}

module.exports = ActivityController;