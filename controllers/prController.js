/**
 * 公關部控制器
 * 處理公關部相關功能
 */

const BaseController = require('./baseController');
const ErrorHandler = require('../utils/errorHandler');
const DatabaseHelper = require('../utils/dbHelper');
const fs = require('fs').promises;
const path = require('path');

class PrController extends BaseController {
    /**
     * 獲取公關活動列表
     */
    static getPrActivities = BaseController.asyncHandler(async (req, res) => {
        try {
            const sql = `
                SELECT * FROM pr_activities 
                WHERE deleted_at IS NULL 
                ORDER BY created_at DESC
            `;
            
            const activities = await DatabaseHelper.all(sql, []);
            
            return BaseController.success(res, activities, '公關活動列表獲取成功');
        } catch (error) {
            console.error('獲取公關活動列表失敗:', error);
            return BaseController.error(res, '獲取公關活動列表失敗', 500);
        }
    })

    /**
     * 更新公關活動
     */
    static updatePrActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const { title, description, target_audience, budget, start_date, end_date, status } = req.body;

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            const activity = await DatabaseHelper.get('SELECT * FROM pr_activities WHERE id = ? AND deleted_at IS NULL', [activityId]);
            if (!activity) {
                return BaseController.error(res, '公關活動不存在', 404);
            }

            await DatabaseHelper.run(`
                UPDATE pr_activities SET 
                    title = COALESCE(?, title),
                    description = COALESCE(?, description),
                    target_audience = COALESCE(?, target_audience),
                    budget = COALESCE(?, budget),
                    start_date = COALESCE(?, start_date),
                    end_date = COALESCE(?, end_date),
                    status = COALESCE(?, status),
                    updated_at = datetime('now')
                WHERE id = ?
            `, [title, description, target_audience, budget, start_date, end_date, status, activityId]);

            await BaseController.logAction(req, 'PR_ACTIVITY_UPDATED', `更新公關活動: ${title || activity.title}`, {
                activityId
            });

