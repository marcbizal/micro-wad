const { Parser } = require('binary-parser')

const filenameParser = Parser.start().string('', {
  zeroTerminated: true
})

const fileParser = Parser.start()
  .endianess('little')
  .uint32('version')
  .uint32('size')
  .skip(4)
  .uint32('offset')

const wadParser = Parser.start()
  .endianess('little')
  .string('magic', { length: 4, assert: 'WWAD' })
  .uint32('count')
  .array('relativePaths', {
    type: filenameParser,
    length: 'count'
  })
  .array('absolutePaths', {
    type: filenameParser,
    length: 'count'
  })
  .array('files', {
    type: fileParser,
    length: 'count'
  })

module.exports = wadParser
