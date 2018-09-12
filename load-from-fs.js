const fsp = require('fs').promises
const path = require('path')

const dir = path.join(__dirname, 'data')
async function loadFromFs() {
  const files = await fsp.readdir(dir)
  return Promise.all(
    files
      .filter(filename => path.extname(filename).toLowerCase() === '.wad')
      .map(filename => path.join(dir, filename))
      .map(async filename => ({
        filename,
        buffer: await fsp.readFile(filename)
      }))
  )
}

module.exports = loadFromFs
