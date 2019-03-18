#!/usr/bin/env node

const Table = require('cli-table')

module.exports = async (options, { os, ns }) => {
  try {
    const { hostname } = options
    const namespaces = ns.namespaceList
    const configPromises = namespaces.map(namespace => {
      return os.getResource(namespace, 'route')
    })
    const configurations = await Promise.all(configPromises)
    const routeResources = configurations
      .filter(({ data: routeList }) => routeList.items.map(e => e.spec.host).indexOf(hostname) > -1)
      .map(({ data: routeList }) => routeList.items.find(e => e.spec.host === hostname))
    const table = new Table({
      head: ['Project', 'Service Name', 'IET Policy', 'Port'],
      colWidths: [38, 38, 32, 32]
    })

    if (!routeResources.length) {
      throw new Error('The hostname was not found.')
    }

    routeResources.forEach(({ metadata, spec }) => {
      table.push([
        metadata.namespace,
        spec.to.name,
        spec.tls ? spec.tls.insecureEdgeTerminationPolicy : 'N/A',
        spec.port.targetPort
      ])
    })

    process.stdout.write(`${table.toString()}\n`)
  } catch (e) {
    throw e
  }
}
