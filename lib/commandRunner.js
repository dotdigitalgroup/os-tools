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
        const { clusters } = identityService.getConfigInfo()
        const clustersEntries = clusters.map(({ alias, url }) => {
          return {
            name: `${url} (${alias})`,
            value: alias
          }
        })
        let clusterAlias = options.environmentAlias
        let autoExecute = false

        if (!clusterAlias) {
          const envPromptResponse = await prompt([{
            name: 'clusterAlias',
            type: 'list',
            message: 'Which cluster do you want to use?',
            choices: clustersEntries
          }])

          clusterAlias = envPromptResponse.clusterAlias
        } else {
          autoExecute = true
        }

        const { url, token } = clusters.find(({ alias }) => alias === clusterAlias)

        services.os = new OpenShiftService(url, token)

        const projects = await services.os.getAllProjects()
        const namespaces = getNamespacesAliases(projects, options.namespaceRegex)
        let namespaceList = namespaces

        if (options.ignore && options.ignore.length) {
          namespaceList = namespaceList.filter(ns => {
            return options.ignore.indexOf(ns) < 0
          })
        }

        if (!namespaceList.length) {
          throw new Error('ERROR: No namespace was found with the provided regex.')
        }

        services.ns = { namespaceList }
        services.queue = new QueueService()

        if (autoExecute) {
          if (options.repeat) {
            setInterval(async () => {
              await require(`./commands/${commandName}`)(options, services)
            }, options.repeat * 1000)
          } else {
            await require(`./commands/${commandName}`)(options, services)
          }
        } else {
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
        }
      } else {
        await require(`./commands/${commandName}`)(options, services)
      }
    } catch (e) {
      if (e.response) {
        process.stderr.write(`${e.response.data.message}\n`)
      } else {
        process.stderr.write(`${e.stack}\n`)
      }

      process.exit(127)
    }
  }
}
