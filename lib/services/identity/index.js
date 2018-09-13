const homedir = require('os').homedir()
const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')

module.exports = class IdentityConfigurationService {
  constructor () {
    this.configFilePath = join(homedir, '.ostoolkitrc')
  }

  getConfigFile () {
    try {
      return readFileSync(this.configFilePath, 'utf8')
    } catch (e) {
      return null
    }
  }

  saveConfigFile (content) {
    try {
      writeFileSync(this.configFilePath, `${JSON.stringify(content)}\n`, 'utf8')
    } catch (e) {
      throw e
    }
  }

  getConfigInfo () {
    try {
      return JSON.parse(readFileSync(this.configFilePath, 'utf8'))
    } catch (e) {
      throw e
    }
  }
}
