#!/usr/bin/env node

const { loadYamlAsObject, getNamespacesAliases } = require('../../utils/misc')
const { patchSample } = require('./patchHelper')
const { cloneDeep } = require('lodash')

module.exports = async (options, { os }) => {
  try {
    const { namespaceRegex, resourceType, resourceName, propertyPath, filename } = options
    const newResourceContent = loadYamlAsObject(filename)
    const projects = await os.getAllProjects()
    const namespaces = getNamespacesAliases(projects, namespaceRegex)
    const resourceRetrievalPromises = namespaces.map(namespace => {
      return os.getResource(namespace, resourceType, resourceName)
    })
    const resourcesResponses = await Promise.all(resourceRetrievalPromises)
    const resources = resourcesResponses.map(({ data }) => {
      const original = cloneDeep(data)
      const resourceNameMap = {
        build: 'BuildConfig',
        deployment: 'DeploymentConfig'
      }
      let chosenResource = newResourceContent

      if (newResourceContent.kind === 'List') {
        chosenResource = newResourceContent.items.find(({ kind }) => {
          return kind === resourceNameMap[resourceType]
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