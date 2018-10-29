#!/usr/bin/env node

const { flatten } = require('lodash')
const Table = require('cli-table')

module.exports = async (options, { os, ns }) => {
  try {
    const { resourcesNames } = options
    const namespaces = ns.namespaceList
    const refCheckingPromises = flatten(namespaces.map(namespace => {
      return resourcesNames.map(resourceName => {
        return os.changeSourceRef(namespace, resourceName)
      })
    }))

    Promise.all(refCheckingPromises).then(responses => {
      const table = new Table({
        head: ['Project', 'Application', 'Source Reference'],
        colWidths: [42, 32, 32]
      })

      responses.forEach(({ data }) => {
        table.push([
          data.metadata.namespace,
          data.metadata.name,
          data.spec.source.git.ref
        ])
      })

      process.stdout.write(`${table.toString()}\n`)
    })
  } catch (e) {
    throw e
  }
}
