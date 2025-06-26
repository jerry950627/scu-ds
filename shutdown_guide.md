# 伺服器優雅關閉指南

## 🎯 修正完成

✅ **已修正的問題：**
- Windows 環境下的信號處理問題
- 優雅關閉超時機制
- 資料庫連接正確關閉
- 事件監聽器清理

## 🚀 如何正常關閉伺服器

### 方法一：使用 Ctrl+C (推薦)
```bash
# 啟動伺服器
node server.js

# 按 Ctrl+C 優雅關閉
# 會顯示以下日誌：
# 🔔 接收到 SIGINT 信號 (Ctrl+C)
# 🔄 收到 SIGINT 信號，開始優雅關閉...
# 📡 停止接受新請求...
# ✅ HTTP 服務器已關閉
# 🗄️ 關閉數據庫連接...
# ✅ 數據庫連接已關閉
# 🚀 應用程序已優雅關閉
```

### 方法二：發送信號 (替代方案)
```bash
# 查找進程ID
Get-Process | Where-Object {$_.ProcessName -eq "node"}

# 嘗試優雅關閉 (可能需要強制關閉)
taskkill /PID [進程ID]

# 強制關閉 (如果優雅關閉失敗)
taskkill /PID [進程ID] /F
```

## 🔧 關閉機制特點

- **自動超時**: 5秒後強制退出，避免無限等待
- **資料庫安全**: 正確關閉SQLite連接
- **事件清理**: 移除所有事件監聽器
- **跨平台**: Windows 和 Unix/Linux 相容

## 🧪 測試優雅關閉

執行測試腳本：
```bash
node test_graceful_shutdown.js
```

然後按 Ctrl+C 觀察優雅關閉日誌。

## ⚠️ 注意事項

1. 在Windows環境下，建議使用 Ctrl+C 而不是 taskkill
2. 如果優雅關閉卡住，5秒後會自動強制退出
3. 資料庫操作會在關閉前完成，確保數據完整性 