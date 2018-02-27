const express = require('express')
const router = express.Router()
const exec = require('child_process').exec

/* GET home page. */
router.post('/:serviceName', function (req, res, next) {
  const processCommandOutput = command => {
    return new Promise((resolve, reject) => {
      exec(command, (e, stdo, stde) => {
        e ? reject(stde) : resolve(stdo)
      })
    })
  }

  // const images = req.body.push_data.images
  const tag = req.body.push_data.tag
  const serviceName = req.params.serviceName
  let deploymentName

  switch (tag) {
    case 'develop':
      deploymentName = `dev-${serviceName}`
      break
    case 'master':
      deploymentName = `staging-${serviceName}`
      break
    default:
      break
  }

  processCommandOutput(`kubectl get deployment ${deploymentName} -o yaml > /tmp/${deploymentName}.yaml`)
  .then(result => {
    return processCommandOutput(`kubectl delete deployment ${deploymentName}`).then(() => {
      return processCommandOutput(`cat /tmp/${deploymentName}.yaml | kubectl apply -f -`).then(() => {
        return res.status(200).json({'restart': 'OK'})
      })
    })
  }).catch(
    error => { res.status(400).json({'error': error}) }
  )
})

module.exports = router
