const { uniq, flatten, cloneDeep } = require('lodash')
const axios = require('axios')
const { getTemplate } = require('./templates/index')
const resourceNameMap = {
  build: 'buildconfigs',
  deployment: 'deploymentconfigs',
  route: 'routes'
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

  getResource (namespace, resourceType, resourceName = '') {
    return this.os.get(
      `oapi/v1/namespaces/${namespace}/${resourceNameMap[resourceType]}/${resourceName}`
    ).catch(e => e)
  }

  getResourcesNames (namespace, resourceType) {
    return this.getResource(namespace, resourceType).then(({ data }) => {
      return data.items.map(entry => entry.metadata.name)
    })
  }

  getBuilds (namespace, resourceName) {
    return this.os.get(`oapi/v1/namespaces/${namespace}/builds`).then(({ data: { items } }) => {
      return items.filter(build => {
        return build.metadata.annotations['openshift.io/build-config.name'] === resourceName
      })
    })
  }

  updateResource (namespace, resourceType, resourceName, payload) {
    return this.os.put(
      `oapi/v1/namespaces/${namespace}/${resourceNameMap[resourceType]}/${resourceName}`,
      payload
    ).catch(e => e)
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
        return new Date(b.metadata.creationTimestamp) - new Date(a.metadata.creationTimestamp)
      })[0]

      return {
        revisionInfo: latestBuild ? latestBuild.spec.revision : null,
        status: latestBuild ? latestBuild.status : null,
        rawResource: latestBuild
      }
    })
  }

  checkSourceRef (namespace, resourceName) {
    const promises = [
      this.getResource(namespace, 'build', resourceName),
      this.getResource(namespace, 'deployment', resourceName),
      this.getLatestBuild(namespace, resourceName)
    ]

    return Promise.all(promises).then(([ { data: buildConfig }, { data: deploymentConfig }, latestBuildInfo ]) => {
      const latestDeploymentInfo = deploymentConfig.status.conditions.find(e => e.type === 'Progressing')
      let deploymentStatus = 'N/A'

      if (latestDeploymentInfo && latestDeploymentInfo.reason === 'NewReplicationControllerAvailable') {
        deploymentStatus = 'Available'
      }

      return {
        name: buildConfig.metadata.name,
        namespace: buildConfig.metadata.namespace,
        sourceRef: buildConfig.spec.source.git.ref,
        latestBuildInfo,
        latestDeploymentInfo: {
          status: deploymentStatus,
          replicas: deploymentConfig.status.readyReplicas || 'N/A',
          lastUpdateTime: latestDeploymentInfo
            ? latestDeploymentInfo.lastUpdateTime || 'N/A'
            : null
        }
      }
    })
  }

  updateMembership (namespace, user, role, revoke = false) {
    return this.os.get(`oapi/v1/namespaces/${namespace}/rolebindings`)
      .then(({ data: membershipList }) => {
        let currentRoleObject = membershipList.items.find(e => e.roleRef.name === role) || getTemplate('RoleBinding')
        let createPermission = false
        let permissionExists

        if (!currentRoleObject.roleRef.name) {
          createPermission = true

          currentRoleObject.roleRef.name = role
          currentRoleObject.metadata.namespace = namespace
          currentRoleObject.metadata.generateName = `${role}-`
          currentRoleObject.userNames = []
        }

        permissionExists = Boolean(currentRoleObject.subjects.find(e => e.name === user)) &&
          currentRoleObject.roleRef.name === role

        if (permissionExists) {
          if (revoke) {
            currentRoleObject.subjects = currentRoleObject.subjects
              .filter(e => e.name !== user)
            currentRoleObject.userNames = currentRoleObject.userNames
              .filter(e => e !== user)

            if (currentRoleObject.subjects.length > 0) {
              return this.os.put(
                `oapi/v1/namespaces/${namespace}/rolebindings/${role}`,
                currentRoleObject
              ).catch(e => e)
            } else {
              return this.os.delete(
                `apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/${currentRoleObject.metadata.name}`,
                { apiVersion: 'v1', kind: 'DeleteOptions', propagationPolicy: 'Foreground' }
              ).catch(e => e)
            }
          } else {
            return Promise.resolve()
          }
        } else {
          currentRoleObject.userNames.push(user)
          currentRoleObject.subjects.push({
            name: user,
            kind: 'User'
          })

          if (createPermission) {
            return this.os.post(
              `oapi/v1/namespaces/${namespace}/rolebindings`,
              currentRoleObject
            ).catch(e => e)
          } else {
            currentRoleObject.apiVersion = 'rbac.authorization.k8s.io/v1'
            currentRoleObject.kind = 'RoleBinding'
            currentRoleObject.roleRef.kind = 'ClusterRole'
            currentRoleObject.roleRef.apiGroup = 'rbac.authorization.k8s.io'

            return this.os.put(
              `apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/${currentRoleObject.metadata.name}`,
              currentRoleObject
            ).catch(e => e)
          }
        }
      })
  }

  checkResources (namespace, resourceName) {
    const promises = [
      this.getResource(namespace, 'build', resourceName),
      this.getResource(namespace, 'deployment', resourceName)
    ]

    return Promise.all(promises)
      .then(([
        { data: buildConfig },
        { data: deploymentConfig }
      ]) => {
        return {
          namespace,
          name: resourceName,
          buildConfigResources: buildConfig.spec.resources,
          deploymentConfigResources: deploymentConfig.spec.template.spec.containers[0].resources
        }
      })
  }
}
