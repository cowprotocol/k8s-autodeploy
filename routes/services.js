const express = require('express')
const router = express.Router()
const spawnSync = require('child_process').spawnSync
const debug = require('debug')('k8s-autodeploy:services')

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
      case 'staging':
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

  debug('NEW restart request. Services => %s, DockerTag => %s', req.params.services, dockerTag)

  Promise.all(
    services.map(service => {
      let deploymentName = deployment.getNameFromDockerTag(service, dockerTag)
      if (deploymentName) {
        return deployment.restart(deploymentName).then(() => {
          debug('Deployment restarted => %s', deploymentName)
        })
      } else {
        return Promise.reject(new Error(`There is not deployment defined for this docker tag => ${dockerTag}`))
      }
    })
  ).then(result => {
    debug('ALL requested deployments have been restarted => %s', req.params.services)
    res.status(200).json({})
  }).catch(error => {
    debug('[ERROR] Deployment couldn\'t restart. Reason => %s', error)
    res.status(500).json({})
  })
})

module.exports = router
