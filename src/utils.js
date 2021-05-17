const fs = require('fs');

const createFolder = function (path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}

module.exports = {
  createFolder
}