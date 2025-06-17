/**
 * 設計部控制器
 * 處理設計部相關功能
 */

const BaseController = require('./baseController');
const ErrorHandler = require('../utils/errorHandler');
const DatabaseHelper = require('../utils/dbHelper');
const fs = require('fs').promises;
const path = require('path');

class DesignController extends BaseController {
    /**
     * 獲取設計作品列表
     */
    static getDesignWorks = BaseController.asyncHandler(async (req, res) => {
        try {
            const sql = `
                SELECT * FROM design_works 
                WHERE deleted_at IS NULL 
                ORDER BY created_at DESC
            `;
            
            const works = await DatabaseHelper.all(sql, []);
            
            return BaseController.success(res, works, '設計作品列表獲取成功');
        } catch (error) {
            console.error('獲取設計作品列表失敗:', error);
            return BaseController.error(res, '獲取設計作品列表失敗', 500);
        }
    })
    
    /**
     * 獲取單個設計作品詳情
     */
    static getDesignWork = BaseController.asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT * FROM design_works 
                WHERE id = ? AND deleted_at IS NULL
            `;
            
            const work = await DatabaseHelper.get(sql, [id]);
            
            if (!work) {
                return BaseController.error(res, '設計作品不存在', 404);
            }
            
            return BaseController.success(res, work, '設計作品詳情獲取成功');
        } catch (error) {
            console.error('獲取設計作品詳情失敗:', error);
            return BaseController.error(res, '獲取設計作品詳情失敗', 500);
        }
    })

    /**
     * 創建設計作品
     */
    static createDesignWork = BaseController.asyncHandler(async (req, res) => {
        try {
            const { title, description, category, tags } = req.body;
            const userId = req.session.user.id;
            const files = req.files || [];
            
            // 驗證必填欄位
            if (!title || !description) {
                return res.status(400).json({
                    success: false,
                    message: '標題和描述為必填欄位'
                });
            }
            
            const sql = `
                INSERT INTO design_works (
                    title, description, category, tags, file_paths, 
                    created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `;
            
            const result = await DatabaseHelper.run(sql, [
                title, description, category, 
                tags ? JSON.stringify(tags) : null,
                files.length > 0 ? JSON.stringify(files.map(f => f.path)) : null,
                userId
            ]);
            
            await BaseController.logAction(req, 'DESIGN_WORK_CREATED', `創建設計作品: ${title}`, {
                workId: result.lastID
            });
            
            return BaseController.success(res, { id: result.lastID }, '設計作品創建成功', 201);
        } catch (error) {
            console.error('創建設計作品失敗:', error);
            return BaseController.error(res, '創建設計作品失敗', 500);
        }
    });
    
    /**
     * 更新設計作品
     */
    static updateDesignWork = BaseController.asyncHandler(async (req, res) => {
        const workId = BaseController.validateId(req.params.id);
        const { title, description, category, tags } = req.body;

        if (!workId) {
            return BaseController.error(res, '無效的作品 ID', 400);
        }

        try {
            const work = await DatabaseHelper.get('SELECT * FROM design_works WHERE id = ? AND deleted_at IS NULL', [workId]);
            if (!work) {
                return BaseController.error(res, '設計作品不存在', 404);
            }

            await DatabaseHelper.run(`
                UPDATE design_works SET 
                    title = COALESCE(?, title),
                    description = COALESCE(?, description),
                    category = COALESCE(?, category),
                    tags = COALESCE(?, tags),
                    updated_at = datetime('now')
                WHERE id = ?
            `, [title, description, category, tags ? JSON.stringify(tags) : null, workId]);

            await BaseController.logAction(req, 'DESIGN_WORK_UPDATED', `更新設計作品: ${title || work.title}`, {
                workId
            });

            return BaseController.success(res, null, '設計作品更新成功');
        } catch (error) {
            console.error('更新設計作品錯誤:', error);
            return BaseController.error(res, '更新設計作品失敗', 500);
        }
    });
    
    /**
     * 刪除設計作品
     */
    static deleteDesignWork = BaseController.asyncHandler(async (req, res) => {
        const workId = BaseController.validateId(req.params.id);

        if (!workId) {
            return BaseController.error(res, '無效的作品 ID', 400);
        }

        try {
            const work = await DatabaseHelper.get('SELECT * FROM design_works WHERE id = ? AND deleted_at IS NULL', [workId]);
            if (!work) {
                return BaseController.error(res, '設計作品不存在', 404);
            }

            await DatabaseHelper.run('UPDATE design_works SET deleted_at = datetime(\'now\') WHERE id = ?', [workId]);

            await BaseController.logAction(req, 'DESIGN_WORK_DELETED', `刪除設計作品: ${work.title}`, {
                workId
            });

            return BaseController.success(res, null, '設計作品刪除成功');
        } catch (error) {
            console.error('刪除設計作品錯誤:', error);
            return BaseController.error(res, '刪除設計作品失敗', 500);
        }
    });

    // 添加其他缺失的方法...
    static batchUploadWorks = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getCategories = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static createCategory = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static updateCategory = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deleteCategory = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getWorksByCategory = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getDesigners = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getDesigner = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static createDesigner = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static updateDesigner = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deleteDesigner = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getDesignerWorks = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getProjects = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getProject = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static createProject = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static updateProject = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deleteProject = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static updateProjectStatus = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static assignDesigner = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getProjectProgress = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getAssets = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static uploadAsset = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static batchUploadAssets = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deleteAsset = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static downloadAsset = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static searchAssets = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getWorkComments = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static addComment = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deleteComment = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static rateWork = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getWorkRating = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getDesignStats = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getWorkStats = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getDesignerStats = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getProjectStats = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getPopularWorks = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static exportWorks = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static exportProjectReport = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static generatePortfolio = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getTemplates = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static createTemplate = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static useTemplate = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static deleteTemplate = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static inviteCollaboration = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static acceptCollaboration = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static getCollaborations = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });

    static endCollaboration = BaseController.asyncHandler(async (req, res) => {
        return BaseController.error(res, '方法尚未實現', 501);
    });
}

module.exports = DesignController;