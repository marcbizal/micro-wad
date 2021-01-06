const url = require('url')
const path = require('path')
const https = require('https')

const MultiProgress = require('multi-progress')

const S3 = require('aws-sdk/clients/s3')

const getCredentialsFromEnv = env => ({
  accessKeyId: env.S3_KEY,
  secretAccessKey: env.S3_SECRET,
  region: env.S3_REGION
})

function getParamsArrayFromEnv(env) {
  const { WAD_BUCKET: wadBucket } = env
  if (!wadBucket) return []

  return Object.entries(env)
    .filter(([key]) => key.match(/WAD_\d/))
    .map(([_, wadKey]) => ({ Bucket: wadBucket, Key: wadKey }))
}

const credentials = getCredentialsFromEnv(process.env)
const paramsArray = getParamsArrayFromEnv(process.env)
const s3 = new S3(credentials)

const getSignedUrlPromise = (operation, params) =>
  new Promise((resolve, reject) => {
    s3.getSignedUrl(operation, params, (err, url) =>
      err ? reject(err) : resolve(url)
    )
  })

function downloadWithProgressBar(downloadUrl, multi) {
  const parsed = url.parse(downloadUrl)
  const filename = path.basename(parsed.pathname)
  return new Promise((resolve, reject) => {
    const req = https.request(downloadUrl)

    req.on('response', res => {
      const data = []
      const length = parseInt(res.headers['content-length'], 10)

      const bar = multi.newBar(
        `Downloading ${filename} [:bar] :percent :etas`,
        {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: length
        }
      )

      res.on('data', chunk => {
        data.push(chunk)
        bar.tick(chunk.length)
      })

      res.on('end', () => {
        const buffer = Buffer.concat(data)
        resolve({ filename, buffer })
      })

      res.on('error', reject)
    })

    req.end()
  })
}

function loadFromAws() {
  const multi = new MultiProgress(process.stderr)
  return Promise.all(
    paramsArray.map(async params => {
      const signedUrl = await getSignedUrlPromise('getObject', params)
      return downloadWithProgressBar(signedUrl, multi)
    })
  )
}

module.exports = loadFromAws
