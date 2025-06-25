# 東吳大學資料科學系系學會管理系統

## 項目簡介

這是一個為東吳大學資料科學系系學會設計的綜合管理系統，提供財務管理、會議記錄、活動管理、公關宣傳、設計管理等功能。

## 功能特色

### 🔐 用戶認證系統
- 安全的登入/登出功能
- 基於 Session 的身份驗證
- 角色權限管理（管理員/普通用戶）

### 💰 財務管理
- 收入/支出記錄管理
- 財務摘要統計
- 收據文件上傳
- 財務報表導出（CSV格式）
- 批量財務記錄處理

### 📝 秘書處功能
- 會議記錄管理
- 活動記錄管理
- 文件附件上傳
- 記錄查詢和編輯

### 🎨 設計部門
- 設計作品管理
- 多格式文件支持（AI、PSD、SVG等）
- 設計資源庫

### 📢 公關宣傳
- 宣傳活動管理
- 媒體資源管理
- 宣傳效果追蹤

### 🎯 活動管理
- 活動企劃管理
- 活動執行記錄
- 活動文件管理

### 📊 歷史記錄
- 完整的操作歷史
- 數據備份和恢復
- 統計分析功能

## 技術架構

### 後端技術
- **Node.js** - 服務器運行環境
- **Express.js** - Web 應用框架
- **SQLite3** - 輕量級數據庫
- **multer** - 文件上傳處理
- **express-session** - 會話管理

### 前端技術
- **靜態HTML** - 前端頁面
- **HTML5/CSS3** - 用戶界面
- **JavaScript** - 前端交互
- **Bootstrap** - 響應式設計框架

### 數據庫設計
- **users** - 用戶信息表
- **financial_records** - 財務記錄表
- **meeting_records** - 會議記錄表
- **activity_records** - 活動記錄表
- **departments** - 部門信息表
- **user_departments** - 用戶部門關聯表

## 安裝和部署

### 環境要求
- Node.js >= 14.0.0
- npm >= 6.0.0

### 安裝步驟

1. **克隆項目**
   ```bash
   git clone https://github.com/scu-ds/management-system.git
   cd scu_ds
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **初始化數據庫**
   ```bash
   npm run init-db
   ```

4. **啟動服務器**
   ```bash
   # 生產環境
   npm start
   
   # 開發環境（自動重啟）
   npm run dev
   ```

5. **訪問系統**
   打開瀏覽器訪問：http://localhost:3000

### 預設用戶
系統會自動創建以下預設用戶：
- **管理員**: `admin` / `admin123`
- **測試用戶**: `jerry` / `jerry123`
- **系學會**: `scuds` / `scuds123`

## 使用指南

### 登入系統
1. 訪問系統首頁
2. 輸入用戶名和密碼
3. 點擊登入按鈕

### 財務管理
1. 登入後點擊「財務管理」
2. 可以查看財務摘要
3. 新增收入/支出記錄
4. 上傳收據文件
5. 導出財務報表

### 會議記錄
1. 進入「秘書處」模塊
2. 點擊「會議記錄」
3. 新增會議記錄
4. 上傳會議文件
5. 編輯或刪除記錄

### 活動管理
1. 進入「活動管理」模塊
2. 創建新活動
3. 上傳活動企劃書
4. 記錄活動執行情況

## 開發指南

### 項目結構
```
scu_ds/
├── database/           # 數據庫相關文件
│   ├── db.js          # 數據庫連接和初始化
│   └── scu_ds.db      # SQLite 數據庫文件
├── public/            # 靜態資源
│   ├── css/           # 樣式文件
│   ├── js/            # 前端 JavaScript
│   ├── images/        # 圖片資源
│   └── uploads/       # 上傳文件目錄
├── routes/            # 路由處理
│   ├── auth.js        # 認證路由
│   ├── finance.js     # 財務路由
│   ├── secretary.js   # 秘書處路由
│   └── ...            # 其他路由
├── utils/             # 工具模塊
│   ├── dbHelper.js    # 數據庫輔助工具
│   ├── errorHandler.js # 錯誤處理工具
│   └── uploadConfig.js # 文件上傳配置
├── public/views/      # 靜態HTML文件
├── server.js          # 主服務器文件
└── package.json       # 項目配置
```

### 開發腳本
```bash
# 啟動開發服務器
npm run dev

