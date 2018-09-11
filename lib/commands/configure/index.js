#!/usr/bin/env node

const homedir = require('os').homedir()
const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')
const { prompt } = require('inquirer')
const configFilePath = join(homedir, '.ostoolkitrc')

function getConfigFile () {
  try {
    return readFileSync(configFilePath, 'utf8')
  } catch (e) {
    return null
  }
}

function saveConfigFile (config) {
  try {
    writeFileSync(configFilePath, `${JSON.stringify(config)}\n`, 'utf8')
  } catch (e) {
    throw e
  }
}

module.exports = async () => {
  try {
    const questions = {
      overwriteWarning: [
        { name: 'overwrite', message: 'Would you like to reconfigure?', type: 'confirm' }
      ],
      configuration: [
        { name: 'url', message: 'OpenShift URL:' },
        { name: 'token', message: 'OpenShift token:' }
      ]
    }

    if (getConfigFile()) {
      prompt(questions.overwriteWarning).then(answers => {
        if (answers.overwrite) {
          prompt(questions.configuration).then(saveConfigFile)
        }
      })
    } else {
      prompt(questions.configuration).then(saveConfigFile)
    }
  } catch (e) {
    throw e
  }
}
