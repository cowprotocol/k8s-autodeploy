const debug = require('debug')('k8s-autodeploy:services')

class NotSupportedDockerTagError extends Error {
  constructor (message) {
    super(message)
    this.name = 'NotSupportedDockerTagError'
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

module.exports = {
  commonErrorHandler, NotSupportedDockerTagError
}
