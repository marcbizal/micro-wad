const fs = require('fs')
const path = require('path')

function recursiveSync(dir) {
  let list = []
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filepath = path.join(dir, file)
    const stats = fs.lstatSync(filepath)
    if (stats.isDirectory()) {
      list = list.concat(recursiveSync(filepath))
    } else {
      list.push(filepath)
    }
  })

  return list
}

module.exports = recursiveSync
