const _ = require('lodash')

function castPath(path) {
  if (_.isArray(path)) return path
  if (_.isString(path))
    return path.split(/[.[\]]/g).filter(token => !_.isEmpty(token))
  return undefined
}

function baseGetInsensitive(object, path) {
  path = castPath(path)

  if (_.isEmpty(path)) return object

  const head = _.head(path)
  const pair = _.toPairs(object).find(
    ([key]) => key.toLowerCase() === head.toLowerCase()
  )

  return pair ? baseGetInsensitive(pair[1], _.drop(path)) : undefined
}

function getInsensitive(object, path, defaultValue) {
  const result = _.isNull(object) ? undefined : baseGetInsensitive(object, path)
  return result === undefined ? defaultValue : result
}

module.exports = getInsensitive
