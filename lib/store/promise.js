function isPromise (val) {
  return val && typeof val.then === 'function'
}

export default function promiseMiddleware ({dispatch}) {
  return (next) => (action) =>
    isPromise(action)
      ? action.then(results => results && dispatch(results))
      : next(action)
}
