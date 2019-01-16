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
  .command('equalize-env')
  .option('-t, --resource-type <resourceType>', 'resource type')
  .option('-n, --resource-name <resourceName>', 'resource name')
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('--ignore <ignoredNamespace>', 'namespaces to ignore', collect, [])
  .option('--output-missing-vars [outputMissingVars]', 'display all the missing variables')
  .option('--store-resource-dumps [storeResourceDumps]', 'store the generated resource dumps')
  .action(options => run('equalizeEnv', options))

program
  .command('set-env')
  .option('-t, --resource-type <resourceType>', 'resource type')
  .option('-n, --resource-name <resourceName>', 'resource name')
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('--ignore <ignoredNamespace>', 'namespaces to ignore', collect, [])
  .option('-v, --variable <variable>', 'variable with name and value', collect, [])
  .action(options => run('setEnv', options))

program
  .command('instantiate')
  .option('-t, --resource-type <resourceType>', 'resource type')
  .option('-n, --resources-names <resourcesNames>', 'resources names', collect, [])
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('--ignore <ignoredNamespace>', 'namespaces to ignore', collect, [])
  .option('-s, --source-ref [sourceRef]', 'tag/branch/commit hash from Git')
  .action(options => run('instantiate', options))

program
  .command('update-resource')
  .option('-t, --resource-type <resourceType>', 'resource type')
  .option('-n, --resource-name <resourceName>', 'resource name')
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('--ignore <ignoredNamespace>', 'namespaces to ignore', collect, [])
  .option('-p, --property-path <propertyPath>', 'the path of the property that you want to add/replace')
  .option('-f, --filename <filename>', 'YAML file')
  .action(options => run('updateResource', options))

program
  .command('scale')
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('-n, --resources-names <resourcesNames>', 'resources names', collect, [])
  .option('--ignore <ignoredNamespace>', 'namespaces to ignore', collect, [])
  .option('--replicas <replicas>', 'number of replicas')
  .action(options => run('scale', options))

program
  .command('check-source-refs')
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('-n, --resources-names <resourcesNames>', 'resources names', collect, [])
  .option('--environment-alias <environmentAlias>', 'environment alias')
  .action(options => run('checkSourceRefs', options))

program
  .command('membership')
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('--user <user>', 'user name')
  .option('--role <role>', 'project role')
  .action(options => run('membership', options))

program
  .command('check-resources')
  .option('-r, --namespace-regex <namespaceRegex>', 'regular expression to filter the namespace')
  .option('-n, --resources-names <resourcesNames>', 'resources names', collect, [])
  .action(options => run('checkResources', options))

program.parse(process.argv)

if (!program.args.length) program.outputHelp()
