const { join } = require('path')
const { loadYamlAsObject } = require('../../../utils/misc')

module.exports = {
  getTemplate: (name) => {
    try {
      return loadYamlAsObject(join(__dirname, `${name}.yaml`))
    } catch (e) {
      return null
    }
  }
}
