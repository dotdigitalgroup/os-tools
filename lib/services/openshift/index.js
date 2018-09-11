const axios = require('axios')
const { getTemplate } = require('./templates/index')
const resourceNameMap = {
  build: 'buildconfigs',
  deployment: 'deploymentconfigs'
}
const helpers = {
  resourceHandling: require('./resourceHandlingHelper')
}

module.exports = class OpenShiftService {
  constructor (url, token) {
    this.helpers = helpers
    this.os = axios.create({
      baseURL: url,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
  }

  getHelper (name) {
    return this.helpers[name]
  }

  getApplicationsAliases (namespace) {
    // TODO: get all applications aliases from a namespace
  }

  getAllProjects () {
    return this.os.get('oapi/v1/projects').then(({ data }) => data.items)
  }

  getResource (namespace, resourceType, resourceName) {
    return this.os.get(
      `oapi/v1/namespaces/${namespace}/${resourceNameMap[resourceType]}/${resourceName}`
    )
  }

  updateResource (namespace, resourceType, resourceName, payload) {
    return this.os.put(
      `oapi/v1/namespaces/${namespace}/${resourceNameMap[resourceType]}/${resourceName}`,
      payload
    )
  }

  scale (namespace, replicas = 1) {
    // TODO: scale all applications from a namespace
  }

  instantiate (namespace, resourceType, resourceName) {
    const templates = {
      build: getTemplate('BuildRequest'),
      deployment: getTemplate('DeploymentRequest')
    }
    const resource = templates[resourceType]

    if (resourceType === 'build') {
      resource.metadata.name = resourceName
    } else {
      resource.name = resourceName
    }

    return this.os.post(
      `oapi/v1/namespaces/${namespace}/${resourceNameMap[resourceType]}/${resourceName}/instantiate`,
      resource
    )
  }

  changeSourceRef (namespace, resourceName, ref = 'master') {
    return this.getResource(namespace, 'build', resourceName).then(({ data }) => {
      const buildConfig = data

      buildConfig.spec.source.git.ref = ref

      return this.updateResource(namespace, 'build', resourceName, buildConfig)
    })
  }
}
