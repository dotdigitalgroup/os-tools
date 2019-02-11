const { concat, get, set, map } = require('lodash')

module.exports = {
  getEnv: (config, type = 'build') => {
    return type === 'build'
      ? config.spec.strategy.sourceStrategy.env
        ? config.spec.strategy.sourceStrategy.env.map(({ name }) => name)
        : []
      : config.spec.template.spec.containers[0].env
        ? config.spec.template.spec.containers[0].env.map(({ name }) => name)
        : []
  },
  prepareResource: (config, variables = {}, type = 'build') => {
    const searchPath = type === 'build'
      ? 'spec.strategy.sourceStrategy.env'
      : 'spec.template.spec.containers[0].env'
    const currentEnv = get(config, searchPath) || []
    const cleanCurrentEnv = currentEnv.filter(entry => {
      return Object.keys(variables).indexOf(entry.name) < 0
    })
    const mappedVars = map(variables, (value, key) => {
      const [ varName, namespace ] = key.split('@')
      return { namespace, name: varName, value }
    })
    const currentNamespaceVars = mappedVars
      .filter(({ namespace }) => namespace === config.metadata.namespace || !namespace)
      .map(({ name, value }) => {
        try {
          const parsedVar = JSON.parse(value)

          if ([true, false].indexOf(parsedVar)) {
            throw new Error(null)
          }

          return { name: name, valueFrom: parsedVar }
        } catch (e) {
          return { name: name, value: value }
        }
      })

    return set(config, searchPath, concat(cleanCurrentEnv, currentNamespaceVars))
  }
}
