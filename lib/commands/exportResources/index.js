#!/usr/bin/env node

module.exports = async (options, { os, ns }) => {
  try {
    const { hostname } = options
    const namespaces = ns.namespaceList

    // TODO: implement export-resources subcommand
  } catch (e) {
    throw e
  }
}
