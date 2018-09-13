// Disable ESLint rule for import assignment, `now-env` only runs on import.
// eslint-disable-next-line import/no-unassigned-import
require('now-env')

const dev = process.env.NODE_ENV !== 'production'
const now = process.env.NOW

const path = require('path')

const _ = require('lodash')

const { send } = require('micro')
const compress = require('micro-compress')

const UrlPattern = require('url-pattern')
const prettyBytes = require('pretty-bytes')
const debug = require('debug')('wad')

const removeEndSlash = require('./remove-end-slash')
const load = dev || now ? require('./load-from-fs') : require('./load-from-aws')
const parse = require('./parse')

const wadPattern = new UrlPattern('/api/:strategy(/*)')
let wads = []

function getFile(wadId, fileId) {
  const wad = wads[wadId]
  let slice = null
  if (wad) {
    const fileDescriptor = wad.files[fileId]
    if (fileDescriptor) {
      const { offset, size } = fileDescriptor

      // This is our actual target file
      // as specified by the file description
      slice = wad.buffer.slice(offset, offset + size)
    }
  }
  return slice
}

function main(req, res, parsedUrl) {
  const { pathname, query } = parsedUrl
  const wadParams = wadPattern.match(pathname)
  if (wadParams) {
    const { strategy } = wadParams

    const requestPath = _.get(wadParams, '_', '')
    const tokenizedRequestPath = requestPath.split('/').filter(Boolean)

    if (!requestPath && query.find) {
      const { find } = query
      const found = _.chain(wads)
        .map((wad, wadIndex) =>
          _.chain(wad)
            .get(strategy === 'abs' ? 'absolutePaths' : 'relativePaths')
            .map(
              (path, fileIndex) =>
                path.toLowerCase().indexOf(find.toLowerCase()) >= 0
                  ? { path, wadIndex, fileIndex }
                  : null
            )
            .filter(Boolean)
            .value()
        )
        .flatten()
        .value()

      send(res, 200, found)
      return
    }

    // An item is either a File ID or an object representing a directory
    const items = wads
      .map(wad =>
        _.get(
          wad,
          strategy === 'abs' ? 'absoluteStructure' : 'relativeStructure'
        )
      )
      .map(structure =>
        _.get(
          structure,
          tokenizedRequestPath,
          _.isEmpty(tokenizedRequestPath) ? structure : null
        )
      )

    // If all of the items are null, this means that
    // the file or directory wasn't found
    if (_.every(items, item => item === null)) {
      send(res, 404, 'FILE NOT FOUND')
      return
    }

    // If the type of any of the items is a number
    // this means that we found an index for a file description
    const wadId = _.findIndex(items, item => typeof item === 'number')
    if (wadId >= 0) {
      const fileId = items[wadId]
      const slice = getFile(wadId, fileId)

      const requestBasename = path.basename(requestPath)
      const requestExt = path.extname(requestPath).toLowerCase()

      // If the requested file has a '.bmp' extension,
      // add a content dispositition and content type
      // so that our file can be rendered by the browser
      if (requestExt === '.bmp') {
        res.setHeader(
          'Content-disposition',
          `inline; filename='${requestBasename}'`
        )
        res.setHeader('Content-type', 'image/bmp')
      }

      const textTypes = ['.cfg', '.txt']
      if (textTypes.includes(requestExt)) {
        res.setHeader(
          'Content-disposition',
          `inline; filename='${requestBasename}'`
        )
        res.setHeader('Content-type', 'text/plain')
      }

      debug(`Sending %s: %s`, requestBasename, prettyBytes(slice.length))
      send(res, 200, slice)
      return
    }

    if (_.some(items, item => typeof item === 'object')) {
      const list = _.uniq(
        items.reduce((acc, cur) => _.concat(acc, _.keys(cur)), [])
      )
      send(res, 200, list)
      return
    }
  }

  send(res, 404, 'NOT FOUND')
}

async function setup(handler) {
  wads = parse(await load())
  debug(`${wads.length} WADs loaded to memory`)
  wads.forEach(({ filename, buffer, files }) =>
    debug(
      `'%s' is %s and has %d files`,
      path.basename(filename),
      prettyBytes(buffer.length),
      files.length
    )
  )
  debug(`Ready to serve.`)

  return compress(removeEndSlash(handler))
}

module.exports = setup(main)
