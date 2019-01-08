#!/usr/bin/env node

const { loadYamlAsObject } = require('../../utils/misc')
const { patchSample } = require('./patchHelper')
const { cloneDeep } = require('lodash')
const { getResourceName } = require('../../utils/misc')

module.exports = async (options, { os, ns }) => {
  try {
    const { resourceType, resourceName, propertyPath, filename } = options
    const newResourceContent = loadYamlAsObject(filename)
    const namespaces = ns.namespaceList
    const resourceRetrievalPromises = namespaces.map(namespace => {
      return os.getResource(namespace, resourceType, resourceName)
    })
    const resourcesResponses = await Promise.all(resourceRetrievalPromises)
    const resources = resourcesResponses.map(({ data }) => {
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
    const resourceUpdatePromises = resources.map(({ namespace, patchedWithExcerpt }) => {
      return os.updateResource(namespace, resourceType, resourceName, patchedWithExcerpt)
    })

    await Promise.all(resourceUpdatePromises)
  } catch (e) {
    throw e
  }
}
