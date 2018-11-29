#!/usr/bin/env node

const { flatten } = require('lodash')
const Table = require('cli-table')

module.exports = async (options, { os, ns }) => {
  try {
    const { resourcesNames } = options
    const namespaces = ns.namespaceList
    const refCheckingPromises = flatten(namespaces.map(namespace => {
      return resourcesNames.map(resourceName => {
        return os.checkSourceRef(namespace, resourceName)
      })
    }))

    Promise.all(refCheckingPromises).then(responses => {
      const table = new Table({
        head: ['Project', 'Application', 'Build Config Source Ref.', 'Latest Source Ref.'],
        colWidths: [42, 22, 40, 20]
      })

      responses.forEach(({ namespace, name, sourceRef, latestSourceRef }) => {
        table.push([ namespace, name, sourceRef, latestSourceRef.substr(0, 7) ])
      })

      process.stdout.write(`${table.toString()}\n`)
    })
  } catch (e) {
    throw e
  }
}
