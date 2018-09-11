const { readFileSync } = require('fs')
const yaml = require('js-yaml')

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
  }
}
