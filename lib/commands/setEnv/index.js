#!/usr/bin/env node

const { prompt } = require('inquirer')
const { getVariablesObject } = require('../../utils/misc')

module.exports = async (options, { os, ns }) => {
  try {
    const { resourceType, resourceName, variable } = options
    const variables = getVariablesObject(variable)
    const namespaces = ns.namespaceList
    const { prepareResource } = os.getHelper('resourceHandling')
    const configPromises = namespaces.map(namespace => {
      return os.getResource(namespace, resourceType, resourceName)
    })
    const configurations = await Promise.all(configPromises)
    const updatedConfigurations = configurations.map(({ data }) => {
      return prepareResource(data, variables, resourceType)
    })
    const answers = await prompt([
      { name: 'updateVars', message: 'Update variables?', type: 'confirm' }
    ])

    if (answers.updateVars) {
      const updatePromises = updatedConfigurations.map(config => {
        return os.updateResource(
          config.metadata.namespace,
          resourceType,
          resourceName,
          config
        )
      })

      await Promise.all(updatePromises)
    }
  } catch (e) {
    throw e
  }
}
