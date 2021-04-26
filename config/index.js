// List of additional docker tags than the base ones (develop, staging, release, nightly)
// K8S-Autodeploy will be able to work with.
const ADDITIONAL_DOCKER_TAGS = process.env.ADDITIONAL_DOCKER_TAGS ? process.env.ADDITIONAL_DOCKER_TAGS.split(',') : []

module.exports = {
  ADDITIONAL_DOCKER_TAGS
}
