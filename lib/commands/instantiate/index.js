#!/usr/bin/env node

const { flatten } = require('lodash')

module.exports = async (options, { os, ns, queue }) => {
  try {
    const { resourceType, resourcesNames, sourceRef } = options
    const namespaces = ns.namespaceList
    const operationInitPromises = flatten(namespaces.map(namespace => {
      return resourcesNames.map(resourceName => {
        return () => {
          return os.instantiate(namespace, resourceType, resourceName)
            .then(response => queue.registerResponse(response))
            .catch(error => queue.registerError(error))
        }
      })
    }))
    const refChangePromises = resourceType === 'build'
      ? flatten(namespaces.map(namespace => {
        return resourcesNames.map(resourceName => {
          return () => {
            return os.changeSourceRef(namespace, resourceName, sourceRef)
              .then(response => queue.registerResponse(response))
              .catch(error => queue.registerError(error))
          }
        })
      }))
      : []

    if (sourceRef) {
      queue.addJob(...refChangePromises)
      await queue.process()
    }

    queue.addJob(...operationInitPromises)
    await queue.process()

    if (queue.getResults().errors.length > 0) {
      throw new Error('ERROR: Not all services were triggered.')
    }
  } catch (e) {
    throw e
  }
}
