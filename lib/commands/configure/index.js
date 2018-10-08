#!/usr/bin/env node

const moment = require('moment')
const { prompt } = require('inquirer')

function getUpdatedConfig (content, configuration) {
  const { clusters } = content
  const filteredClusters = clusters.filter(({ alias }) => {
    return alias !== configuration.alias
  })

  configuration.updatedAt = moment().format()
  filteredClusters.push(configuration)
  content.clusters = filteredClusters

  return content
}

module.exports = async (options, { identification }) => {
  try {
    const configFileInitialContent = { clusters: [] }
    const questions = {
      configuration: [
        { name: 'url', message: 'OpenShift URL:' },
        { name: 'token', message: 'OpenShift token:' },
        { name: 'alias', message: 'Identification alias (will replace configuration if duplicated):' }
      ]
    }

    if (!identification.getConfigFile()) {
      identification.saveConfigFile(configFileInitialContent)
    }

    const configuration = await prompt(questions.configuration)
    const updatedConfiguration = getUpdatedConfig(identification.getConfigInfo(), configuration)

    identification.saveConfigFile(updatedConfiguration)
  } catch (e) {
    throw e
  }
}
