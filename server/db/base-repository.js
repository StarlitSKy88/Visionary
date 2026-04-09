/**
 * Base Repository - 数据访问抽象基类
 * 所有 Repository 继承此类，通过统一的存储适配器接口访问数据
 */

class BaseRepository {
  /**
   * @param {object} store - 存储适配器（sql.js / future PG / memory）
   */
  constructor(store) {
    this._store = store
  }

  /**
   * 获取底层存储实例
   */
  get store() {
    return this._store
  }

  /**
   * 执行写操作并持久化
   */
  _run(sql, params = []) {
    return this._store.run(sql, params)
  }

  /**
   * 查询单条记录
   * @returns {object|null}
   */
  _queryOne(sql, params = [], jsonFields = []) {
    return this._store.queryOne(sql, params, jsonFields)
  }

  /**
   * 查询多条记录
   * @returns {object[]}
   */
  _queryList(sql, params = [], jsonFields = []) {
    return this._store.queryList(sql, params, jsonFields)
  }

  /**
   * 获取最后插入的行 ID
   */
  _lastInsertId() {
    return this._store.lastInsertId()
  }
}

module.exports = BaseRepository
