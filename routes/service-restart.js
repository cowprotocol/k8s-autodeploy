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
  getConfig (deploymentName) {
    return executeCommand('kubectl', ['get', 'deployment', deploymentName, '-o', 'yaml'])
  },
  delete (deploymentName) {
    return executeCommand('kubectl', ['delete', 'deployment', deploymentName])
  },
  applyConfig (deploymentName, config) {
    return executeCommand('kubectl', ['apply', '-f', '-'], {input: config})
  }
}

const getDeploymentName = (serviceName, dockerTag) => {
  switch (dockerTag) {
    case 'develop':
      return `dev-${serviceName}`
    case 'master':
      return `staging-${serviceName}`
  }
}

router.post('/:serviceName', function (req, res, next) {
  const dockerTag = req.body.push_data.tag
  const serviceName = req.params.serviceName
  let deploymentName = getDeploymentName(serviceName, dockerTag)

  deployment.getConfig(deploymentName).then(config => {
    return deployment.delete(deploymentName).then(() => {
      return deployment.applyConfig(deploymentName, config).then(() => {
        res.status(200).json({})
      })
    })
  }).catch(error => { res.status(500).json({'error': error}) })
})

module.exports = router
