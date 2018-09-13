const homedir = require('os').homedir()
const { readFileSync } = require('fs')
const { join } = require('path')
const configFilePath = join(homedir, '.ostoolkitrc')
const OpenShiftService = require('./services/openshift')
const IdentityConfigurationService = require('./services/identity')

module.exports = {
  run: async (commandName, options) => {
    try {
      const commandArgs = [ options ]

      commandArgs.push({ identification: new IdentityConfigurationService() })

      if (commandName !== 'configure') {
        const { url, token } = JSON.parse(readFileSync(configFilePath))

        commandArgs.push({ os: new OpenShiftService(url, token) })
      }

      await require(`./commands/${commandName}`)(...commandArgs)
    } catch (e) {
      process.stderr.write(`${e.message}\n`)
      process.exit(127)
    }
  }
}
