/**
 * 中間件配置文件
 * 統一管理應用的中間件設置
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./app');

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
    
    // 視圖引擎設置
    app.set('view engine', config.views.engine);
    app.set('views', path.join(__dirname, '..', config.views.directory));
    app.engine('html', require('ejs').renderFile);
    
    // 全局中間件 - 用戶信息
    app.use((req, res, next) => {
        if (req.session) {
            res.locals.user = req.session.user || null;
            res.locals.isLoggedIn = !!req.session.user;
        } else {
            res.locals.user = null;
            res.locals.isLoggedIn = false;
        }
        next();
    });
    
    console.log('✅ 中間件配置完成');
}

module.exports = setupMiddleware;