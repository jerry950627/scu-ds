/**
 * 統一的資料庫查詢工具
 * 提供標準化的 Promise 方法
 */
class DatabaseHelper {
  /**
   * 獲取數據庫實例
   * @returns {Database} 數據庫實例
   */
  static getDb() {
    if (!global.db) {
      throw new Error('數據庫未初始化，請先調用 initializeDatabase()');
    }
    return global.db;
  }

  /**
   * 執行查詢並返回單一結果
   * @param {string} sql - SQL 查詢語句
   * @param {Array} params - 查詢參數
   * @returns {Promise<Object|null>} 查詢結果
   */
  static async get(sql, params = []) {
    try {
      const db = this.getDb();
      return await db.get(sql, params);
    } catch (error) {
      console.error('Database GET error:', error);
      throw error;
    }
  }

  /**
   * 執行查詢並返回所有結果
   * @param {string} sql - SQL 查詢語句
   * @param {Array} params - 查詢參數
   * @returns {Promise<Array>} 查詢結果陣列
   */
  static async all(sql, params = []) {
    try {
      const db = this.getDb();
      return await db.all(sql, params);
    } catch (error) {
      console.error('Database ALL error:', error);
      throw error;
    }
  }

  /**
   * 執行插入、更新或刪除操作
   * @param {string} sql - SQL 語句
   * @param {Array} params - 參數
   * @returns {Promise<Object>} 包含 lastID 和 changes 的結果
   */
  static async run(sql, params = []) {
    try {
      const db = this.getDb();
      return await db.run(sql, params);
    } catch (error) {
      console.error('Database RUN error:', error);
      throw error;
    }
  }

  /**
   * 檢查記錄是否存在
   * @param {string} table - 表名
   * @param {string} column - 欄位名
   * @param {any} value - 值
   * @returns {Promise<boolean>} 是否存在
   */
  static async exists(table, column, value) {
    try {
      const result = await this.get(`SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`, [value]);
      return !!result;
    } catch (error) {
      console.error('Database EXISTS error:', error);
      throw error;
    }
  }

  /**
   * 獲取記錄數量
   * @param {string} table - 表名
   * @param {string} whereClause - WHERE 條件（可選）
   * @param {Array} params - 參數（可選）
   * @returns {Promise<number>} 記錄數量
   */
  static async count(table, whereClause = '', params = []) {
    try {
      const sql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
      const result = await this.get(sql, params);
      return result ? result.count : 0;
    } catch (error) {
      console.error('Database COUNT error:', error);
      throw error;
    }
  }

  /**
   * 事務處理
   * @param {Function} callback - 事務回調函數
   * @returns {Promise<any>} 事務結果
   */
  static async transaction(callback) {
    try {
      await this.run('BEGIN TRANSACTION');
      const result = await callback(this);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * 批量插入操作
   * @param {string} table - 表名
   * @param {Array} columns - 欄位名陣列
   * @param {Array} values - 值的二維陣列
   * @returns {Promise<Object>} 插入結果
   */
  static async batchInsert(table, columns, values) {
    if (!values || values.length === 0) {
      throw new Error('No values provided for batch insert');
    }

    const placeholders = '(' + columns.map(() => '?').join(', ') + ')';
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
    
    return await this.transaction(async (db) => {
      const results = [];
      for (const valueSet of values) {
        const result = await db.run(sql, valueSet);
        results.push(result);
      }
      return results;
    });
  }

  /**
   * 批量刪除操作
   * @param {string} table - 表名
   * @param {string} column - 條件欄位
   * @param {Array} values - 值陣列
   * @returns {Promise<Object>} 刪除結果
   */
  static async batchDelete(table, column, values) {
    if (!values || values.length === 0) {
      return { changes: 0 };
    }

    const placeholders = values.map(() => '?').join(', ');
    const sql = `DELETE FROM ${table} WHERE ${column} IN (${placeholders})`;
    
    return await this.run(sql, values);
  }

  /**
   * 更新或插入操作 (UPSERT)
   * @param {string} table - 表名
   * @param {Object} data - 資料物件
   * @param {Array} conflictColumns - 衝突檢查欄位
   * @returns {Promise<Object>} 操作結果
   */
  static async upsert(table, data, conflictColumns) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    const updateClause = columns
      .filter(col => !conflictColumns.includes(col))
      .map(col => `${col} = excluded.${col}`)
      .join(', ');
    
    const sql = `
       INSERT INTO ${table} (${columns.join(', ')}) 
       VALUES (${placeholders})
       ON CONFLICT(${conflictColumns.join(', ')}) 
       DO UPDATE SET ${updateClause}
     `;
     
     return await this.run(sql, values);
   }
 }

module.exports = DatabaseHelper;