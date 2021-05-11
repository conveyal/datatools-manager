export default function multiMiddleware ({dispatch}) {
  return (next) => (action) =>
    Array.isArray(action)
      ? action.filter(Boolean).map(dispatch)
      : next(action)
}
