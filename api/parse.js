const { Parser } = require('binary-parser')
const _ = require('lodash')

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

function createFolderStructure(paths) {
  return paths.reduce((structure, path, i) => {
    _.set(structure, path.split('\\').filter(Boolean), i)
    return structure
  }, {})
}

const pathFormatter = path => _.trimStart(path, '\\').replace(/\\/g, '/')

const parse = wads =>
  wads
    .map(wad => {
      return {
        ...wad,
        ...wadParser.parse(wad.buffer)
      }
    })
    .map(wad => {
      const { relativePaths, absolutePaths, ...rest } = wad
      return {
        ...rest,
        relativePaths: relativePaths.map(pathFormatter),
        absolutePaths: absolutePaths.map(pathFormatter),
        relativeStructure: createFolderStructure(relativePaths),
        absoluteStructure: createFolderStructure(absolutePaths)
      }
    })

module.exports = parse
