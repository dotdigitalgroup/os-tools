#!/usr/bin/env node

const { flatten } = require('lodash')

module.exports = async (options, { os, ns }) => {
  try {
    const { resourceType, resourcesNames, sourceRef } = options
    const namespaces = ns.namespaceList
    const operationInitPromises = flatten(namespaces.map(namespace => {
      return resourcesNames.map(resourceName => {
        return os.instantiate(namespace, resourceType, resourceName)
      })
    }))
    const refChangePromises = resourceType === 'build'
      ? flatten(namespaces.map(namespace => {
        return resourcesNames.map(resourceName => {
          return os.changeSourceRef(namespace, resourceName, sourceRef)
        })
      }))
      : []

    if (sourceRef) {
      await Promise.all(refChangePromises)
    }

    await Promise.all(operationInitPromises)
  } catch (e) {
    throw e
  }
}
