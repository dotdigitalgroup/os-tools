#!/usr/bin/env node

const { flatten } = require('lodash')
const { getNamespacesAliases } = require('../../utils/misc')

module.exports = async (options, { os }) => {
  try {
    const { namespaceRegex, resourceType, resourcesNames, sourceRef } = options
    const projects = await os.getAllProjects()
    const namespaces = getNamespacesAliases(projects, namespaceRegex)
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
