/**
 * 文件系統工具
 * 統一管理目錄創建和文件系統操作
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/app');

/**
 * 初始化上傳目錄
 * @param {string} baseDir 基礎目錄路徑
 */
function initializeDirectories(baseDir = __dirname + '/../') {
    console.log('🗂️  正在初始化目錄結構...');
    
    config.upload.directories.forEach(dir => {
        const fullPath = path.join(baseDir, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`📁 創建目錄: ${fullPath}`);
        }
    });
    
    console.log('✅ 目錄結構初始化完成');
}

/**
 * 檢查文件是否存在
 * @param {string} filePath 文件路徑
 * @returns {boolean} 文件是否存在
 */
function fileExists(filePath) {
    return fs.existsSync(filePath);
}

/**
 * 創建目錄（如果不存在）
 * @param {string} dirPath 目錄路徑
 */
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 創建目錄: ${dirPath}`);
    }
}

/**
 * 獲取文件大小
 * @param {string} filePath 文件路徑
 * @returns {number} 文件大小（字節）
 */
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        console.error(`獲取文件大小失敗: ${filePath}`, error);
        return 0;
    }
}

/**
 * 刪除文件
 * @param {string} filePath 文件路徑
 * @returns {boolean} 是否成功刪除
 */
function deleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️  刪除文件: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`刪除文件失敗: ${filePath}`, error);
        return false;
    }
}

module.exports = {
    initializeDirectories,
    fileExists,
    ensureDirectoryExists,
    getFileSize,
    deleteFile
};