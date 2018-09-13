module.exports = (options, { identification }) => {
  process.stdout.write(`Current OpenShift URL: ${identification.getConfigInfo().url}\n`)
}
