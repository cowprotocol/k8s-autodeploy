const express = require('express')
const router = express.Router()
const exec = require('child_process').exec

const processCommandOutput = command => {
  return new Promise((resolve, reject) => {
    exec(command, (e, stdo, stde) => {
      e ? reject(stde) : resolve(stdo)
    })
  })
}

const deployment = {
  saveConfig (deploymentName, outputDir) {
    return processCommandOutput(`kubectl get deployment ${deploymentName} -o yaml > ${outputDir}/${deploymentName}.yaml`)
  },
  delete (deploymentName) {
    return processCommandOutput(`kubectl delete deployment ${deploymentName}`)
  },
  applyConfig (deploymentName, configDir) {
    return processCommandOutput(`cat ${configDir}/${deploymentName}.yaml | kubectl apply -f -`)
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

/* GET home page. */
router.post('/:serviceName', function (req, res, next) {
  // const images = req.body.push_data.images
  const dockerTag = req.body.push_data.tag
  const serviceName = req.params.serviceName
  const deploymentDir = '/tmp'
  let deploymentName = getDeploymentName(serviceName, dockerTag)

  deployment.saveConfig(deploymentName, deploymentDir).then(result => {
    return deployment.delete(deploymentName).then(() => {
      return deployment.applyConfig(deploymentName, deploymentDir).then(() => {
        res.status(200).json({})
      })
    })
  }).catch(error => { res.status(500).json({'error': error}) })
})

module.exports = router
