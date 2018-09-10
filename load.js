const fsp = require('fs').promises
const path = require('path')
const _ = require('lodash')

const WadParser = require('./WadParser')

function createFolderStructure(paths) {
  return paths.reduce((structure, path, i) => {
    _.set(structure, path.split('\\').filter(Boolean), i)
    return structure
  }, {})
}

const pathFormatter = path => _.trimStart(path, '\\').replace(/\\/g, '/')

async function load(dir) {
  const files = await fsp.readdir(dir)
  return Promise.all(
    files
      .filter(filename => path.extname(filename).toLowerCase() === '.wad')
      .map(filename => path.join(dir, filename))
      .map(async filename => ({
        filename,
        buffer: await fsp.readFile(filename)
      }))
      .map(async wad => {
        const resolved = await wad
        return {
          ...resolved,
          ...WadParser.parse(await resolved.buffer)
        }
      })
      .map(async wad => {
        const { relativePaths, absolutePaths, ...resolved } = await wad
        return {
          ...resolved,
          relativePaths: relativePaths.map(pathFormatter),
          absolutePaths: absolutePaths.map(pathFormatter),
          relativeStructure: createFolderStructure(relativePaths),
          absoluteStructure: createFolderStructure(absolutePaths)
        }
      })
  )
}

module.exports = load
