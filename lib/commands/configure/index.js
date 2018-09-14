#!/usr/bin/env node

const { prompt } = require('inquirer')

module.exports = async (options, { identification }) => {
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

    if (identification.getConfigFile()) {
      prompt(questions.overwriteWarning).then(answers => {
        if (answers.overwrite) {
          prompt(questions.configuration).then(answers => identification.saveConfigFile(answers))
        }
      })
    } else {
      prompt(questions.configuration).then(answers => identification.saveConfigFile(answers))
    }
  } catch (e) {
    throw e
  }
}
