#!/usr/bin/env node

const { flatten, isEmpty } = require('lodash')
const Table = require('cli-table')

function getFormattedResourceString (resourceObject) {
  let output = []

  if (resourceObject.requests) {
    output.push(
      `Req.: ${resourceObject.requests.cpu || 'N/A'} / ${resourceObject.requests.memory || 'N/A'}`
    )
  }
  if (resourceObject.limits) {
    output.push(
      `Lim.: ${resourceObject.limits.cpu || 'N/A'} / ${resourceObject.limits.memory || 'N/A'}`
    )
  }

  return output.join(' - ')
}

module.exports = async (options, { os, ns }) => {
  try {
    const { resourcesNames } = options
    const namespaces = ns.namespaceList
    const resourcesCheckingPromises = flatten(namespaces.map(namespace => {
      return resourcesNames.map(resourceName => {
        return os.checkResources(namespace, resourceName)
      })
    }))

    Promise.all(resourcesCheckingPromises).then(responses => {
      const table = new Table({
        head: ['Project', 'Application', 'Build Resources', 'Container Resources (CPU/Memory)'],
        colWidths: [38, 22, 40, 40]
      })

      responses.forEach(({ namespace, name, buildConfigResources, deploymentConfigResources }) => {
        table.push([
          namespace,
          name,
          !isEmpty(buildConfigResources)
            ? getFormattedResourceString(buildConfigResources)
            : 'N/A',
          !isEmpty(deploymentConfigResources)
            ? getFormattedResourceString(deploymentConfigResources)
            : 'N/A'
        ])
      })

      process.stdout.write(`${table.toString()}\n`)
    })
  } catch (e) {
    throw e
  }
}
