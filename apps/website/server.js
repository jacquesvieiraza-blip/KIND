const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html',
  setHeaders: (res, filePath) => {
    // HTML must always revalidate so deploys show up immediately (no stale
    // markup behind the CDN/browser cache). Static assets keep long caching.
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate')
    }
  }
}))

app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate')
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`KIND website running on port ${PORT}`)
})
