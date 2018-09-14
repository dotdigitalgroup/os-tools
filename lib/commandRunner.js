const OpenShiftService = require('./services/openshift')
const IdentityConfigurationService = require('./services/identity')

module.exports = {
  run: async (commandName, options) => {
    try {
      const commandArgs = [ options ]
      const identityService = new IdentityConfigurationService()

      commandArgs.push({ identification: identityService })

      if (commandName !== 'configure') {
        const { url, token } = identityService.getConfigInfo()

        commandArgs.push({
          os: new OpenShiftService(url, token)
        })
      }

      await require(`./commands/${commandName}`)(...commandArgs)
    } catch (e) {
      process.stderr.write(`${e.message}\n`)
      process.exit(127)
    }
  }
}
