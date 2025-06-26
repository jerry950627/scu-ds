-- 東吳大學資料科學系系學會管理系統 - 資料庫初始化腳本
-- 創建時間: 2024年
-- 版本: 1.0

-- 啟用外鍵約束
PRAGMA foreign_keys = ON;

-- 用戶表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'member',
    full_name VARCHAR(100),
    student_id VARCHAR(20),
    phone VARCHAR(20),
    department VARCHAR(50) DEFAULT '資料科學系',
    grade INTEGER,
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 財務記錄表
CREATE TABLE IF NOT EXISTS finance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(50),
    date DATE NOT NULL,
    notes TEXT,
    receipt_url VARCHAR(255),
    created_by INTEGER,
    approved_by INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- 活動企劃表
CREATE TABLE IF NOT EXISTS event_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE,
    location VARCHAR(200),
    budget DECIMAL(10,2),
    participant_limit INTEGER,
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    file_size INTEGER,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'completed')),
    created_by INTEGER,
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- 活動細流表
CREATE TABLE IF NOT EXISTS activity_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_plan_id INTEGER,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    file_size INTEGER,
    order_index INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_plan_id) REFERENCES event_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 秘書處文件表
CREATE TABLE IF NOT EXISTS secretary_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    document_type VARCHAR(50),
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    file_size INTEGER,
    is_public BOOLEAN DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 設計部作品表
CREATE TABLE IF NOT EXISTS design_works (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    work_type VARCHAR(50),
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    file_size INTEGER,
    thumbnail_url VARCHAR(255),
    tags TEXT, -- JSON格式儲存標籤
    is_featured BOOLEAN DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 公關部活動表
CREATE TABLE IF NOT EXISTS pr_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    activity_type VARCHAR(50),
    target_audience VARCHAR(100),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10,2),
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    file_size INTEGER,
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 公關部廠商表
CREATE TABLE IF NOT EXISTS pr_vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    description TEXT,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 系統日誌表
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values TEXT, -- JSON格式
    new_values TEXT, -- JSON格式
    ip_address VARCHAR(45),
    user_agent TEXT,
    data TEXT, -- JSON格式儲存額外資料
    module TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 活動日誌表（用於記錄用戶操作）
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 操作歷史表（用於歷史控制器）
CREATE TABLE IF NOT EXISTS operation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    operation_type VARCHAR(100) NOT NULL,
    description TEXT,
    details TEXT, -- JSON格式
    target_id INTEGER,
    target_type VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 登入歷史表
CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT 1,
    fail_reason VARCHAR(200),
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 會議記錄表
CREATE TABLE IF NOT EXISTS meeting_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_type VARCHAR(50),
    location VARCHAR(200),
    attendees TEXT, -- JSON格式儲存參與者
    agenda TEXT,
    minutes TEXT,
    decisions TEXT,
    action_items TEXT, -- JSON格式
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT 0,
    related_table VARCHAR(50),
    related_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_finance_records_date ON finance_records(date);
