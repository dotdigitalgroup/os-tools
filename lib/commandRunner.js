const OpenShiftService = require('./services/openshift')
const IdentityConfigurationService = require('./services/identity')

module.exports = {
  run: async (commandName, options) => {
    try {
      const services = {}
      const identityService = new IdentityConfigurationService()

      services.identification = identityService

      if (commandName !== 'configure') {
        const { url, token } = identityService.getConfigInfo()

        services.os = new OpenShiftService(url, token)
      }

      await require(`./commands/${commandName}`)(options, services)
    } catch (e) {
      process.stderr.write(`${e.message}\n`)
      process.exit(127)
    }
  }
}
