#!/usr/bin/env node

const { writeFileSync } = require('fs')
const { join } = require('path')
const { getVariableList } = require('../../utils/misc')
const moment = require('moment')

module.exports = async (options, { os, ns }) => {
  try {
    const { resourceType, variable, searchByValue, wholeWord } = options
    const namespaces = ns.namespaceList
    const configPromises = namespaces.map(namespace => {
      return os.getResource(namespace, resourceType)
    })
    const configurations = await Promise.all(configPromises)
    const searchType = searchByValue ? 'value' : 'name'
    const output = []
    let fileContents = ''

    configurations.forEach(({ data: configList }) => {
      configList.items.forEach(resource => {
        const variableList = getVariableList(resource, variable, searchType, wholeWord)

        if (variableList.length) {
          output.push({
            namespace: resource.metadata.namespace,
            resourceName: resource.metadata.name,
            variables: variableList
          })
        }
      })
    })

    if (!output.length) {
      throw new Error('No results found.')
    }

    fileContents += ['Namespace', 'Name', 'Variable'].join('\t') + '\n'
    fileContents += output.map(({ namespace, resourceName, variables }) => {
      return [
        namespace,
        resourceName,
        variables.map(e => `${e.name}=${e.value}`).join(',')
      ].join('\t')
    }).join('\n')

    writeFileSync(
      join(
        process.cwd(),
        `${resourceType}_summary_${moment().unix()}.tsv`
      ),
      fileContents
    )
  } catch (e) {
    throw e
  }
}
