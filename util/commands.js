const config = require('../config')
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
        return `${serviceName}`
      case 'nightly':
        return `dev-${serviceName}`
      case 'release':
        return `release-${serviceName}`
      case 'staging':
        return `staging-${serviceName}`
      default:
        // If config.ADDITIONAL_DOCKER_TAGS contains the docker tag
        if(config.ADDITIONAL_DOCKER_TAGS.includes(dockerTag)) {
          return `${dockerTag}-${serviceName}`
        } else {
          return null
        }
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

module.exports = {
  deployment, executeCommand
}
