'use strict'

const Hemera = require('nats-hemera')
const HemeraArangoStore = require('./../index')
const HemeraJoi = require('hemera-joi')
const Code = require('code')
const Nats = require('nats')
const HemeraTestsuite = require('hemera-testsuite')
const Arangojs = require('arangojs')

const expect = Code.expect

describe('Hemera-arango-store', function() {
  let PORT = 6242
  var natsUrl = 'nats://localhost:' + PORT

  let server
  let arangoOptions = {
    url: 'http://root:@127.0.0.1:8529/'
  }
  let hemera
  let aql
  let arangodb
  let testDatabase = 'test'
  let testCollection = 'testColl'

  function clearArangodb() {
    arangodb.useDatabase('_system')

    return arangodb.listUserDatabases().then(names => {
      return Promise.all(
        names
          .filter(f => f.indexOf('system') < 0)
          .map(x => arangodb.dropDatabase(x))
      )
    })
  }

  function bootstrapArangodb() {
    return arangodb.createDatabase(testDatabase).then(() => {
      arangodb.useDatabase(testDatabase)
      return arangodb.collection(testCollection).create()
    })
  }

  before(function(done) {
    arangodb = Arangojs(arangoOptions)

    // clear and bootstrap db
    clearArangodb()
      .then(bootstrapArangodb)
      .then(() => {
        server = HemeraTestsuite.start_server(PORT, () => {
          const nats = Nats.connect(natsUrl)
          hemera = new Hemera(nats, {
            crashOnFatal: false,
            logLevel: 'silent'
          })
          hemera.use(HemeraJoi)
          hemera.use(HemeraArangoStore, {
            arango: {
              url: arangoOptions.url,
              databaseName: testDatabase
            }
          })
          hemera.ready(function() {
            aql = hemera.aqlTemplate
            done()
          })
        })
      })
      .catch(done)
  })

  after(function() {
    // clear arangodb and kill gnats and hemera
    return clearArangodb().then(() => {
      hemera.close()
      server.kill()
    })
  })

  it('Create database', function(done) {
    const testDb = 'testdb'

    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'createDatabase',
        name: testDb
      },
      (err, resp) => {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp.result).to.be.equals(true)

        done()
      }
    )
  })

  it('Create edge collection', function(done) {
    const testCollection = 'payments'

    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'createCollection',
        type: 'edge',
        name: testCollection,
        databaseName: testDatabase
      },
      (err, resp) => {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp.name).to.be.equals(testCollection)

        done()
      }
    )
  })

  it('Create collection', function(done) {
    const testCollection = 'users'

    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'createCollection',
        name: testCollection,
        databaseName: testDatabase
      },
      (err, resp) => {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp.name).to.be.equals(testCollection)

        done()
      }
    )
  })

  it('Execute AQL Query with one result', function(done) {
    const user = {
      name: 'olaf'
    }

    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'executeAqlQuery',
        type: 'one',
        databaseName: testDatabase,
        query: aql`INSERT ${user} INTO testColl return NEW`
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()

        done()
      }
    )
  })

  it('Execute AQL Query with multiple returns', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'executeAqlQuery',
        type: 'all',
        databaseName: testDatabase,
        query: `
            FOR u IN testColl
            RETURN u
            `
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.array()

        done()
      }
    )
  })

  it('Execute Transaction', function(done) {
    var action = String(function() {
      return true
    })

    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'executeTransaction',
        databaseName: testDatabase,
        action,
        params: {
          age: 12
        },
        collections: {
          read: 'users'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()

        expect(resp).to.be.equals(true)

        done()
      }
    )
  })

  it('create', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'peter'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        done()
      }
    )
  })

  it('update', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'peter'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        hemera.act(
          {
            topic: 'arango-store',
            cmd: 'update',
            collection: testCollection,
            databaseName: testDatabase,
            data: {
              name: 'klaus'
            },
            query: {
              name: 'peter'
            }
          },
          function(err, resp) {
            expect(err).to.be.not.exists()
            expect(resp).to.be.an.object()

            done()
          }
        )
      }
    )
  })

  it('updatebyId', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'peter'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        hemera.act(
          {
            topic: 'arango-store',
            cmd: 'updateById',
            collection: testCollection,
            databaseName: testDatabase,
            data: {
              name: 'klaus'
            },
            id: resp._id
          },
          function(err, resp) {
            expect(err).to.be.not.exists()
            expect(resp).to.be.an.object()

            done()
          }
        )
      }
    )
  })

  it('remove', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'olaf'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        hemera.act(
          {
            topic: 'arango-store',
            cmd: 'remove',
            collection: testCollection,
            databaseName: testDatabase,
            query: {
              name: 'olaf'
            }
          },
          function(err, resp) {
            expect(err).to.be.not.exists()
            expect(resp).to.be.an.object()
            expect(resp.deleted).to.be.an.equals(2)

            done()
          }
        )
      }
    )
  })

  it('removeById', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'olaf'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        hemera.act(
          {
            topic: 'arango-store',
            cmd: 'removeById',
            collection: testCollection,
            databaseName: testDatabase,
            id: resp._id
          },
          function(err, resp) {
            expect(err).to.be.not.exists()
            expect(resp).to.be.an.object()
            expect(resp.deleted).to.be.an.equals(1)

            done()
          }
        )
      }
    )
  })

  it('findById', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'jens'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        hemera.act(
          {
            topic: 'arango-store',
            cmd: 'findById',
            collection: testCollection,
            databaseName: testDatabase,
            id: resp._id
          },
          function(err, resp) {
            expect(err).to.be.not.exists()
            expect(resp).to.be.an.object()

            done()
          }
        )
      }
    )
  })

  it('find', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'jens'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        hemera.act(
          {
            topic: 'arango-store',
            cmd: 'find',
            collection: testCollection,
            databaseName: testDatabase,
            query: {}
          },
          function(err, resp) {
            expect(err).to.be.not.exists()
            expect(resp).to.be.an.array()
            done()
          }
        )
      }
    )
  })

  it('replace', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'nadine'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        hemera.act(
          {
            topic: 'arango-store',
            cmd: 'replace',
            collection: testCollection,
            databaseName: testDatabase,
            data: {
              name: 'chris'
            },
            query: {
              name: 'nadine'
            }
          },
          function(err, resp) {
            expect(err).to.be.not.exists()
            expect(resp).to.be.an.object()

            done()
          }
        )
      }
    )
  })

  it('replaceById', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'nadja'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        hemera.act(
          {
            topic: 'arango-store',
            cmd: 'replaceById',
            collection: testCollection,
            databaseName: testDatabase,
            data: {
              name: 'nadja'
            },
            id: resp._id
          },
          function(err, resp) {
            expect(err).to.be.not.exists()
            expect(resp).to.be.an.object()

            done()
          }
        )
      }
    )
  })

  it('count', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'nadja'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        hemera.act(
          {
            topic: 'arango-store',
            cmd: 'count',
            collection: testCollection,
            databaseName: testDatabase,
            query: {}
          },
          function(err, resp) {
            expect(err).to.be.not.exists()
            expect(resp).to.be.a.number()

            done()
          }
        )
      }
    )
  })

  it('exists', function(done) {
    hemera.act(
      {
        topic: 'arango-store',
        cmd: 'create',
        collection: testCollection,
        databaseName: testDatabase,
        data: {
          name: 'nadja'
        }
      },
      function(err, resp) {
        expect(err).to.be.not.exists()
        expect(resp).to.be.an.object()
        expect(resp._id).to.be.a.string()

        hemera.act(
          {
            topic: 'arango-store',
            cmd: 'exists',
            collection: testCollection,
            databaseName: testDatabase,
            query: {
              _id: resp._id
            }
          },
          function(err, resp) {
            expect(err).to.be.not.exists()
            expect(resp).to.be.a.true()

            done()
          }
        )
      }
    )
  })
})