# 運行測試
npm test
npm run test:login
npm run test:debug

# 代碼格式化
npm run format

# 代碼檢查
npm run lint

# 數據庫備份
npm run backup-db
```

### API 接口

#### 認證接口
- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/logout` - 用戶登出
- `GET /auth/check` - 檢查登入狀態
- `POST /api/auth/register` - 用戶註冊

#### 財務接口
- `GET /api/finance/summary` - 獲取財務摘要
- `GET /api/finance/records` - 獲取財務記錄
- `POST /api/finance/records` - 新增財務記錄
- `PUT /api/finance/records/:id` - 更新財務記錄
- `DELETE /api/finance/records/:id` - 刪除財務記錄
- `GET /api/finance/export` - 導出財務記錄

#### 秘書處接口
- `GET /api/secretary/meetings` - 獲取會議記錄
- `POST /api/secretary/meetings` - 新增會議記錄
- `PUT /api/secretary/meetings/:id` - 更新會議記錄
- `DELETE /api/secretary/meetings/:id` - 刪除會議記錄

## 安全特性

### 數據安全
- 密碼使用 bcrypt 加密存儲
- SQL 注入防護
- 文件上傳類型限制
- 會話安全管理

### 權限控制
- 基於角色的訪問控制
- API 接口權限驗證
- 資源訪問權限檢查

### 錯誤處理
- 統一的錯誤處理機制
- 詳細的錯誤日誌記錄
- 用戶友好的錯誤提示

## 部署建議

### 生產環境
1. 使用 PM2 進行進程管理
2. 配置 Nginx 反向代理
3. 設置 HTTPS 證書
4. 定期備份數據庫
5. 監控系統性能

### 環境變量
```bash
# 設置生產環境
NODE_ENV=production

# 設置會話密鑰
SESSION_SECRET=your-secret-key

# 設置端口
PORT=3000
```

## 故障排除

### 常見問題

1. **服務器無法啟動**
   - 檢查端口是否被占用
   - 確認 Node.js 版本兼容性
   - 檢查依賴是否正確安裝

2. **數據庫連接失敗**
   - 確認數據庫文件權限
   - 檢查數據庫文件路徑
   - 重新初始化數據庫

3. **文件上傳失敗**
   - 檢查上傳目錄權限
   - 確認文件大小限制
   - 驗證文件類型支持

4. **登入問題**
   - 確認用戶名密碼正確
   - 檢查會話配置
   - 清除瀏覽器緩存

### 日誌查看
系統會在控制台輸出詳細的運行日誌，包括：
- 請求日誌
- 錯誤日誌
- 數據庫操作日誌
- 文件上傳日誌

## 貢獻指南

1. Fork 項目
2. 創建功能分支
3. 提交更改
4. 推送到分支
5. 創建 Pull Request

## 版本歷史

- **v1.0.0** - 初始版本發布
  - 基本的用戶認證系統
  - 財務管理功能
  - 會議記錄管理
  - 活動管理功能

## 許可證

本項目採用 MIT 許可證 - 詳見 [LICENSE](LICENSE) 文件

## 聯繫方式

- 項目維護者：東吳大學資料科學系系學會
- 問題反饋：[GitHub Issues](https://github.com/scu-ds/management-system/issues)
- 電子郵件：scuds@example.com

## 致謝

感謝所有為這個項目做出貢獻的開發者和東吳大學資料科學系的支持。

---

**注意**：這是一個學生組織管理系統，請在使用前仔細閱讀文檔並進行適當的安全配置。