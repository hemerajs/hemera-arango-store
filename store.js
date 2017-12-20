'use strict'

const Store = require('hemera-store')

/**
 *
 *
 * @class ArangoStore
 * @extends {Store}
 */
class ArangoStore extends Store {
  /**
   *
   *
   * @param {any} req
   *
   * @memberOf ArangoStore
   */
  create(req) {
    return this._driver.collection(req.collection).save(req.data)
  }

  /**
   *
   *
   * @param {any} req
   *
   * @memberOf ArangoStore
   */
  remove(req) {
    return this._driver.collection(req.collection).removeByExample(req.query)
  }

  /**
   *
   *
   * @param {any} req
   * @param {any} cb
   *
   * @memberOf ArangoStore
   */
  removeById(req) {
    return this._driver
      .collection(req.collection)
      .removeByExample({ _id: req.id })
  }

  /**
   *
   *
   * @param {any} req
   * @param {any} data
   *
   * @memberOf ArangoStore
   */
  update(req, data) {
    return this._driver
      .collection(req.collection)
      .updateByExample(req.query, data)
  }

  /**
   *
   *
   * @param {any} req
   * @param {any} data
   *
   * @memberOf ArangoStore
   */
  updateById(req, data) {
    return this._driver
      .collection(req.collection)
      .updateByExample({ _id: req.id }, data)
  }

  /**
   *
   *
   * @param {any} req
   * @param {any} options
   * @returns
   * @memberof ArangoStore
   */
  find(req, options) {
    return this._driver
      .collection(req.collection)
      .byExample(req.query)
      .then(cursor => {
        return cursor.all()
      })
  }

  /**
   *
   *
   * @param {any} req
   *
   * @memberOf ArangoStore
   */
  findById(req) {
    return this._driver
      .collection(req.collection)
      .byExample({ _id: req.id })
      .then(cursor => {
        return cursor.next()
      })
  }

  /**
   *
   *
   * @param {any} req
   * @param {any} data
   * @returns
   * @memberof ArangoStore
   */
  replace(req, data) {
    return this._driver
      .collection(req.collection)
      .replaceByExample(req.query, data)
  }

  /**
   *
   *
   * @param {any} req
   * @param {any} data
   * @returns
   * @memberof ArangoStore
   */
  replaceById(req, data) {
    return this._driver
      .collection(req.collection)
      .replaceByExample({ _id: req.id }, data)
  }
}

module.exports = ArangoStore
