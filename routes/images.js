const express = require('express')
const router = express.Router()
const debug = require('debug')('k8s-autodeploy:services')
const {executeCommand, deployment} = require('../util/commands')
const {commonErrorHandler} = require('../util/errors');

// Restart all deployments that run a specific image
router.post('/:images/rollout', async function (request, response, next) {
  const dockerTag = request.body.push_data.tag
  const images = request.params.images.split(',')

  debug('NEW rollout request. Images => %s, DockerTag => %s', request.params.images, dockerTag)
  // Gets all deployments running any of the given images separated by space
  const command = `kubectl get deployments -o jsonpath="{range .items[*]}{.metadata.name}{' '}{.spec.template.spec.containers[*].image}{'\\n'}{end}" | grep "${images.join("\|")}" | awk '{print $1}' ORS=' '`
  const deployments = (await executeCommand('sh', ['-c', command])).trim();
  debug('Found deployments => %s', deployments)
  await Promise.all(
    deployments.split(' ').map(async deploymentName => {
      await deployment.rollout(deploymentName);
      debug('Deployment rolled out => %s', deploymentName)
    })
  ).catch(error => {
    debug('Error => %s', error)
    commonErrorHandler(error, response, next)
  });
  response.status(200).json({})
})

module.exports = router
