const { uniq, flatten, cloneDeep } = require('lodash')
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
    const getAliases = response => response.data.items.map(({ metadata }) => metadata.name)
    const promises = [
      this.os.get(`oapi/v1/namespaces/${namespace}/buildconfigs`).then(getAliases),
      this.os.get(`oapi/v1/namespaces/${namespace}/deploymentconfigs`).then(getAliases)
    ]

    return Promise.all(promises).then(aliases => uniq(flatten(aliases)))
  }

  getAllProjects () {
    return this.os.get('oapi/v1/projects').then(({ data }) => data.items)
  }

  getResource (namespace, resourceType, resourceName) {
    return this.os.get(
      `oapi/v1/namespaces/${namespace}/${resourceNameMap[resourceType]}/${resourceName}`
    )
  }

  getBuilds (namespace, resourceName) {
    return this.os.get(`oapi/v1/namespaces/${namespace}/builds`).then(({ data: { items } }) => {
      return items.filter(build => {
        return build.metadata.annotations['openshift.io/build-config.name'] === resourceName &&
          !build.status.cancelled &&
          build.status.phase === 'Complete'
      })
    })
  }

  updateResource (namespace, resourceType, resourceName, payload) {
    return this.os.put(
      `oapi/v1/namespaces/${namespace}/${resourceNameMap[resourceType]}/${resourceName}`,
      payload
    )
  }

  scale (namespace, applications = [], replicas = 1) {
    return this.getApplicationsAliases(namespace).then(applicationsAliases => {
      const aliases = applications.length
        ? applicationsAliases.filter(alias => applications.indexOf(alias) > -1)
        : applicationsAliases
      const promises = aliases.map(alias => {
        const payload = cloneDeep(getTemplate('Scale'))

        payload.metadata.name = alias
        payload.metadata.namespace = namespace
        payload.spec.replicas = replicas

        return this.os.put(
          `oapi/v1/namespaces/${namespace}/deploymentconfigs/${alias}/scale`,
          payload
        )
      })

      return Promise.all(promises)
    })
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

  getLatestBuild (namespace, resourceName) {
    return this.getBuilds(namespace, resourceName).then(builds => {
      const latestBuild = builds.sort((a, b) => {
        return new Date(b.status.completionTimestamp) - new Date(a.status.completionTimestamp)
      })[0]

      return {
        revisionInfo: latestBuild.spec.revision,
        status: latestBuild.status
      }
    })
  }

  checkSourceRef (namespace, resourceName) {
    const promises = [
      this.getResource(namespace, 'build', resourceName),
      this.getLatestBuild(namespace, resourceName)
    ]

    return Promise.all(promises).then(([ { data: buildConfigs }, { revisionInfo } ]) => {
      return {
        name: buildConfigs.metadata.name,
        namespace: buildConfigs.metadata.namespace,
        sourceRef: buildConfigs.spec.source.git.ref,
        latestSourceRef: revisionInfo.git.commit
      }
    })
  }
}
