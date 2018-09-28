const { prompt } = require('inquirer')
const { getNamespacesAliases } = require('./utils/misc')
const OpenShiftService = require('./services/openshift')
const IdentityConfigurationService = require('./services/identity')
const QueueService = require('./services/queue')

module.exports = {
  run: async (commandName, options) => {
    try {
      const services = {}
      const identityService = new IdentityConfigurationService()

      services.identification = identityService

      if (['info', 'configure'].indexOf(commandName) < 0) {
        const { url, token } = identityService.getConfigInfo()

        services.os = new OpenShiftService(url, token)

        const projects = await services.os.getAllProjects()
        const namespaces = getNamespacesAliases(projects, options.namespaceRegex)
        const namespaceList = namespaces.map(namespace => `${namespace}`)

        services.ns = { namespaceList }
        services.queue = new QueueService()

        process.stdout.write(`The following namespaces will be affected by this operation:\n\n`)
        process.stdout.write(`${namespaceList.map(e => `  ${e}`).join('\n')}\n\n`)

        const { executeCommand } = await prompt([{
          name: 'executeCommand',
          message: `Execute "${commandName}" command?`,
          type: 'confirm',
          default: false
        }])

        if (executeCommand) {
          await require(`./commands/${commandName}`)(options, services)
        }
      } else {
        await require(`./commands/${commandName}`)(options, services)
      }
    } catch (e) {
      process.stderr.write(`${e.message}\n`)
      process.exit(127)
    }
  }
}
