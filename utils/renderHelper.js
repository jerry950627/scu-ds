/**
 * 渲染輔助工具
 * 統一頁面渲染邏輯，消除重複代碼
 */

const config = require('../config/app');

/**
 * 生成頁面標題
 * @param {string} pageTitle 頁面標題
 * @returns {string} 完整標題
 */
function generateTitle(pageTitle) {
    return `${pageTitle} - ${config.app.name}`;
}

/**
 * 渲染頁面的統一方法
 * @param {Object} res 響應對象
 * @param {string} template 模板名稱
 * @param {string} pageTitle 頁面標題
 * @param {Object} additionalData 額外數據
 */
function renderPage(res, template, pageTitle, additionalData = {}) {
    const defaultData = {
        title: generateTitle(pageTitle),
        user: res.locals.user,
        isLoggedIn: res.locals.isLoggedIn
    };
    
    const renderData = { ...defaultData, ...additionalData };
    res.render(template, renderData);
}

/**
 * 渲染錯誤頁面
 * @param {Object} res 響應對象
 * @param {string} errorMessage 錯誤信息
 * @param {number} statusCode 狀態碼
 */
function renderError(res, errorMessage, statusCode = 500) {
    res.status(statusCode).render('error', {
        title: generateTitle('錯誤'),
        error: errorMessage,
        user: res.locals.user,
        isLoggedIn: res.locals.isLoggedIn
    });
}

/**
 * 頁面配置映射
 */
const pageConfigs = {
    dashboard: { template: 'dashboard', title: '儀表板' },
    finance: { template: 'finance', title: '財務管理' },
    secretary: { template: 'secretary', title: '秘書處' },
    activity: { template: 'activity', title: '活動管理' },
    design: { template: 'design', title: '設計部' },
    pr: { template: 'pr', title: '公關部' },
    history: { template: 'history', title: '歷史記錄' },
    admin: { template: 'admin', title: '系統管理' },
    login: { template: 'index', title: '登入' }
};

/**
 * 根據頁面名稱渲染頁面
 * @param {Object} res 響應對象
 * @param {string} pageName 頁面名稱
 * @param {Object} additionalData 額外數據
 */
function renderPageByName(res, pageName, additionalData = {}) {
    const config = pageConfigs[pageName];
    if (!config) {
        return renderError(res, '頁面不存在', 404);
    }
    
    renderPage(res, config.template, config.title, additionalData);
}

module.exports = {
    generateTitle,
    renderPage,
    renderError,
    renderPageByName,
    pageConfigs
};