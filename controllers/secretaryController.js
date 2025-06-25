/**
 * 秘書控制器
 * 處理文件管理、會議記錄、通知等相關功能
 */

const BaseController = require('./baseController');
const ErrorHandler = require('../utils/errorHandler');
const DatabaseHelper = require('../utils/dbHelper');
const fs = require('fs').promises;
const path = require('path');

class SecretaryController extends BaseController {
    /**
     * 獲取文件列表
     */
    static getDocuments = BaseController.asyncHandler(async (req, res) => {
        const { page, limit, offset } = BaseController.getPaginationParams(req);
        const { field, order } = BaseController.getSortParams(req, ['id', 'title', 'document_type', 'created_at'], 'created_at');
        const { search, conditions } = BaseController.getSearchParams(req, ['title', 'content', 'document_type']);
        
        const { document_type, status } = req.query;

        try {
            let whereConditions = [];
            let params = [];

            // 搜尋條件
            if (conditions.length > 0) {
                whereConditions.push(`(${conditions.join(' OR ')})`);
                params.push(...new Array(conditions.length).fill(search));
            }

            // 文件類型篩選
            if (document_type) {
                whereConditions.push('document_type = ?');
                params.push(document_type);
            }

            // 狀態篩選
            if (status) {
                whereConditions.push('status = ?');
                params.push(status);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // 獲取總數
            const countQuery = `SELECT COUNT(*) as total FROM secretary_documents ${whereClause}`;
            const { total } = await DatabaseHelper.get(countQuery, params);

            // 獲取文件列表
            const query = `
                SELECT sd.*, u.name as creator_name
                FROM secretary_documents sd
                LEFT JOIN users u ON sd.created_by = u.id
                ${whereClause}
                ORDER BY ${field} ${order}
                LIMIT ? OFFSET ?
            `;
            
            const documents = await DatabaseHelper.all(query, [...params, limit, offset]);

            return BaseController.paginated(res, documents, { page, limit, total });

        } catch (error) {
            console.error('獲取文件列表錯誤:', error);
            return BaseController.error(res, '獲取文件列表失敗', 500);
        }
    });

    /**
     * 獲取單個文件
     */
    static getDocument = BaseController.asyncHandler(async (req, res) => {
        const documentId = BaseController.validateId(req.params.id);
        
        if (!documentId) {
            return BaseController.error(res, '無效的文件 ID', 400);
        }

        try {
            const document = await DatabaseHelper.get(`
                SELECT sd.*, u.name as creator_name
                FROM secretary_documents sd
                LEFT JOIN users u ON sd.created_by = u.id
                WHERE sd.id = ?
            `, [documentId]);

            if (!document) {
                return BaseController.error(res, '文件不存在', 404);
            }

            return BaseController.success(res, document, '獲取文件成功');

        } catch (error) {
            console.error('獲取文件錯誤:', error);
            return BaseController.error(res, '獲取文件失敗', 500);
        }
    });

    /**
     * 上傳文件
     */
    static uploadDocument = BaseController.asyncHandler(async (req, res) => {
        const { title, document_type, content, notes } = req.body;
        const userId = req.session.user.id;
        const file = req.file;

        try {
            let filePath = null;
            let fileName = null;
            let fileSize = null;

            if (file) {
                filePath = file.path;
                fileName = file.originalname;
                fileSize = file.size;
            }

            const result = await DatabaseHelper.run(`
                INSERT INTO secretary_documents (title, document_type, content, file_path, file_name, file_size, notes, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [title, document_type, content, filePath, fileName, fileSize, notes, userId]);

            await BaseController.logAction(req, 'DOCUMENT_UPLOADED', `上傳文件: ${title}`, {
                documentId: result.lastID,
                fileName
            });

            return BaseController.success(res, {
                id: result.lastID,
                title,
                document_type,
                file_name: fileName
            }, '文件上傳成功', 201);

        } catch (error) {
            console.error('上傳文件錯誤:', error);
            return BaseController.error(res, '上傳文件失敗', 500);
        }
    });

    /**
     * 批量上傳文件
     */
    static batchUploadDocuments = BaseController.asyncHandler(async (req, res) => {
        const { document_type, notes } = req.body;
        const userId = req.session.user.id;
        const files = req.files;

        if (!files || files.length === 0) {
            return BaseController.error(res, '請選擇要上傳的文件', 400);
        }

        try {
            const uploadedFiles = [];

            for (const file of files) {
                const result = await DatabaseHelper.run(`
                    INSERT INTO secretary_documents (title, document_type, file_path, file_name, file_size, notes, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `, [file.originalname, document_type, file.path, file.originalname, file.size, notes, userId]);

                uploadedFiles.push({
                    id: result.lastID,
                    title: file.originalname,
                    file_name: file.originalname
                });
            }

            await BaseController.logAction(req, 'DOCUMENTS_BATCH_UPLOADED', `批量上傳 ${files.length} 個文件`);

            return BaseController.success(res, {
                uploaded: uploadedFiles,
                count: files.length
            }, '批量上傳成功', 201);

        } catch (error) {
            console.error('批量上傳文件錯誤:', error);
            return BaseController.error(res, '批量上傳失敗', 500);
        }
    });

    /**
     * 創建文件記錄
     */
    static createDocument = BaseController.asyncHandler(async (req, res) => {
        const { title, content, document_type = 'general', status = 'draft' } = req.body;
        const userId = req.session.user.id;

        try {
            const result = await DatabaseHelper.run(`
                INSERT INTO secretary_documents (title, content, document_type, status, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [title, content, document_type, status, userId]);

            await BaseController.logAction(req, 'DOCUMENT_CREATED', `創建文件: ${title}`, {
                documentId: result.lastID,
                document_type
            });

            return BaseController.success(res, {
                id: result.lastID,
                title,
                content,
                document_type,
                status
            }, '文件創建成功', 201);

        } catch (error) {
            console.error('創建文件錯誤:', error);
            await BaseController.logAction(req, 'DOCUMENT_CREATE_ERROR', `創建文件失敗: ${error.message}`);
            return BaseController.error(res, '創建文件失敗', 500);
        }
    });

    /**
     * 更新文件
     */
    static updateDocument = BaseController.asyncHandler(async (req, res) => {
        const documentId = BaseController.validateId(req.params.id);
        const { title, content, document_type, status } = req.body;
        const userId = req.session.user.id;

        if (!documentId) {
            return BaseController.error(res, '無效的文件 ID', 400);
        }

        try {
            // 檢查文件是否存在
            const document = await DatabaseHelper.get('SELECT * FROM secretary_documents WHERE id = ?', [documentId]);
            if (!document) {
                return BaseController.error(res, '文件不存在', 404);
            }

            // 檢查權限（只有創建者或管理員可以修改）
            if (document.created_by !== userId && req.session.user.role !== 'admin') {
                return BaseController.error(res, '權限不足', 403);
            }

            await DatabaseHelper.run(`
                UPDATE secretary_documents 
                SET title = ?, content = ?, document_type = ?, status = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [title, content, document_type, status, documentId]);

            await BaseController.logAction(req, 'DOCUMENT_UPDATED', `更新文件: ${title}`, {
                documentId,
                oldStatus: document.status,
                newStatus: status
            });

            return BaseController.success(res, {
                id: documentId,
                title,
                content,
                document_type,
                status
            }, '文件更新成功');

        } catch (error) {
            console.error('更新文件錯誤:', error);
            await BaseController.logAction(req, 'DOCUMENT_UPDATE_ERROR', `更新文件失敗: ${error.message}`);
            return BaseController.error(res, '更新文件失敗', 500);
        }
    });

    /**
     * 刪除文件
     */
    static deleteDocument = BaseController.asyncHandler(async (req, res) => {
        const documentId = BaseController.validateId(req.params.id);
        const userId = req.session.user.id;

        if (!documentId) {
            return BaseController.error(res, '無效的文件 ID', 400);
        }

        try {
            // 檢查文件是否存在
            const document = await DatabaseHelper.get('SELECT * FROM secretary_documents WHERE id = ?', [documentId]);
            if (!document) {
                return BaseController.error(res, '文件不存在', 404);
            }

            // 檢查權限（只有創建者或管理員可以刪除）
            if (document.created_by !== userId && req.session.user.role !== 'admin') {
                return BaseController.error(res, '權限不足', 403);
            }

            await DatabaseHelper.run('DELETE FROM secretary_documents WHERE id = ?', [documentId]);

            await BaseController.logAction(req, 'DOCUMENT_DELETED', `刪除文件: ${document.title}`, { documentId });

            return BaseController.success(res, null, '文件刪除成功');

        } catch (error) {
            console.error('刪除文件錯誤:', error);
            await BaseController.logAction(req, 'DOCUMENT_DELETE_ERROR', `刪除文件失敗: ${error.message}`);
            return BaseController.error(res, '刪除文件失敗', 500);
        }
    });

    /**
     * 下載文件
     */
    static downloadDocument = BaseController.asyncHandler(async (req, res) => {
        const documentId = BaseController.validateId(req.params.id);
        
        if (!documentId) {
            return BaseController.error(res, '無效的文件 ID', 400);
        }

        try {
            const document = await DatabaseHelper.get('SELECT * FROM secretary_documents WHERE id = ?', [documentId]);
            
            if (!document) {
                return BaseController.error(res, '文件不存在', 404);
            }

            if (!document.file_path) {
                return BaseController.error(res, '該文件沒有可下載的檔案', 400);
            }

            const filePath = path.resolve(document.file_path);
            
            // 檢查檔案是否存在
            try {
                await fs.access(filePath);
            } catch (error) {
                return BaseController.error(res, '檔案不存在', 404);
            }

            // 記錄下載操作
            await BaseController.logAction(req, 'DOCUMENT_DOWNLOADED', `下載文件: ${document.title}`, {
                documentId,
                fileName: path.basename(filePath)
            });

            // 設置下載標頭
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.title)}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            
            // 發送檔案
            return res.sendFile(filePath);

        } catch (error) {
            console.error('下載文件錯誤:', error);
            await BaseController.logAction(req, 'DOCUMENT_DOWNLOAD_ERROR', `下載文件失敗: ${error.message}`);
            return BaseController.error(res, '下載文件失敗', 500);
        }
    });

    /**
     * 獲取會議記錄列表
     */
    static getMeetings = BaseController.asyncHandler(async (req, res) => {
        const { page, limit, offset } = BaseController.getPaginationParams(req);
        const { field, order } = BaseController.getSortParams(req, ['id', 'title', 'meeting_date', 'created_at'], 'meeting_date');
        const { search, conditions } = BaseController.getSearchParams(req, ['title', 'content', 'location']);

        try {
            let whereConditions = [];
            let params = [];

            // 搜尋條件
            if (conditions.length > 0) {
                whereConditions.push(`(${conditions.join(' OR ')})`);
                params.push(...new Array(conditions.length).fill(search));
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // 獲取總數
            const countQuery = `SELECT COUNT(*) as total FROM meeting_records ${whereClause}`;
            const { total } = await DatabaseHelper.get(countQuery, params);

            // 獲取會議記錄列表
            const query = `
                SELECT mr.*, u.name as creator_name
                FROM meeting_records mr
                LEFT JOIN users u ON mr.created_by = u.id
                ${whereClause}
                ORDER BY ${field} ${order}
                LIMIT ? OFFSET ?
            `;
            
            const meetings = await DatabaseHelper.all(query, [...params, limit, offset]);

            return BaseController.paginated(res, meetings, { page, limit, total });

        } catch (error) {
            console.error('獲取會議記錄錯誤:', error);
            return BaseController.error(res, '獲取會議記錄失敗', 500);
        }
    });

    /**
     * 獲取單個會議記錄
     */
    static getMeeting = BaseController.asyncHandler(async (req, res) => {
        const meetingId = BaseController.validateId(req.params.id);
        
        if (!meetingId) {
            return BaseController.error(res, '無效的會議 ID', 400);
        }

        try {
            const meeting = await DatabaseHelper.get(`
                SELECT mr.*, u.name as creator_name
                FROM meeting_records mr
                LEFT JOIN users u ON mr.created_by = u.id
                WHERE mr.id = ?
            `, [meetingId]);

            if (!meeting) {
                return BaseController.error(res, '會議記錄不存在', 404);
            }

            return BaseController.success(res, meeting, '獲取會議記錄成功');

        } catch (error) {
            console.error('獲取會議記錄錯誤:', error);
            return BaseController.error(res, '獲取會議記錄失敗', 500);
        }
    });

    /**
     * 創建會議記錄
     */
    static createMeeting = BaseController.asyncHandler(async (req, res) => {
        const { title, content, meeting_date, location, attendees } = req.body;
        const userId = req.session.user.id;

        try {
            const result = await DatabaseHelper.run(`
                INSERT INTO meeting_records (title, content, meeting_date, location, attendees, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [title, content, meeting_date, location, attendees, userId]);

            await BaseController.logAction(req, 'MEETING_CREATED', `創建會議記錄: ${title}`, {
                meetingId: result.lastID,
                meeting_date
            });

            return BaseController.success(res, {
                id: result.lastID,
                title,
                content,
                meeting_date,
                location,
                attendees
            }, '會議記錄創建成功', 201);

        } catch (error) {
            console.error('創建會議記錄錯誤:', error);
            await BaseController.logAction(req, 'MEETING_CREATE_ERROR', `創建會議記錄失敗: ${error.message}`);
            return BaseController.error(res, '創建會議記錄失敗', 500);
        }
    });

    /**
     * 更新會議記錄
     */
    static updateMeeting = BaseController.asyncHandler(async (req, res) => {
        const meetingId = BaseController.validateId(req.params.id);
        const { title, content, meeting_date, location, attendees } = req.body;
        const userId = req.session.user.id;

        if (!meetingId) {
            return BaseController.error(res, '無效的會議 ID', 400);
        }

        try {
            // 檢查會議記錄是否存在
            const meeting = await DatabaseHelper.get('SELECT * FROM meeting_records WHERE id = ?', [meetingId]);
            if (!meeting) {
                return BaseController.error(res, '會議記錄不存在', 404);
            }

            // 檢查權限（只有創建者或管理員可以修改）
            if (meeting.created_by !== userId && req.session.user.role !== 'admin') {
                return BaseController.error(res, '權限不足', 403);
            }

            await DatabaseHelper.run(`
                UPDATE meeting_records 
                SET title = ?, content = ?, meeting_date = ?, location = ?, attendees = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [title, content, meeting_date, location, attendees, meetingId]);

            await BaseController.logAction(req, 'MEETING_UPDATED', `更新會議記錄: ${title}`, { meetingId });

            return BaseController.success(res, {
                id: meetingId,
                title,
                content,
                meeting_date,
                location,
                attendees
            }, '會議記錄更新成功');

        } catch (error) {
            console.error('更新會議記錄錯誤:', error);
            await BaseController.logAction(req, 'MEETING_UPDATE_ERROR', `更新會議記錄失敗: ${error.message}`);
            return BaseController.error(res, '更新會議記錄失敗', 500);
        }
    });

    /**
     * 刪除會議記錄
     */
    static deleteMeeting = BaseController.asyncHandler(async (req, res) => {
        const meetingId = BaseController.validateId(req.params.id);
        const userId = req.session.user.id;

        if (!meetingId) {
            return BaseController.error(res, '無效的會議 ID', 400);
        }

        try {
            // 檢查會議記錄是否存在
            const meeting = await DatabaseHelper.get('SELECT * FROM meeting_records WHERE id = ?', [meetingId]);
            if (!meeting) {
                return BaseController.error(res, '會議記錄不存在', 404);
            }

            // 檢查權限（只有創建者或管理員可以刪除）
            if (meeting.created_by !== userId && req.session.user.role !== 'admin') {
                return BaseController.error(res, '權限不足', 403);
            }

            await DatabaseHelper.run('DELETE FROM meeting_records WHERE id = ?', [meetingId]);

            await BaseController.logAction(req, 'MEETING_DELETED', `刪除會議記錄: ${meeting.title}`, { meetingId });

            return BaseController.success(res, null, '會議記錄刪除成功');

        } catch (error) {
            console.error('刪除會議記錄錯誤:', error);
            await BaseController.logAction(req, 'MEETING_DELETE_ERROR', `刪除會議記錄失敗: ${error.message}`);
            return BaseController.error(res, '刪除會議記錄失敗', 500);
        }
    });

    /**
     * 獲取通知列表
     */
    static getNotifications = BaseController.asyncHandler(async (req, res) => {
        const { page, limit, offset } = BaseController.getPaginationParams(req);
        const { field, order } = BaseController.getSortParams(req, ['id', 'title', 'created_at'], 'created_at');
        const { unread_only } = req.query;
        const userId = req.session.user.id;

        try {
            let whereConditions = ['(target_user_id = ? OR target_user_id IS NULL)'];
            let params = [userId];

            // 只顯示未讀通知
            if (unread_only === 'true') {
                whereConditions.push('is_read = 0');
            }

            const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

            // 獲取總數
            const countQuery = `SELECT COUNT(*) as total FROM notifications ${whereClause}`;
            const { total } = await DatabaseHelper.get(countQuery, params);

            // 獲取通知列表
            const query = `
                SELECT n.*, u.name as creator_name
                FROM notifications n
                LEFT JOIN users u ON n.created_by = u.id
                ${whereClause}
                ORDER BY ${field} ${order}
                LIMIT ? OFFSET ?
            `;
            
            const notifications = await DatabaseHelper.all(query, [...params, limit, offset]);

            return BaseController.paginated(res, notifications, { page, limit, total });

        } catch (error) {
            console.error('獲取通知列表錯誤:', error);
            return BaseController.error(res, '獲取通知列表失敗', 500);
        }
    });

    /**
     * 創建通知
     */
    static createNotification = BaseController.asyncHandler(async (req, res) => {
        const { title, content, target_user_id = null, notification_type = 'general' } = req.body;
        const userId = req.session.user.id;

        try {
            const result = await DatabaseHelper.run(`
                INSERT INTO notifications (title, content, target_user_id, notification_type, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [title, content, target_user_id, notification_type, userId]);

            await BaseController.logAction(req, 'NOTIFICATION_CREATED', `創建通知: ${title}`, {
                notificationId: result.lastID,
                target_user_id
            });

            return BaseController.success(res, {
                id: result.lastID,
                title,
                content,
                target_user_id,
                notification_type
            }, '通知創建成功', 201);

        } catch (error) {
            console.error('創建通知錯誤:', error);
            await BaseController.logAction(req, 'NOTIFICATION_CREATE_ERROR', `創建通知失敗: ${error.message}`);
            return BaseController.error(res, '創建通知失敗', 500);
        }
    });

    /**
     * 標記通知為已讀
     */
    static markNotificationRead = BaseController.asyncHandler(async (req, res) => {
        const notificationId = BaseController.validateId(req.params.id);
        const userId = req.session.user.id;

        if (!notificationId) {
            return BaseController.error(res, '無效的通知 ID', 400);
        }

        try {
            // 檢查通知是否存在且屬於當前用戶
            const notification = await DatabaseHelper.get(
                'SELECT * FROM notifications WHERE id = ? AND (target_user_id = ? OR target_user_id IS NULL)',
                [notificationId, userId]
            );

            if (!notification) {
                return BaseController.error(res, '通知不存在', 404);
            }

            await DatabaseHelper.run(
                'UPDATE notifications SET is_read = 1, read_at = datetime("now") WHERE id = ?',
                [notificationId]
            );

            return BaseController.success(res, null, '通知已標記為已讀');

        } catch (error) {
            console.error('標記通知已讀錯誤:', error);
            return BaseController.error(res, '標記通知已讀失敗', 500);
        }
    });



    /**
     * 預覽文件
     */
    static previewDocument = BaseController.asyncHandler(async (req, res) => {
        const documentId = BaseController.validateId(req.params.id);
        
        if (!documentId) {
            return BaseController.error(res, '無效的文件 ID', 400);
        }

        try {
            const document = await DatabaseHelper.get('SELECT * FROM secretary_documents WHERE id = ?', [documentId]);
            
            if (!document) {
                return BaseController.error(res, '文件不存在', 404);
            }

            return BaseController.success(res, {
                id: document.id,
                title: document.title,
                content: document.content,
                document_type: document.document_type,
                file_name: document.file_name
            }, '獲取文件預覽成功');

        } catch (error) {
            console.error('預覽文件錯誤:', error);
            return BaseController.error(res, '預覽文件失敗', 500);
        }
    });

    /**
     * 分享文件
     */
    static shareDocument = BaseController.asyncHandler(async (req, res) => {
        const documentId = BaseController.validateId(req.params.id);
        const { shareWith, permissions = 'read' } = req.body;
        
        if (!documentId) {
            return BaseController.error(res, '無效的文件 ID', 400);
        }

        try {
            const document = await DatabaseHelper.get('SELECT * FROM secretary_documents WHERE id = ?', [documentId]);
            
            if (!document) {
                return BaseController.error(res, '文件不存在', 404);
            }

            // 這裡可以實現分享邏輯，例如創建分享記錄
            const shareToken = Math.random().toString(36).substring(2, 15);
            
            return BaseController.success(res, {
                shareToken,
                permissions,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天後過期
            }, '文件分享成功');

        } catch (error) {
            console.error('分享文件錯誤:', error);
            return BaseController.error(res, '分享文件失敗', 500);
        }
    });

    /**
     * 獲取分享連結
     */
    static getShareLink = BaseController.asyncHandler(async (req, res) => {
        const documentId = BaseController.validateId(req.params.id);
        
        if (!documentId) {
            return BaseController.error(res, '無效的文件 ID', 400);
        }

        try {
            const document = await db.get('SELECT * FROM secretary_documents WHERE id = ?', [documentId]);
            
            if (!document) {
                return BaseController.error(res, '文件不存在', 404);
            }

            const shareToken = Math.random().toString(36).substring(2, 15);
            const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareToken}`;
            
            return BaseController.success(res, {
                shareUrl,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }, '獲取分享連結成功');

        } catch (error) {
            console.error('獲取分享連結錯誤:', error);
            return BaseController.error(res, '獲取分享連結失敗', 500);
        }
    });

    /**
     * 獲取標籤列表
     */
    static getTags = BaseController.asyncHandler(async (req, res) => {
        try {
            const tags = await DatabaseHelper.all('SELECT * FROM document_tags ORDER BY name');
            return BaseController.success(res, tags, '獲取標籤列表成功');
        } catch (error) {
            console.error('獲取標籤列表錯誤:', error);
            return BaseController.error(res, '獲取標籤列表失敗', 500);
        }
    });

    /**
     * 創建標籤
     */
    static createTag = BaseController.asyncHandler(async (req, res) => {
        const { name, color } = req.body;
        const userId = req.session.user.id;

        try {
            const result = await DatabaseHelper.run(`
                INSERT INTO document_tags (name, color, created_by, created_at)
                VALUES (?, ?, ?, datetime('now'))
            `, [name, color, userId]);

            return BaseController.success(res, {
                id: result.lastID,
                name,
                color
            }, '標籤創建成功', 201);

        } catch (error) {
            console.error('創建標籤錯誤:', error);
            return BaseController.error(res, '創建標籤失敗', 500);
        }
    });

    /**
     * 更新標籤
     */
    static updateTag = BaseController.asyncHandler(async (req, res) => {
        const tagId = BaseController.validateId(req.params.id);
        const { name, color } = req.body;
        
        if (!tagId) {
            return BaseController.error(res, '無效的標籤 ID', 400);
        }

        try {
            await DatabaseHelper.run(`
                UPDATE document_tags 
                SET name = ?, color = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [name, color, tagId]);

            return BaseController.success(res, {
                id: tagId,
                name,
                color
            }, '標籤更新成功');

        } catch (error) {
            console.error('更新標籤錯誤:', error);
            return BaseController.error(res, '更新標籤失敗', 500);
        }
    });

    /**
     * 上傳文件
     */
    static uploadFile = BaseController.asyncHandler(async (req, res) => {
        const userId = req.session.user.id;

        if (!req.file) {
            return BaseController.error(res, '請選擇要上傳的檔案', 400);
        }

        try {
            const file = req.file;
            const fileName = `${Date.now()}_${file.originalname}`;
            const filePath = path.join(process.env.UPLOAD_PATH || 'public/uploads', 'documents', fileName);

            // 確保目錄存在
            await fs.mkdir(path.dirname(filePath), { recursive: true });

            // 移動檔案
            await fs.rename(file.path, filePath);

            // 創建文件記錄
            const result = await DatabaseHelper.run(`
                INSERT INTO secretary_documents (title, content, document_type, file_path, created_by, created_at)
                VALUES (?, ?, 'file', ?, ?, datetime('now'))
            `, [file.originalname, `檔案上傳: ${file.originalname}`, filePath, userId]);

            await BaseController.logAction(req, 'DOCUMENT_FILE_UPLOADED', `上傳文件檔案: ${file.originalname}`, {
                documentId: result.lastID,
                fileName,
                fileSize: file.size
            });

            return BaseController.success(res, {
                id: result.lastID,
                fileName: file.originalname,
                filePath: `/uploads/documents/${fileName}`,
                fileSize: file.size
            }, '檔案上傳成功', 201);

        } catch (error) {
            console.error('上傳檔案錯誤:', error);
            await BaseController.logAction(req, 'DOCUMENT_FILE_UPLOAD_ERROR', `上傳文件檔案失敗: ${error.message}`);
            return BaseController.error(res, '檔案上傳失敗', 500);
        }
    });

    /**
     * 獲取統計資訊
     */
    static getStatistics = BaseController.asyncHandler(async (req, res) => {
        try {
            const documentStats = await DatabaseHelper.get(`
                SELECT 
                    COUNT(*) as total_documents,
                    COUNT(CASE WHEN document_type = 'meeting' THEN 1 END) as meeting_documents,
                    COUNT(CASE WHEN document_type = 'report' THEN 1 END) as report_documents,
                    COUNT(CASE WHEN document_type = 'general' THEN 1 END) as general_documents,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_documents,
                    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_documents
                FROM secretary_documents
            `);

            const meetingStats = await DatabaseHelper.get(`
                SELECT 
                    COUNT(*) as total_meetings,
                    COUNT(CASE WHEN meeting_date >= date('now') THEN 1 END) as upcoming_meetings,
                    COUNT(CASE WHEN meeting_date < date('now') THEN 1 END) as past_meetings
                FROM meeting_records
            `);

            const notificationStats = await DatabaseHelper.get(`
                SELECT 
                    COUNT(*) as total_notifications,
                    COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_notifications
                FROM notifications
            `);

            return BaseController.success(res, {
                documents: documentStats,
                meetings: meetingStats,
                notifications: notificationStats
            }, '獲取統計資訊成功');

        } catch (error) {
            console.error('獲取統計資訊錯誤:', error);
            return BaseController.error(res, '獲取統計資訊失敗', 500);
        }
    });

    /**
     * 獲取會議列表
     */
    static getMeetings = BaseController.asyncHandler(async (req, res) => {
        const { page, limit, offset } = BaseController.getPaginationParams(req);
        const { field, order } = BaseController.getSortParams(req, ['id', 'title', 'meeting_date', 'created_at'], 'meeting_date');
        const { search, conditions } = BaseController.getSearchParams(req, ['title', 'content']);
        
        try {
            let whereConditions = [];
            let params = [];

            // 搜尋條件
            if (conditions.length > 0) {
                whereConditions.push(`(${conditions.join(' OR ')})`);
                params.push(...new Array(conditions.length).fill(search));
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // 獲取總數
            const countQuery = `SELECT COUNT(*) as total FROM secretary_meetings ${whereClause}`;
            const { total } = await DatabaseHelper.get(countQuery, params);

            // 獲取會議列表
            const query = `
                SELECT sm.*, u.name as creator_name
                FROM secretary_meetings sm
                LEFT JOIN users u ON sm.created_by = u.id
                ${whereClause}
                ORDER BY ${field} ${order}
                LIMIT ? OFFSET ?
            `;
            
            const meetings = await DatabaseHelper.all(query, [...params, limit, offset]);

            return BaseController.paginated(res, meetings, { page, limit, total });

        } catch (error) {
            console.error('獲取會議列表錯誤:', error);
            return BaseController.error(res, '獲取會議列表失敗', 500);
        }
    });

    /**
     * 獲取單個會議
     */
    static getMeeting = BaseController.asyncHandler(async (req, res) => {
        const meetingId = BaseController.validateId(req.params.id);
        
        if (!meetingId) {
            return BaseController.error(res, '無效的會議 ID', 400);
        }

        try {
            const meeting = await DatabaseHelper.get(`
                SELECT sm.*, u.name as creator_name
                FROM secretary_meetings sm
                LEFT JOIN users u ON sm.created_by = u.id
                WHERE sm.id = ?
            `, [meetingId]);

            if (!meeting) {
                return BaseController.error(res, '會議不存在', 404);
            }

            return BaseController.success(res, meeting, '獲取會議成功');

        } catch (error) {
            console.error('獲取會議錯誤:', error);
            return BaseController.error(res, '獲取會議失敗', 500);
        }
    });

    /**
     * 創建會議
     */
    static createMeeting = BaseController.asyncHandler(async (req, res) => {
        const { title, content, meeting_date, location } = req.body;
        const userId = req.user?.id;

        if (!title || !content || !meeting_date) {
            return BaseController.error(res, '請填寫必要欄位', 400);
        }

        try {
            const result = await DatabaseHelper.run(`
                INSERT INTO meeting_records (title, minutes, meeting_date, location, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [title, content, meeting_date, location, userId]);

            return BaseController.success(res, { id: result.lastID }, '會議創建成功', 201);

        } catch (error) {
            console.error('創建會議錯誤:', error);
            return BaseController.error(res, '創建會議失敗', 500);
        }
    });

    /**
     * 更新會議
     */
    static updateMeeting = BaseController.asyncHandler(async (req, res) => {
        const meetingId = BaseController.validateId(req.params.id);
        const { title, content, meeting_date, location } = req.body;

        if (!meetingId) {
            return BaseController.error(res, '無效的會議 ID', 400);
        }

        try {
            const result = await DatabaseHelper.run(`
                UPDATE meeting_records
                SET title = ?, minutes = ?, meeting_date = ?, location = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [title, content, meeting_date, location, meetingId]);

            if (result.changes === 0) {
                return BaseController.error(res, '會議不存在', 404);
            }

            return BaseController.success(res, null, '會議更新成功');

        } catch (error) {
            console.error('更新會議錯誤:', error);
            return BaseController.error(res, '更新會議失敗', 500);
        }
    });

    /**
     * 刪除會議
     */
    static deleteMeeting = BaseController.asyncHandler(async (req, res) => {
        const meetingId = BaseController.validateId(req.params.id);

        if (!meetingId) {
            return BaseController.error(res, '無效的會議 ID', 400);
        }

        try {
            const result = await DatabaseHelper.run('DELETE FROM secretary_meetings WHERE id = ?', [meetingId]);

            if (result.changes === 0) {
                return BaseController.error(res, '會議不存在', 404);
            }

            return BaseController.success(res, null, '會議刪除成功');

        } catch (error) {
            console.error('刪除會議錯誤:', error);
            return BaseController.error(res, '刪除會議失敗', 500);
        }
    });

    /**
     * 獲取活動列表
     */
    static getActivities = BaseController.asyncHandler(async (req, res) => {
        const { page, limit, offset } = BaseController.getPaginationParams(req);
        const { field, order } = BaseController.getSortParams(req, ['id', 'title', 'activity_date', 'created_at'], 'activity_date');
        const { search, conditions } = BaseController.getSearchParams(req, ['title', 'description']);
        
        try {
            let whereConditions = [];
            let params = [];

            // 搜尋條件
            if (conditions.length > 0) {
                whereConditions.push(`(${conditions.join(' OR ')})`);
                params.push(...new Array(conditions.length).fill(search));
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // 獲取總數
            const countQuery = `SELECT COUNT(*) as total FROM secretary_activities ${whereClause}`;
            const { total } = await DatabaseHelper.get(countQuery, params);

            // 獲取活動列表
            const query = `
                SELECT sa.*, u.name as creator_name
                FROM secretary_activities sa
                LEFT JOIN users u ON sa.created_by = u.id
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
     * 獲取單個活動
     */
    static getActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        
        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            const activity = await DatabaseHelper.get(`
                SELECT sa.*, u.name as creator_name
                FROM secretary_activities sa
                LEFT JOIN users u ON sa.created_by = u.id
                WHERE sa.id = ?
            `, [activityId]);

            if (!activity) {
                return BaseController.error(res, '活動不存在', 404);
            }

            return BaseController.success(res, activity, '獲取活動成功');

        } catch (error) {
            console.error('獲取活動錯誤:', error);
            return BaseController.error(res, '獲取活動失敗', 500);
        }
    });

    /**
     * 創建活動
     */
    static createActivity = BaseController.asyncHandler(async (req, res) => {
        const { title, description, activity_date, location, status } = req.body;
        const userId = req.user?.id;

        if (!title || !description || !activity_date) {
            return BaseController.error(res, '請填寫必要欄位', 400);
        }

        try {
            const result = await DatabaseHelper.run(`
                INSERT INTO secretary_activities (title, description, activity_date, location, status, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [title, description, activity_date, location, status || 'planned', userId]);

            return BaseController.success(res, { id: result.lastID }, '活動創建成功', 201);

        } catch (error) {
            console.error('創建活動錯誤:', error);
            return BaseController.error(res, '創建活動失敗', 500);
        }
    });

    /**
     * 更新活動
     */
    static updateActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);
        const { title, description, activity_date, location, status } = req.body;

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            const result = await DatabaseHelper.run(`
                UPDATE secretary_activities 
                SET title = ?, description = ?, activity_date = ?, location = ?, status = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [title, description, activity_date, location, status, activityId]);

            if (result.changes === 0) {
                return BaseController.error(res, '活動不存在', 404);
            }

            return BaseController.success(res, null, '活動更新成功');

        } catch (error) {
            console.error('更新活動錯誤:', error);
            return BaseController.error(res, '更新活動失敗', 500);
        }
    });

    /**
     * 刪除活動
     */
    static deleteActivity = BaseController.asyncHandler(async (req, res) => {
        const activityId = BaseController.validateId(req.params.id);

        if (!activityId) {
            return BaseController.error(res, '無效的活動 ID', 400);
        }

        try {
            const result = await DatabaseHelper.run('DELETE FROM secretary_activities WHERE id = ?', [activityId]);

            if (result.changes === 0) {
                return BaseController.error(res, '活動不存在', 404);
            }

            return BaseController.success(res, null, '活動刪除成功');

        } catch (error) {
            console.error('刪除活動錯誤:', error);
            return BaseController.error(res, '刪除活動失敗', 500);
        }
    });
}

module.exports = SecretaryController;