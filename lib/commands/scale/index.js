#!/usr/bin/env node

module.exports = async (options, { os, ns }) => {
  try {
    const { replicas } = options
    const namespaces = ns.namespaceList
    const namespaceScalePromises = namespaces.map(namespace => {
      return os.scale(namespace, parseInt(replicas))
    })

    await Promise.all(namespaceScalePromises)
  } catch (e) {
    throw e
  }
}
