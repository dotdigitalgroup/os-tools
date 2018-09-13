#!/usr/bin/env node

const program = require('commander')
const { run } = require('./lib/commandRunner')

function collect (val, memo) {
  memo.push(val)
  return memo
}

program.version(require('./package.json').version)

program
  .command('configure')
  .action(options => run('configure', options))

program
  .command('info')
  .action(options => run('info', options))

program
  .command('equalize-env')
  .option('-t, --resource-type <resourceType>', 'resource type')
  .option('-n, --resource-name <resourceName>', 'resource name')
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('--output-missing-vars [outputMissingVars]', 'display all the missing variables')
  .option('--store-resource-dumps [storeResourceDumps]', 'store the generated resource dumps')
  .action(options => run('equalizeEnv', options))

program
  .command('set-env')
  .option('-t, --resource-type <resourceType>', 'resource type')
  .option('-n, --resource-name <resourceName>', 'resource name')
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('-v, --variable <variable>', 'variable with name and value', collect, [])
  .action(options => run('setEnv', options))

program
  .command('instantiate')
  .option('-t, --resource-type <resourceType>', 'resource type')
  .option('-n, --resources-names <resourcesNames>', 'resources names', collect, [])
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('-s, --source-ref [sourceRef]', 'tag/branch/commit hash from Git')
  .action(options => run('instantiate', options))

program
  .command('update-resource')
  .option('-t, --resource-type <resourceType>', 'resource type')
  .option('-n, --resource-name <resourceName>', 'resource name')
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('-p, --property-path <propertyPath>', 'the path of the property that you want to replace')
  .option('-f, --filename <filename>', 'YAML file')
  .action(options => run('updateResource', options))

program.parse(process.argv)
