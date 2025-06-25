/**
 * 中間件配置文件
 * 統一管理應用的中間件設置
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('../config/app');

/**
 * 設置應用中間件
 * @param {Express} app Express 應用實例
 */
function setupMiddleware(app) {
    // 基本中間件
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(express.static(path.join(__dirname, '..', 'public')));
    
    // 會話中間件
    app.use(session(config.session));
    
    // 移除EJS模板引擎設定，改用靜態HTML檔案
    
    // 移除全局中間件 - 用戶信息（不再需要res.locals）
    
    console.log('✅ 中間件配置完成');
}

module.exports = setupMiddleware;