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
        head: ['Project', 'Application', 'Build Config Source Ref.', 'Latest Source Ref.', 'Build Status'],
        colWidths: [42, 22, 32, 20, 20]
      })

      responses.forEach(({ namespace, name, sourceRef, latestBuildInfo }) => {
        const latestSourceRef = latestBuildInfo.revisionInfo.git.commit
        const latestStatus = latestBuildInfo.status.phase

        table.push([
          namespace,
          name,
          sourceRef,
          latestSourceRef.substr(0, 7),
          latestStatus
        ])
      })

      process.stdout.write(`${table.toString()}\n`)
    })
  } catch (e) {
    throw e
  }
}