CREATE INDEX IF NOT EXISTS idx_finance_records_type ON finance_records(type);
CREATE INDEX IF NOT EXISTS idx_event_plans_status ON event_plans(status);
CREATE INDEX IF NOT EXISTS idx_event_plans_date ON event_plans(event_date);
CREATE INDEX IF NOT EXISTS idx_activity_details_event_plan_id ON activity_details(event_plan_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_operation_history_user_id ON operation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_history_created_at ON operation_history(created_at);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_time ON login_history(login_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_pr_vendors_name ON pr_vendors(name);
CREATE INDEX IF NOT EXISTS idx_pr_vendors_category ON pr_vendors(category);
CREATE INDEX IF NOT EXISTS idx_pr_vendors_status ON pr_vendors(status);

-- 創建觸發器以自動更新 updated_at 欄位
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_finance_records_timestamp 
    AFTER UPDATE ON finance_records
    BEGIN
        UPDATE finance_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_event_plans_timestamp 
    AFTER UPDATE ON event_plans
    BEGIN
        UPDATE event_plans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_activity_details_timestamp 
    AFTER UPDATE ON activity_details
    BEGIN
        UPDATE activity_details SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_secretary_documents_timestamp 
    AFTER UPDATE ON secretary_documents
    BEGIN
        UPDATE secretary_documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_design_works_timestamp 
    AFTER UPDATE ON design_works
    BEGIN
        UPDATE design_works SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_pr_activities_timestamp 
    AFTER UPDATE ON pr_activities
    BEGIN
        UPDATE pr_activities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_pr_vendors_timestamp 
    AFTER UPDATE ON pr_vendors
    BEGIN
        UPDATE pr_vendors SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_meeting_records_timestamp 
    AFTER UPDATE ON meeting_records
    BEGIN
        UPDATE meeting_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 插入預設管理員帳號
-- 注意：這些預設密碼應該在首次登入後修改
INSERT OR IGNORE INTO users (username, password_hash, email, role, full_name, student_id, department, is_active) VALUES
('admin', '$2b$12$8KXjZVOJZhPQXFiQk8LZL.qNuEQcEJFmT6fZuMgNGrDGGzJGxOLCa', 'admin@scu.edu.tw', 'admin', '系統管理員', 'ADMIN001', '資料科學系', 1),
('scuds13173149', '$2b$12$7eGtYPdP5TQ2lRMGzF6MSOKKm4pPZaFPDwN0LUXJg9QdFbdWfQUbS', 'scuds13173149@scu.edu.tw', 'admin', '系學會管理員', 'SCU13173149', '資料科學系', 1),
('jerry', '$2b$12$2iKmNQwLWGnQV3bRAqNzJOkfkJjrLgOCCcuKfRZTKBwYTQeOHfhAm', 'jerry@scu.edu.tw', 'admin', 'Jerry', 'JERRY001', '資料科學系', 1),
('secretary', '$2b$12$8KXjZVOJZhPQXFiQk8LZL.qNuEQcEJFmT6fZuMgNGrDGGzJGxOLCa', 'secretary@scu.edu.tw', 'secretary', '秘書處', 'SEC001', '資料科學系', 1),
('finance', '$2b$12$8KXjZVOJZhPQXFiQk8LZL.qNuEQcEJFmT6fZuMgNGrDGGzJGxOLCa', 'finance@scu.edu.tw', 'finance', '財務部', 'FIN001', '資料科學系', 1),
('activity', '$2b$12$8KXjZVOJZhPQXFiQk8LZL.qNuEQcEJFmT6fZuMgNGrDGGzJGxOLCa', 'activity@scu.edu.tw', 'activity', '活動部', 'ACT001', '資料科學系', 1),
('design', '$2b$12$8KXjZVOJZhPQXFiQk8LZL.qNuEQcEJFmT6fZuMgNGrDGGzJGxOLCa', 'design@scu.edu.tw', 'design', '設計部', 'DES001', '資料科學系', 1),
('pr', '$2b$12$8KXjZVOJZhPQXFiQk8LZL.qNuEQcEJFmT6fZuMgNGrDGGzJGxOLCa', 'pr@scu.edu.tw', 'pr', '公關部', 'PR001', '資料科學系', 1);

-- 插入範例財務分類
INSERT OR IGNORE INTO finance_records (title, description, amount, type, category, date, created_by, status) VALUES
('期初預算', '學期初始預算', 50000.00, 'income', '預算', date('now'), 1, 'approved'),
('辦公用品採購', '購買文具用品', -1500.00, 'expense', '辦公用品', date('now'), 1, 'approved');

-- 完成初始化
INSERT OR IGNORE INTO system_logs (action, table_name, new_values, ip_address) VALUES
('DATABASE_INIT', 'system', '{"message": "資料庫初始化完成", "version": "1.0"}', '127.0.0.1');