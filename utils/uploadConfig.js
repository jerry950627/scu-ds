const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * 檔案上傳配置
 * 支援多種格式檔案上傳
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
      allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|txt/,
      allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ]
    } = options;

    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, `../public/uploads/${department}`);
        console.log('📁 創建上傳目錄:', uploadPath);
        
        try {
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
            console.log('✅ 目錄創建成功:', uploadPath);
          } else {
            console.log('✅ 目錄已存在:', uploadPath);
          }
          cb(null, uploadPath);
        } catch (error) {
          console.error('❌ 創建目錄失敗:', error);
          cb(error);
        }
      },
      filename: function (req, file, cb) {
        try {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const fileExt = path.extname(file.originalname);
          const prefix = department === 'secretary' ? 'meeting-' : 
                        department === 'documents' ? 'receipt-' :
                        file.fieldname + '-';
          const filename = prefix + uniqueSuffix + fileExt;
          
          console.log('📝 生成檔案名稱:', filename, '原始檔名:', file.originalname);
          cb(null, filename);
        } catch (error) {
          console.error('❌ 生成檔案名稱失敗:', error);
          cb(error);
        }
      }
    });

    return multer({
      storage: storage,
      limits: {
        fileSize: fileSize,
        fieldSize: 1 * 1024 * 1024 // 1MB field size limit
      },
      fileFilter: function (req, file, cb) {
        console.log('🔍 檢查檔案:', {
          filename: file.originalname,
          mimetype: file.mimetype,
          fieldname: file.fieldname
        });
        
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetypeValid = allowedMimeTypes.includes(file.mimetype);

        if (mimetypeValid && extname) {
          console.log('✅ 檔案驗證通過');
          return cb(null, true);
        } else {
          console.error('❌ 檔案被拒絕:', {
            filename: file.originalname,
            mimetype: file.mimetype,
            extname: path.extname(file.originalname).toLowerCase(),
            allowedTypes: allowedTypes.toString(),
            allowedMimeTypes
          });
          cb(new Error(`不支援的檔案格式。檔案: ${file.originalname}, 類型: ${file.mimetype}。允許的格式：${allowedMimeTypes.join(', ')}`));
        }
      }
    });
  }

  /**
   * 設計部門專用的檔案上傳配置
   */
  static createDesignUpload() {
    return this.createUpload('design', {
      allowedTypes: /jpeg|jpg|png|gif|svg/,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml']
    });
  }

  /**
   * 用戶頭像上傳配置
   */
  static createUserPhotoUpload() {
    return this.createUpload('users', {
      fileSize: 5 * 1024 * 1024, // 5MB 限制
      allowedTypes: /jpeg|jpg|png/,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png']
    });
  }

  /**
   * 初始化所有必要的上傳目錄
   */
  static initializeDirectories() {
    const baseUploadPath = path.join(__dirname, '../public/uploads');
    const directories = [
      'general', 'documents', 'images', 'activity', 'design', 
      'secretary', 'pr', 'finance', 'users', 'reports', 'temp'
    ];

    console.log('🗂️ 初始化上傳目錄...');
    
    // 創建基礎目錄
    if (!fs.existsSync(baseUploadPath)) {
      fs.mkdirSync(baseUploadPath, { recursive: true });
      console.log('📁 創建基礎目錄:', baseUploadPath);
    }

    // 創建各部門子目錄
    directories.forEach(dir => {
      const dirPath = path.join(baseUploadPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log('📁 創建子目錄:', dirPath);
      }
    });

    console.log('✅ 上傳目錄初始化完成');
  }
}

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
        allowedTypes: /jpeg|jpg|png|gif|svg/,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml']
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
  
  // 確保目錄存在
  UploadConfig.initializeDirectories();
  
  const upload = UploadConfig.createUpload(department, options);
  
  // 返回包裝的中間件，加入錯誤處理
  return (req, res, next) => {
    const middleware = upload.single(fieldName);
    middleware(req, res, (error) => {
      if (error) {
        console.error('❌ 檔案上傳錯誤:', error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: '檔案大小超過限制',
            maxSize: Math.round(options.fileSize / 1024 / 1024) + 'MB'
          });
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            error: '不預期的檔案欄位'
          });
        } else {
          return res.status(400).json({
            success: false,
            error: error.message || '檔案上傳失敗'
          });
        }
      }
      
      if (req.file) {
        console.log('✅ 檔案上傳成功:', {
          originalname: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          path: req.file.path
        });
      }
      
      next();
    });
  };
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
        allowedTypes: /jpeg|jpg|png|gif|svg/,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml']
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
  
  // 確保目錄存在
  UploadConfig.initializeDirectories();
  
  const upload = UploadConfig.createUpload(department, options);
  
  // 返回包裝的中間件，加入錯誤處理
  return (req, res, next) => {
    const middleware = upload.array(fieldName, maxCount);
    middleware(req, res, (error) => {
      if (error) {
        console.error('❌ 多檔案上傳錯誤:', error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: '檔案大小超過限制',
            maxSize: Math.round(options.fileSize / 1024 / 1024) + 'MB'
          });
        } else if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: `檔案數量超過限制（最多${maxCount}個檔案）`
          });
        } else {
          return res.status(400).json({
            success: false,
            error: error.message || '檔案上傳失敗'
          });
        }
      }
      
      if (req.files && req.files.length > 0) {
        console.log(`✅ ${req.files.length} 個檔案上傳成功`);
        req.files.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.originalname} -> ${file.filename}`);
        });
      }
      
      next();
    });
  };
}

// 在模組載入時初始化目錄
UploadConfig.initializeDirectories();

module.exports = {
  UploadConfig,
  singleUpload,
  multipleUpload
};