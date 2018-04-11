'use strict'

const Hp = require('hemera-plugin')
const Arangojs = require('arangojs')
const ArangoStore = require('./store')
const StorePattern = require('hemera-store/pattern')

function hemeraArangoStore(hemera, opts, done) {
  const topic = 'arango-store'

  hemera.decorate('arango', Arangojs)
  hemera.decorate('aql', Arangojs.aql)

  const arangodb = new Arangojs.Database(opts.database)
  const Joi = hemera.joi

  const getDb = req => req.database || opts.database.name

  /**
   * Create a new database
   */
  hemera.add(
    {
      topic,
      cmd: 'createDatabase',
      name: Joi.string().required(),
      users: Joi.array().optional()
    },
    function(req) {
      let db = arangodb.useDatabase('_system')
      return db.createDatabase(req.name, req.users)
    }
  )

  /**
   * Execute a transaction
   */
  hemera.add(
    {
      topic,
      cmd: 'executeTransaction',
      collections: Joi.object().required(),
      action: Joi.string().required(),
      params: Joi.object().optional(),
      lockTimeout: Joi.object().optional()
    },
    function(req) {
      let db = arangodb.useDatabase(getDb(req))

      let action = String(req.action)

      return db.transaction(
        req.collections,
        action,
        req.params,
        req.lockTimeout
      )
    }
  )

  /**
   * Create a new collection
   */
  hemera.add(
    {
      topic,
      cmd: 'createCollection',
      name: Joi.string().required(),
      type: Joi.any()
        .allow(['edge', ''])
        .default(''),
      database: Joi.string().optional()
    },
    function(req) {
      let db = arangodb.useDatabase(getDb(req))

      let collection

      if (req.type === 'edge') {
        collection = db.edgeCollection(req.name)
      } else {
        collection = db.collection(req.name)
      }

      return collection.create()
    }
  )

  /**
   * Execute a AQL query and return the first result
   */
  hemera.add(
    {
      topic,
      type: 'one',
      cmd: 'executeAqlQuery',
      database: Joi.string().optional(),
      variables: Joi.object().optional()
    },
    function(req) {
      let db = arangodb.useDatabase(getDb(req))

      return db.query(req.query, req.variables).then(cursor => {
        return cursor.next()
      })
    }
  )

  /**
   * Execute a AQL query and return all results
   */
  hemera.add(
    {
      topic,
      type: 'all',
      cmd: 'executeAqlQuery',
      database: Joi.string().optional(),
      variables: Joi.object().optional()
    },
    function(req) {
      let db = arangodb.useDatabase(getDb(req))

      return db.query(req.query, req.variables).then(cursor => {
        return cursor.all()
      })
    }
  )
  hemera.add(StorePattern.create(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.create(req)
  })
  hemera.add(StorePattern.update(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.update(req, req.data)
  })
  hemera.add(StorePattern.updateById(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.updateById(req, req.data)
  })
  hemera.add(StorePattern.remove(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.remove(req)
  })
  hemera.add(StorePattern.removeById(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.removeById(req)
  })
  hemera.add(StorePattern.replace(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.replace(req, req.data)
  })
  hemera.add(StorePattern.replaceById(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.replaceById(req, req.data)
  })
  hemera.add(StorePattern.findById(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.findById(req)
  })
  hemera.add(StorePattern.find(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.find(req, req.options)
  })
  hemera.add(StorePattern.count(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.count(req, req.options)
  })
  hemera.add(StorePattern.exists(topic), function(req) {
    let db = arangodb.useDatabase(getDb(req))

    const store = new ArangoStore(db)

    return store.exists(req, req.options)
  })
  done()
}

module.exports = Hp(hemeraArangoStore, {
  hemera: '>=5.0.0',
  name: require('./package.json').name,
  dependencies: ['hemera-joi'],
  decorators: ['joi'],
  options: {
    database: {}
  }
})
