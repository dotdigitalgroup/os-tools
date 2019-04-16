#!/usr/bin/env node

const { flatten } = require('lodash')
const moment = require('moment')
const Table = require('cli-table')

module.exports = async (options, { os, ns }) => {
  try {
    const { resourcesNames, repeat } = options
    const namespaces = ns.namespaceList
    const refCheckingPromises = flatten(namespaces.map(namespace => {
      return resourcesNames.map(resourceName => {
        return os.checkSourceRef(namespace, resourceName)
      })
    }))

    Promise.all(refCheckingPromises).then(responses => {
      const table = new Table({
        head: ['Project', 'Application', 'Ref.', 'Build Status', 'Deployment Status', 'Repl.'],
        colWidths: [38, 22, 12, 16, 38, 8]
      })

      responses.forEach(({ namespace, name, latestBuildInfo, latestDeploymentInfo }) => {
        const latestSourceRef = latestBuildInfo.revisionInfo
          ? latestBuildInfo.revisionInfo.git.commit
          : 'N/A'
        const latestStatus = latestBuildInfo.status
          ? latestBuildInfo.status.phase
          : 'N/A'
        const { status, lastUpdateTime } = latestDeploymentInfo

        table.push([
          namespace,
          name,
          latestSourceRef.substr(0, 7),
          latestStatus,
          lastUpdateTime
            ? `${status}, updated ${moment().from(moment(lastUpdateTime))}`
            : 'N/A',
          latestDeploymentInfo.replicas
        ])
      })

      if (repeat) console.clear()
      process.stdout.write(`${table.toString()}\n`)
    })
  } catch (e) {
    throw e
  }
}