            return BaseController.success(res, null, '公關活動更新成功');
        } catch (error) {
            console.error('更新公關活動錯誤:', error);
            return BaseController.error(res, '更新公關活動失敗', 500);
        }
    });

    /**
     * 刪除公關活動
     */
    static deletePrActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            const activity = await DatabaseHelper.get('SELECT * FROM pr_activities WHERE id = ? AND deleted_at IS NULL', [activityId]);
            if (!activity) {
                return BaseController.error(res, '公關活動不存在', 404);
            }

            await DatabaseHelper.run('UPDATE pr_activities SET deleted_at = datetime(\'now\') WHERE id = ?', [activityId]);

            await BaseController.logAction(req, 'PR_ACTIVITY_DELETED', `刪除公關活動: ${activity.title}`, {
                activityId
            });

            return BaseController.success(res, null, '公關活動刪除成功');
        } catch (error) {
            console.error('刪除公關活動錯誤:', error);
            return BaseController.error(res, '刪除公關活動失敗', 500);
        }
    });

    /**
     * 發布公關活動
     */
    static publishPrActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            await DatabaseHelper.run('UPDATE pr_activities SET status = \'published\', updated_at = datetime(\'now\') WHERE id = ?', [activityId]);
            await BaseController.logAction(req, 'PR_ACTIVITY_PUBLISHED', `發布公關活動: ${activityId}`);
            return BaseController.success(res, null, '公關活動發布成功');
        } catch (error) {
            console.error('發布公關活動錯誤:', error);
            return BaseController.error(res, '發布公關活動失敗', 500);
        }
    });

    /**
     * 取消發布公關活動
     */
    static unpublishPrActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            await DatabaseHelper.run('UPDATE pr_activities SET status = \'draft\', updated_at = datetime(\'now\') WHERE id = ?', [activityId]);
            await BaseController.logAction(req, 'PR_ACTIVITY_UNPUBLISHED', `取消發布公關活動: ${activityId}`);
            return BaseController.success(res, null, '取消發布成功');
        } catch (error) {
            console.error('取消發布錯誤:', error);
            return BaseController.error(res, '取消發布失敗', 500);
        }
    });

    /**
     * 獲取合作夥伴列表
     */
    static getPartners = BaseController.asyncHandler(async (req, res) => {
        const { page, limit, offset } = BaseController.getPaginationParams(req);
        const { search } = BaseController.getSearchParams(req);

        try {
            let whereClause = 'WHERE deleted_at IS NULL';
            let params = [];

            if (search) {
                whereClause += ' AND (name LIKE ? OR description LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            const { total } = await DatabaseHelper.get(`SELECT COUNT(*) as total FROM partners ${whereClause}`, params);
            const partners = await DatabaseHelper.all(`
                SELECT * FROM partners ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            return BaseController.paginated(res, partners, { page, limit, total });
        } catch (error) {
            console.error('獲取合作夥伴列表錯誤:', error);
            return BaseController.error(res, '獲取合作夥伴列表失敗', 500);
        }
    });

    /**
     * 獲取單個合作夥伴
     */
    static getPartner = BaseController.asyncHandler(async (req, res) => {
        const partnerId = BaseController.validateId(req.params.id);

        if (!partnerId) {
            return BaseController.error(res, '無效的合作夥伴 ID', 400);
        }

        try {
            const partner = await DatabaseHelper.get('SELECT * FROM partners WHERE id = ? AND deleted_at IS NULL', [partnerId]);
            if (!partner) {
                return BaseController.error(res, '合作夥伴不存在', 404);
            }

            return BaseController.success(res, partner, '獲取合作夥伴詳情成功');
        } catch (error) {
            console.error('獲取合作夥伴詳情錯誤:', error);
            return BaseController.error(res, '獲取合作夥伴詳情失敗', 500);
        }
    });

    /**
     * 創建合作夥伴
     */
    static createPartner = BaseController.asyncHandler(async (req, res) => {
        const { name, description, contact_person, email, phone, website, status } = req.body;
        const userId = req.session.user.id;

        if (!name || !contact_person || !email) {
            return BaseController.error(res, '名稱、聯絡人和電子郵件為必填欄位', 400);
        }

        try {
            const result = await DatabaseHelper.run(`
                INSERT INTO partners (name, description, contact_person, email, phone, website, status, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [name, description, contact_person, email, phone, website, status || 'active', userId]);

            await BaseController.logAction(req, 'PARTNER_CREATED', `創建合作夥伴: ${name}`, {
                partnerId: result.lastID
            });

            return BaseController.success(res, { id: result.lastID }, '合作夥伴創建成功', 201);
        } catch (error) {
            console.error('創建合作夥伴錯誤:', error);
            return BaseController.error(res, '創建合作夥伴失敗', 500);
        }
    });

    // 添加其他缺失的方法...
    static updatePartner = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deletePartner = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static togglePartnerStatus = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getMediaResources = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static uploadMediaResource = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static batchUploadMedia = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deleteMediaResource = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static downloadMediaResource = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getPressReleases = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getPressRelease = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static createPressRelease = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static updatePressRelease = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deletePressRelease = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static publishPressRelease = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getSocialAccounts = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static addSocialAccount = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static updateSocialAccount = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deleteSocialAccount = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static createSocialPost = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getSocialPosts = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deleteSocialPost = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getPrEvents = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static createPrEvent = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static updatePrEvent = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deletePrEvent = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static registerForEvent = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static unregisterFromEvent = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getEventRegistrations = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getMediaContacts = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static addMediaContact = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static updateMediaContact = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deleteMediaContact = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static sendEmailToContact = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static batchSendEmail = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getPrStats = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getActivityStats = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getMediaCoverageStats = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getSocialMediaStats = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getPartnerStats = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getCrisisEvents = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static createCrisisEvent = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static updateCrisisStatus = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static addCrisisAction = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static exportActivityReport = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static exportMediaContacts = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static exportPartners = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static generatePrReport = BaseController.asyncHandler(async (req, res) => {
        try {
            const { startDate, endDate, reportType } = req.body;
            
            // 這裡可以實現報告生成邏輯
            // 暫時返回成功響應
            
            await BaseController.logAction(req, 'PR_REPORT_GENERATED', '生成公關報告', {
                startDate,
                endDate,
                reportType
            });
            
            return BaseController.success(res, null, '公關報告生成成功');
        } catch (error) {
            console.error('生成公關報告錯誤:', error);
            return BaseController.error(res, '生成公關報告失敗', 500);
        }
    });

    /**
     * 獲取廠商列表
     */
    static getVendors = BaseController.asyncHandler(async (req, res) => {
        try {
            const sql = `
                SELECT * FROM pr_vendors 
                WHERE deleted_at IS NULL 
                ORDER BY created_at DESC
            `;
            
            const vendors = await DatabaseHelper.all(sql, []);
            
            return BaseController.success(res, vendors, '廠商列表獲取成功');
        } catch (error) {
            console.error('獲取廠商列表失敗:', error);
            return BaseController.error(res, '獲取廠商列表失敗', 500);
        }
    });

    /**
     * 獲取單個廠商詳情
     */
    static getVendor = BaseController.asyncHandler(async (req, res) => {
        const vendorId = BaseController.validateId(req.params.id);

        if (!vendorId) {
            return BaseController.error(res, '無效的廠商 ID', 400);
        }

        try {
            const vendor = await DatabaseHelper.get('SELECT * FROM pr_vendors WHERE id = ? AND deleted_at IS NULL', [vendorId]);
            
            if (!vendor) {
                return BaseController.error(res, '廠商不存在', 404);
            }

            return BaseController.success(res, vendor, '廠商詳情獲取成功');
        } catch (error) {
            console.error('獲取廠商詳情錯誤:', error);
            return BaseController.error(res, '獲取廠商詳情失敗', 500);
        }
    });

    /**
     * 創建新廠商
     */
    static createVendor = BaseController.asyncHandler(async (req, res) => {
        const { name, contact_person, phone, email, address, description, category } = req.body;

        if (!name || !contact_person) {
            return BaseController.error(res, '廠商名稱和聯絡人為必填項目', 400);
        }

        try {
            const result = await DatabaseHelper.run(`
                INSERT INTO pr_vendors (name, contact_person, phone, email, address, description, category, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `, [name, contact_person, phone, email, address, description, category]);

            await BaseController.logAction(req, 'VENDOR_CREATED', `創建廠商: ${name}`, {
                vendorId: result.lastID
            });

            return BaseController.success(res, { id: result.lastID }, '廠商創建成功');
        } catch (error) {
            console.error('創建廠商錯誤:', error);
            return BaseController.error(res, '創建廠商失敗', 500);
        }
    });

    /**
     * 更新廠商
     */
    static updateVendor = BaseController.asyncHandler(async (req, res) => {
        const vendorId = BaseController.validateId(req.params.id);
        const { name, contact_person, phone, email, address, description, category } = req.body;

        if (!vendorId) {
            return BaseController.error(res, '無效的廠商 ID', 400);
        }

        try {
            const vendor = await DatabaseHelper.get('SELECT * FROM pr_vendors WHERE id = ? AND deleted_at IS NULL', [vendorId]);
            if (!vendor) {
                return BaseController.error(res, '廠商不存在', 404);
            }

            await DatabaseHelper.run(`
                UPDATE pr_vendors SET 
                    name = COALESCE(?, name),
                    contact_person = COALESCE(?, contact_person),
                    phone = COALESCE(?, phone),
                    email = COALESCE(?, email),
                    address = COALESCE(?, address),
                    description = COALESCE(?, description),
                    category = COALESCE(?, category),
                    updated_at = datetime('now')
                WHERE id = ?
            `, [name, contact_person, phone, email, address, description, category, vendorId]);

            await BaseController.logAction(req, 'VENDOR_UPDATED', `更新廠商: ${name || vendor.name}`, {
                vendorId
            });

            return BaseController.success(res, null, '廠商更新成功');
        } catch (error) {
            console.error('更新廠商錯誤:', error);
            return BaseController.error(res, '更新廠商失敗', 500);
        }
    });

    /**
     * 刪除廠商
     */
    static deleteVendor = BaseController.asyncHandler(async (req, res) => {
        const vendorId = BaseController.validateId(req.params.id);

        if (!vendorId) {
            return BaseController.error(res, '無效的廠商 ID', 400);
        }

        try {
            const vendor = await DatabaseHelper.get('SELECT * FROM pr_vendors WHERE id = ? AND deleted_at IS NULL', [vendorId]);
            if (!vendor) {
                return BaseController.error(res, '廠商不存在', 404);
            }

            await DatabaseHelper.run('UPDATE pr_vendors SET deleted_at = datetime(\'now\') WHERE id = ?', [vendorId]);

            await BaseController.logAction(req, 'VENDOR_DELETED', `刪除廠商: ${vendor.name}`, {
                vendorId
            });

            return BaseController.success(res, null, '廠商刪除成功');
        } catch (error) {
            console.error('刪除廠商錯誤:', error);
            return BaseController.error(res, '刪除廠商失敗', 500);
        }
    });
    
    /**
     * 獲取單個公關活動詳情
     */
    static getPrActivity = BaseController.asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        const sql = `
            SELECT * FROM pr_activities 
            WHERE id = ? AND deleted_at IS NULL
        `;
        
        const activity = await DatabaseHelper.get(sql, [id]);
        
        if (!activity) {
            return BaseController.error(res, '公關活動不存在', 404);
        }
        
        await BaseController.logAction(req, 'PR_ACTIVITY_VIEW', `查看公關活動: ${activity.title}`);
        
        return BaseController.success(res, activity, '公關活動詳情獲取成功');
    });
    
    /**
     * 創建公關活動
     */
    static createPrActivity = BaseController.asyncHandler(async (req, res) => {
        const { title, description, target_audience, budget, start_date, end_date } = req.body;
        const userId = req.session.user.id;
        
        const sql = `
            INSERT INTO pr_activities (title, description, target_audience, budget, start_date, end_date, creator_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        const result = await DatabaseHelper.run(sql, [title, description, target_audience, budget, start_date, end_date, userId]);
        
        await BaseController.logAction(req, 'PR_ACTIVITY_CREATE', `創建公關活動: ${title}`);
        
        return BaseController.success(res, { id: result.lastID }, '公關活動創建成功');
    });
    
    // 移除重複的 deletePrActivity 方法定義，只保留一個
    static deletePrActivity = BaseController.asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.session.user.id;
            
            // 檢查活動是否存在且用戶有權限
            const checkSql = `
                SELECT * FROM pr_activities 
                WHERE id = ? AND deleted_at IS NULL
            `;
            
            const activity = await new Promise((resolve, reject) => {
                db.get(checkSql, [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (!activity) {
                return res.status(404).json({
                    success: false,
                    message: '公關活動不存在'
                });
            }
            
            // 檢查權限
            if (activity.creator_id !== userId && req.session.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '沒有權限刪除此公關活動'
                });
            }
            
            const sql = `
                UPDATE pr_activities 
                SET deleted_at = datetime('now')
                WHERE id = ?
            `;
            
            await new Promise((resolve, reject) => {
                db.run(sql, [id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            res.json({
                success: true,
                message: '公關活動刪除成功'
            });
        } catch (error) {
            console.error('刪除公關活動失敗:', error);
            res.status(500).json({
                success: false,
                message: '刪除公關活動失敗',
                error: error.message
            });
        }
    });
}

module.exports = PrController;