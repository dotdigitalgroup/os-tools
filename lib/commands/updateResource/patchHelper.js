const { get, set, cloneDeep } = require('lodash')
const jsondiffpatch = require('jsondiffpatch')
const options = {}

module.exports = {
  getDiff (left, right) {
    return jsondiffpatch.create(options).diff(left, right)
  },
  patch (obj, delta) {
    return jsondiffpatch.create(options).patch(obj, delta)
  },
  patchSample (obj, path, newObj) {
    return set(
      cloneDeep(obj),
      path,
      get(cloneDeep(newObj), path)
    )
  }
}
