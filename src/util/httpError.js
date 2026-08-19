import errorObject from './errorObject.js'

export default (nextFunction, error, req, errorStatusCode = 500) => {
    const errorObj = errorObject(error, req, errorStatusCode)
    return nextFunction(errorObj)
}
