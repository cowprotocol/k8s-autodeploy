const express = require('express')
const router = express.Router()
const spawnSync = require('child_process').spawnSync

const executeCommand = (command, args, options = undefined) => {
  let result = spawnSync(command, args, options)

  if (result.status === 0) {
    return Promise.resolve(result.stdout.toString())
  } else {
    return Promise.reject(result.stderr.toString())
  }
}

const deployment = {
  applyConfig (deploymentName, config) {
    return executeCommand('kubectl', ['apply', '-f', '-'], {input: config})
  },
  delete (deploymentName) {
    return executeCommand('kubectl', ['delete', 'deployment', deploymentName])
  },
  getConfig (deploymentName) {
    return executeCommand('kubectl', ['get', 'deployment', deploymentName, '-o', 'yaml'])
  },
  getNameFromDockerTag (serviceName, dockerTag) {
    switch (dockerTag) {
      case 'develop':
        return `dev-${serviceName}`
      case 'master':
        return `staging-${serviceName}`
    }
  },
  restart (deploymentName) {
    return this.getConfig(deploymentName).then(config => {
      return this.delete(deploymentName).then(() => {
        return this.applyConfig(deploymentName, config)
      })
    })
  }
}

router.post('/:services/restart', function (req, res, next) {
  const dockerTag = req.body.push_data.tag
  const services = req.params.services.split(',')

  Promise.all(
    services.map(service => {
      let deploymentName = deployment.getNameFromDockerTag(service, dockerTag)
      return deployment.restart(deploymentName)
    })
  ).then(
    result => { res.status(200).json({}) }
  ).catch(error => {
    res.status(500).json({'error': error})
  })
})

module.exports = router
