'use strict'
// **Github:** https://github.com/toajs/toa
//
// **License:** MIT
/*global describe, it */

var fs = require('fs')
var Stream = require('stream')
var assert = require('assert')
var request = require('supertest')
var toa = require('../..')
var context = require('../context')

if (!Stream.prototype.listenerCount) {
  Stream.prototype.listenerCount = function (type) {
    return require('events').EventEmitter.listenerCount(this, type)
  }
}

describe('catch stream error', function () {
  it('should auto catch stream for body', function () {
    var ctx = context()
    var stream = new Stream.Readable()
    assert.strictEqual(stream.listenerCount('error'), 0)
    ctx.body = stream
    assert.strictEqual(stream.listenerCount('error'), 1)
    assert.strictEqual(stream.listeners('error')[0], stream.toaCleanHandle)
    stream.toaCleanHandle()
    assert.strictEqual(stream.listenerCount('error'), 1)
    assert.strictEqual(stream.listeners('error')[0], ctx.onerror)
  })

  it('should not add more listeners after multi called', function () {
    var ctx = context()
    var stream = new Stream.Readable()
    assert.strictEqual(stream.listenerCount('error'), 0)
    stream.on('error', ctx.onerror)
    assert.strictEqual(stream.listenerCount('error'), 1)

    ctx.body = stream
    ctx.body = stream
    assert.strictEqual(stream.listenerCount('error'), 1)
    assert.strictEqual(stream.listeners('error')[0], stream.toaCleanHandle)

    ctx.catchStream(stream)
    assert.strictEqual(stream.listenerCount('error'), 1)
    assert.strictEqual(stream.listeners('error')[0], stream.toaCleanHandle)

    stream.toaCleanHandle()
    assert.strictEqual(stream.listenerCount('error'), 1)
    assert.strictEqual(stream.listeners('error')[0], ctx.onerror)
  })

  it('should respond success', function () {
    var app = toa(function () {
      this.type = 'text'
      this.body = this.catchStream(fs.createReadStream(__dirname + '/catchStream.js', {
        encoding: 'utf8'
      }))
    })

    return request(app.listen())
      .get('/')
      .expect(200)
  })

  it('should respond 404', function () {
    var app = toa(function () {
      this.type = 'text'
      this.body = this.catchStream(fs.createReadStream(__dirname + '/none.js', {
        encoding: 'utf8'
      }))
    })

    return request(app.listen())
      .get('/')
      .expect(404)
      .expect(function (res) {
        assert.strictEqual(res.res.statusMessage || res.res.text, 'Not Found')
      })
  })
})
