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
  patchSample (obj, path, newObj, updateOnly = false, ignorePath = []) {
    let patchedObject

    if (updateOnly && !get(obj, path)) {
      return obj
    }

    patchedObject = set(
      cloneDeep(obj),
      path,
      get(cloneDeep(newObj), path)
    )

    ignorePath.forEach(ignoredPath => {
      const fullPath = `${path}.${ignoredPath}`
      patchedObject = set(patchedObject, fullPath, get(obj, fullPath))
    })

    return patchedObject
  }
}
