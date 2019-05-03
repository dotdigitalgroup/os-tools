#!/usr/bin/env node

const { loadYamlAsObject } = require('../../utils/misc')
const { patchSample } = require('./patchHelper')
const { cloneDeep, get, flatten } = require('lodash')
const { getResourceName } = require('../../utils/misc')

module.exports = async (options, { os, ns }) => {
  try {
    const { resourceType, resourcesNames, propertyPath, filename, filterPath, filterTerm } = options
    const newResourceContent = loadYamlAsObject(filename)
    const namespaces = ns.namespaceList
    const resourceRetrievalPromises = namespaces.map(async namespace => {
      let names = resourcesNames
      
      if (!names.length) {
        names = await os.getResourcesNames(namespace, resourceType)
      }

      return names.map(resourceName => {
        return os.getResource(namespace, resourceType, resourceName)
      })
    })
    const resourcesResponses = await Promise.all(resourceRetrievalPromises)
    const processedResponses = await Promise.all(flatten(resourcesResponses))
    const processFilters = ({ data: resource }) => {
      const filterField = get(resource, filterPath)

      return filterField ? filterField.includes(filterTerm) : true
    }
    const resources = processedResponses.filter(processFilters).map(({ data }) => {
      const original = cloneDeep(data)
      let chosenResource = newResourceContent

      if (newResourceContent.kind === 'List') {
        chosenResource = newResourceContent.items.find(({ kind }) => {
          return kind === getResourceName(resourceType)
        })
      }

      return {
        namespace: original.metadata.namespace,
        actualResource: original,
        patchedWithExcerpt: patchSample(
          original,
          propertyPath,
          chosenResource
        )
      }
    })
    const resourceUpdatePromises = resources.map(async ({ namespace, patchedWithExcerpt }) => {
      let names = resourcesNames
      
      if (!names.length) {
        names = await os.getResourcesNames(namespace, resourceType)
      }

      return names.map(resourceName => {
        return os.updateResource(namespace, resourceType, resourceName, patchedWithExcerpt)
      })
    })

    await Promise.all(flatten(resourceUpdatePromises))
  } catch (e) {
    throw e
  }
}
