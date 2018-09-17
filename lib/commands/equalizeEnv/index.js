#!/usr/bin/env node

const Table = require('cli-table')
const { getNamespacesAliases } = require('../../utils/misc')
const { concat, uniq, difference, cloneDeep } = require('lodash')
const q = require('queue')()
const inquirer = require('inquirer')
const fs = require('fs')
const yaml = require('js-yaml')

function renderResults (commonEnv, environmentEntries) {
  const table = new Table({
    head: ['Project', 'Missing Vars'],
    colWidths: [42, 104]
  })

  environmentEntries.forEach(({ alias, variableNames }) => {
    const envDiff = getMissingVars(commonEnv, variableNames)
    const missingVars = envDiff.length ? envDiff.join(', ') : '-'

    table.push([`${alias}`, missingVars])
  })

  process.stdout.write(`${table.toString()}\n`)
}

function getMissingVars (commonEnv, variableNames) {
  return difference(commonEnv, variableNames)
}

function getQuestions (environmentEntries) {
  const questions = []

  environmentEntries.forEach(({ alias, missingVars }) => {
    if (missingVars.length) {
      questions.push(
        ...missingVars.map(missingVar => {
          return {
            name: `${missingVar}@${alias}`,
            message: `Insert value for variable ${missingVar} in the project "${alias}":`
          }
        })
      )
    }
  })

  return questions
}

module.exports = async (options, { os }) => {
  try {
    const {
      namespaceRegex,
      resourceType,
      resourceName,
      outputMissingVars,
      storeResourceDumps
    } = options
    const { getEnv, prepareResource } = os.getHelper('resourceHandling')
    const projects = await os.getAllProjects()
    const aliases = getNamespacesAliases(projects, namespaceRegex)
    const results = { responses: [], errors: [] }
    let commonEnv, environmentEntries, jobs

    jobs = aliases.map(alias => {
      return () => {
        return os.getResource(alias, resourceType, resourceName)
          .then(response => results.responses.push(response))
          .catch(err => results.errors.push(err.response))
      }
    })

    q.push(...jobs)
    q.start(() => {
      const { responses } = results

      environmentEntries = responses.map(({ data }) => {
        const { metadata } = projects.find(({ metadata }) => metadata.name === data.metadata.namespace)

        return {
          alias: metadata.name,
          displayName: metadata.annotations['openshift.io/display-name'],
          description: metadata.annotations['openshift.io/description'],
          variableNames: getEnv(data, resourceType),
          resourceObject: data
        }
      })

      commonEnv = uniq(
        concat(...environmentEntries.map(({ variableNames }) => variableNames))
      )

      environmentEntries.map(environmentEntry => {
        environmentEntry.missingVars = getMissingVars(commonEnv, environmentEntry.variableNames)
        return environmentEntry
      })

      if (outputMissingVars) renderResults(commonEnv, environmentEntries)

      inquirer.prompt(getQuestions(environmentEntries)).then(results => {
        const updatePromises = []

        environmentEntries
          .filter(({ missingVars }) => missingVars.length > 0)
          .map(({ resourceObject }) => {
            return {
              currentResource: cloneDeep(resourceObject),
              updatedResource: prepareResource(resourceObject, results, resourceType)
            }
          })
          .forEach(resources => {
            const resourcePayload = resources.updatedResource
            const { namespace } = resourcePayload.metadata

            updatePromises.push(
              os.updateResource(
                namespace,
                resourceType,
                resourceName,
                resourcePayload
              )
            )

            if (storeResourceDumps) {
              fs.writeFileSync(
                `./dumps/${Date.now()}_compare-env_current_${resourceName}_${namespace}.yaml`,
                yaml.safeDump(resources.currentResource),
                'utf8'
              )
              fs.writeFileSync(
                `./dumps/${Date.now()}_compare-env_updated_${resourceName}_${namespace}.yaml`,
                yaml.safeDump(resourcePayload),
                'utf8'
              )
            }
          })

        Promise.all(updatePromises)
      })
    })
  } catch (e) {
    throw e
  }
}
