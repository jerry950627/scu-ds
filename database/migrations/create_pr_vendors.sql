-- 創建公關部廠商表
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

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_pr_vendors_name ON pr_vendors(name);
CREATE INDEX IF NOT EXISTS idx_pr_vendors_category ON pr_vendors(category);
CREATE INDEX IF NOT EXISTS idx_pr_vendors_status ON pr_vendors(status);

-- 創建觸發器
CREATE TRIGGER IF NOT EXISTS update_pr_vendors_timestamp 
    AFTER UPDATE ON pr_vendors
    BEGIN
        UPDATE pr_vendors SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 插入一些範例廠商數據
INSERT OR IGNORE INTO pr_vendors (name, contact_person, phone, email, category, created_by) VALUES
('東吳印刷廠', '張經理', '02-1234-5678', 'zhang@printing.com', '印刷服務', 1),
('活動策劃公司', '李主任', '02-2345-6789', 'li@events.com', '活動策劃', 1),
('攝影工作室', '王攝影師', '02-3456-7890', 'wang@photo.com', '攝影服務', 1),
('文具用品店', '陳老闆', '02-4567-8901', 'chen@supplies.com', '文具用品', 1),
('餐飲服務', '林經理', '02-5678-9012', 'lin@catering.com', '餐飲服務', 1);