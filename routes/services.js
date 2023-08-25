const express = require('express')
const router = express.Router()
const debug = require('debug')('k8s-autodeploy:services')
const { deployment } = require('../util/commands')
const {NotSupportedDockerTagError, commonErrorHandler} = require('../util/errors');

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
