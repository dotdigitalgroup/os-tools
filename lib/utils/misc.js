const { readFileSync } = require('fs')
const yaml = require('js-yaml')
const { get } = require('lodash')

module.exports = {
  getNamespacesAliases: (projects, namespaceRegex) => {
    return projects
      .map(project => project.metadata.name)
      .filter(entry => {
        const regex = new RegExp(namespaceRegex)
        return regex.test(entry)
      })
  },
  getVariablesObject: variables => {
    const output = {}
    const splitChar = '='

    variables.forEach(nameValuePair => {
      const [ name, ...value ] = nameValuePair.split(splitChar)
      output[name] = value.join(splitChar)
    })

    return output
  },
  loadYamlAsObject (path) {
    try {
      return yaml.safeLoad(readFileSync(path, 'utf8'))
    } catch (e) {
      throw e
    }
  },
  getResourceName (alias) {
    const resourceNameMap = {
      build: 'BuildConfig',
      deployment: 'DeploymentConfig',
      route: 'Route'
    }

    return resourceNameMap[alias]
  },
  getVariableList (resource, subjects, searchBy = 'name', wholeWord = false) {
    const variableList = get(resource, 'spec.strategy.sourceStrategy.env') ||
      get(resource, 'spec.template.spec.containers[0].env')

    if (!variableList) return []

    return variableList.filter(entry => {
      return searchBy === 'value'
        ? wholeWord
          ? subjects.indexOf(entry.value) > -1
          : subjects.reduce((acc, subject) => {
            if (entry.value && entry.value.includes(subject)) acc++
            return acc
          }, 0) > 0
        : wholeWord
          ? subjects.indexOf(entry.name) > -1
          : subjects.reduce((acc, subject) => {
            if (entry.value && entry.name.includes(subject)) acc++
            return acc
          }, 0) > 0
    })
  }
}
