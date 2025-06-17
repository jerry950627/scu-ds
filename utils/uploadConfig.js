const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * 統一的檔案上傳配置
 * 解決多處定義不同 multer 配置的問題
 */
class UploadConfig {
  /**
   * 建立基本的檔案上傳配置
   * @param {string} department - 部門名稱 (finance, secretary, pr, design, activity, general)
   * @param {Object} options - 額外選項
   * @returns {multer.Multer} multer 實例
   */
  static createUpload(department = 'general', options = {}) {
    const {
      fileSize = 10 * 1024 * 1024, // 預設 10MB
      allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/,
      allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ],
      customMimeTypes = []
    } = options;

    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, `../public/uploads/${department}`);
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const prefix = department === 'secretary' ? 'meeting-' : file.fieldname + '-';
        cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
      }
    });

    return multer({
      storage: storage,
      limits: {
        fileSize: fileSize
      },
      fileFilter: function (req, file, cb) {
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const allMimeTypes = [...allowedMimeTypes, ...customMimeTypes];
        const mimetypeValid = allMimeTypes.includes(file.mimetype) || 
                             file.mimetype.startsWith('image/');

        if (mimetypeValid && extname) {
          return cb(null, true);
        } else {
          console.log('檔案被拒絕:', {
            filename: file.originalname,
            mimetype: file.mimetype,
            extname: path.extname(file.originalname).toLowerCase()
          });
          cb(new Error(`不支援的檔案格式。您上傳的檔案類型：${file.mimetype}`));
        }
      }
    });
  }

  /**
   * 設計部門專用的檔案上傳配置
   * 支援更多設計相關檔案格式
   */
  static createDesignUpload() {
    return this.createUpload('design', {
      allowedTypes: /jpeg|jpg|png|gif|svg|pdf|ai|psd|doc|docx/,
      allowedMimeTypes: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml',
        'application/pdf',
        'application/postscript', // .ai files
        'image/vnd.adobe.photoshop', // .psd files
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    });
  }

  /**
   * 用戶頭像上傳配置
   */
  static createUserPhotoUpload() {
    return this.createUpload('users', {
      fileSize: 5 * 1024 * 1024, // 5MB 限制
      allowedTypes: /jpeg|jpg|png|gif/,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    });
  }
}

// 為了向後兼容，匯出具體的上傳函數

/**
 * 單檔案上傳中間件
 * @param {string} type - 檔案類型 (IMAGE, DOCUMENT, ACTIVITY等)
 * @param {string} fieldName - 表單欄位名稱
 * @returns {Function} multer 中間件
 */
function singleUpload(type, fieldName) {
  let department = 'general';
  let options = {};
  
  // 根據類型設定部門和選項
  switch (type) {
    case 'IMAGE':
      department = 'images';
      options = {
        fileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: /jpeg|jpg|png|gif/,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      };
      break;
    case 'DOCUMENT':
      department = 'documents';
      options = {
        fileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: /pdf|doc|docx|xls|xlsx|txt/,
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain'
        ]
      };
      break;
    case 'ACTIVITY':
      department = 'activity';
      options = {
        fileSize: 8 * 1024 * 1024, // 8MB
        allowedTypes: /jpeg|jpg|png|gif|pdf/,
        allowedMimeTypes: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
          'application/pdf'
        ]
      };
      break;
    default:
      department = 'general';
  }
  
  const upload = UploadConfig.createUpload(department, options);
  return upload.single(fieldName);
}

/**
 * 多檔案上傳中間件
 * @param {string} type - 檔案類型
 * @param {string} fieldName - 表單欄位名稱
 * @param {number} maxCount - 最大檔案數量
 * @returns {Function} multer 中間件
 */
function multipleUpload(type, fieldName, maxCount = 5) {
  let department = 'general';
  let options = {};
  
  // 根據類型設定部門和選項
  switch (type) {
    case 'IMAGE':
      department = 'images';
      options = {
        fileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: /jpeg|jpg|png|gif/,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      };
      break;
    case 'DOCUMENT':
      department = 'documents';
      options = {
        fileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: /pdf|doc|docx|xls|xlsx|txt/,
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain'
        ]
      };
      break;
    default:
      department = 'general';
  }
  
  const upload = UploadConfig.createUpload(department, options);
  return upload.array(fieldName, maxCount);
}

module.exports = {
  UploadConfig,
  singleUpload,
  multipleUpload
};