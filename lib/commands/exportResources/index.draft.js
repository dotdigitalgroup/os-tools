#!/usr/bin/env node

// draft file for "export-resources" subcommand

const processName = 'os-parse-resources'

if (process.argv.length < 3) {
  showUsage()
  process.exit(127)
}

const { readFileSync, readdirSync, writeFileSync } = require('fs')
const { join } = require('path')
const { flatten, get, unset, has } = require('lodash')
const yaml = require('js-yaml')
const filesPath = process.argv[3]
const ns = process.argv[4]
const apps = process.argv[5] ? process.argv[5].split(',') : null
const files = readdirSync(filesPath)
const items = []
const keysBlacklist = [
  'spec.clusterIP',
  'spec.volumeName',
  'metadata.annotations["pv.kubernetes.io/bind-completed"]',
  'metadata.annotations["pv.kubernetes.io/bound-by-controller"]',
  'metadata.annotations["openshift.io/image.dockerRepositoryCheck"]',
  'metadata.generation',
  'spec.tags'
]
const oldNamespace = process.argv[4]

function showUsage () {
  process.stdout.write([
    `Usage: ${processName} <old_namespace> <yamls_path> <new_namespace> [comma_separated_applications]`,
    '',
    '  Examples:',
    '',
    `  ${processName} homolog-namespace /path/to/openshift/yamls production-namespace`,
    `  ${processName} homolog-namespace /path/to/openshift/yamls production-namespace app1,app2,app3`,
    ''
  ].join('\n') + '\n')
}

function allowedApps (resource) {
  return apps ? apps.indexOf(resource.metadata.name) > -1 : resource
}

function allowedResources (resource) {
  const types = [
    'kubernetes.io/service-account-token',
    'kubernetes.io/dockercfg'
  ]
  const labels = [
    'gluster.kubernetes.io/provisioned-for-pvc'
  ]
  const deniedLabels = labels.reduce((acc, entry) => {
    if (has(resource, `metadata.labels["${entry}"]`)) {
      acc++
    }

    return acc
  }, 0)

  return types.indexOf(resource.type) < 0 ^ deniedLabels > 0
}

function removeKey (obj, path) {
  if (get(obj, path)) unset(obj, path)
  return obj
}

files.forEach(file => {
  const fileContents = yaml.safeLoad(readFileSync(join(filesPath, file)), 'utf8')
  let entries = fileContents.items

  entries = entries.map(entry => {
    let entryAsText

    entry.metadata.namespace = ns
    delete entry.metadata.selfLink
    delete entry.metadata.resourceVersion
    delete entry.metadata.creationTimestamp
    delete entry.metadata.uid
    delete entry.status

    keysBlacklist.forEach(blacklistItem => removeKey(entry, blacklistItem))
    entryAsText = JSON.stringify(entry)
    entryAsText = entryAsText
      .replace(`/${oldNamespace}/`, `/${ns}/`)
      .replace(`"namespace":"${oldNamespace}"`, `"namespace":"${ns}"`)

    entry = JSON.parse(entryAsText)

    if (get(entry, 'spec.triggers')) {
      entry.spec.triggers = entry.spec.triggers.map(imgTrigger => {
        if (has(imgTrigger, 'imageChangeParams.lastTriggeredImage')) {
          delete imgTrigger.imageChangeParams.lastTriggeredImage
        }
        if (has(imgTrigger, 'imageChange.lastTriggeredImageID')) {
          delete imgTrigger.imageChange
        }
        // if (has(imgTrigger, 'github.secret')) {
        //   delete imgTrigger.github.secret
        // }
        // if (has(imgTrigger, 'generic.secret')) {
        //   delete imgTrigger.generic.secret
        // }

        return imgTrigger
      })
    }

    return entry
  })

  items.push(entries)
})

writeFileSync(
  join(process.cwd(), 'dump.yaml'),
  yaml.safeDump({
    apiVersion: 'v1',
    items: flatten(items).filter(allowedResources).filter(allowedApps),
    kind: 'List',
    metadata: {
      resourceVersion: '',
      selfLink: ''
    }
  })
)
