const express = require('express')
const router = express.Router()
const spawnSync = require('child_process').spawnSync
const debug = require('debug')('k8s-autodeploy:services')

class NotSupportedDockerTagError extends Error {
  constructor (message) {
    super(message)
    this.name = 'NotSupportedDockerTagError'
  }
}

const executeCommand = (command, args, options = undefined) => {
  let result = spawnSync(command, args, options)

  if (result.status === 0) {
    return Promise.resolve(result.stdout.toString())
  } else {
    return Promise.reject(result.stderr.toString())
  }
}

const commonErrorHandler = (error, response, next) => {
  if (error instanceof NotSupportedDockerTagError) {
    debug('[WARNING] Reason => %s', error)
    response.status(412).json({})
  } else if (error.includes('NotFound')) {
    // Replace `Error` word because it is a warning message
    let warningMessage = error.replace('Error', '')

    debug('[WARNING] %s', warningMessage)
    response.status(412).json({})
  } else {
    // Default error handler
    next(error)
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
      case 'release':
        return `release-${serviceName}`
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
  },
  rollout (deploymentName) {
    return this.getConfig(deploymentName).then(config => {
      return executeCommand('kubectl', ['rollout', 'restart', 'deployment/' + deploymentName])
    })
  }
}

// Restart deployment
router.post('/:services/restart', function (request, response, next) {
  const dockerTag = request.body.push_data.tag
  const services = request.params.services.split(',')

  debug('NEW restart request. Services => %s, DockerTag => %s', request.params.services, dockerTag)

  Promise.all(
    services.map(service => {
      let deploymentName = deployment.getNameFromDockerTag(service, dockerTag)
      if (deploymentName) {
        return deployment.restart(deploymentName).then(() => {
          debug('Deployment restarted => %s', deploymentName)
        })
      } else {
        return Promise.reject(new NotSupportedDockerTagError(`This image tag is not supported for autodeploying => ${dockerTag}`))
      }
    })
  ).then(result => {
    debug('ALL requested deployments have been restarted => %s', request.params.services)
    response.status(200).json({})
  }).catch(error => {
    return commonErrorHandler(error, response, next)
  })
})

// Rollout deployment
router.post('/:services/rollout', function (request, response, next) {
  const dockerTag = request.body.push_data.tag
  const services = request.params.services.split(',')

  debug('NEW rollout request. Services => %s, DockerTag => %s', request.params.services, dockerTag)

  Promise.all(
    services.map(service => {
      let deploymentName = deployment.getNameFromDockerTag(service, dockerTag)
      if (deploymentName) {
        return deployment.rollout(deploymentName).then(() => {
          debug('Deployment rolled out => %s', deploymentName)
        })
      } else {
        return Promise.reject(new NotSupportedDockerTagError(`This image tag is not supported for autodeploying => ${dockerTag}`))
      }
    })
  ).then(result => {
    debug('ALL requested deployments have been rolled out => %s', request.params.services)
    response.status(200).json({})
  }).catch(error => {
    return commonErrorHandler(error, response, next)
  })
})

module.exports = router
