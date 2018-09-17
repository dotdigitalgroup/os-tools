#!/usr/bin/env node

const { getNamespacesAliases } = require('../../utils/misc')

module.exports = async (options, { os }) => {
  try {
    const { namespaceRegex, replicas } = options
    const projects = await os.getAllProjects()
    const namespaces = getNamespacesAliases(projects, namespaceRegex)
    const namespaceScalePromises = namespaces.map(namespace => {
      return os.scale(namespace, parseInt(replicas))
    })

    await Promise.all(namespaceScalePromises)
  } catch (e) {
    throw e
  }
}
