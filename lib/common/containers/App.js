// @flow

// minified file is imported because of https://github.com/bugsnag/bugsnag-js/issues/366
import bugsnag from 'bugsnag-js/dist/bugsnag.min'
import createPlugin from 'bugsnag-react'
import omit from 'lodash/omit'
import * as React from 'react'
import {connect} from 'react-redux'
import { Route, Switch } from 'react-router-dom'
import { push } from 'connected-react-router'
import { ConnectedRouter } from 'connected-react-router/immutable'
import { toast } from 'react-toastify'

import AdminPage from '../../admin/components/AdminPage'
import MainAlertsViewer from '../../alerts/containers/MainAlertsViewer'
import ActiveAlertEditor from '../../alerts/containers/ActiveAlertEditor'
import PageNotFound from '../components/PageNotFound'
import ActiveGtfsEditor from '../../editor/containers/ActiveGtfsEditor'
import Login from './Login'
import * as statusActions from '../../manager/actions/status'
import * as userActions from '../../manager/actions/user'
import ActiveFeedSourceViewer from '../../manager/containers/ActiveFeedSourceViewer'
import ActiveProjectsList from '../../manager/containers/ActiveProjectsList'
import ActiveProjectViewer from '../../manager/containers/ActiveProjectViewer'
import ActivePublicLandingPage from '../../public/containers/ActivePublicLandingPage'
import ActiveUserAccount from '../../public/containers/ActiveUserAccount'
import ActiveUserHomePage from '../../manager/containers/ActiveUserHomePage'
import CreateProject from '../../manager/containers/CreateProject'
import ActiveGtfsPlusEditor from '../../gtfsplus/containers/ActiveGtfsPlusEditor'
import {logPageView} from '../util/analytics'
import type {dispatchFn, getStateFn, AppState, ManagerUserState} from '../../types/reducers'

type AuthWrapperProps = {
  checkLogin: typeof userActions.checkLogin,
  fetchAppInfo: typeof statusActions.fetchAppInfo,
  login: typeof userActions.login,
  user: ManagerUserState
}

function getDisplayName (WrappedComponent: any) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component'
}

/**
 * This is a higher-order component that wraps the input component in
 * authorization checks to determine whether the piece of the application is
 * accessible by the logged in (or not) user. It connects AuthStrategyWrapper
 * to the redux store in order to provide access to some user auth actions and
 * the user object stored in the app state.
 */
function wrapComponentInAuthStrategy (
  WrappedComponent: React.Component<*>,
  requireAuth?: boolean,
  requireAdmin?: boolean
): React.Component<AuthWrapperProps> {
  class AuthStrategyWrapper extends React.Component<AuthWrapperProps> {
    componentDidMount () {
      const {checkLogin, fetchAppInfo, user} = this.props
      const userIsLoggedIn: boolean = !!user.token
      // Fetch app info before component mounts in order to ensure that checks
      // for enabled modules result use the correct config data.
      fetchAppInfo()
        .then(() => {
          checkLogin(userIsLoggedIn)
          if (userIsLoggedIn) {
            this._checkIfAdmin()
          }
        })
    }

    componentDidUpdate (prevProps) {
      const {login, user} = this.props
      // First check to see if admin privileges are needed.
      this._checkIfAdmin()
      if (
        // Auth required and user is not logged in.
        (requireAuth && !user.isCheckingLogin && !user.token) // ||
        // Token existed previously, but was removed in next props.
        // FIXME: Is this second condition needed here?
        // (this.props.user.token && !user.token)
      ) {
        // If auth is required and the user is not logged in, trigger a log in,
        // which will change the route to '/login' and show the auth0 lock.
        const redirectUrl: string = window.location.pathname
        login(redirectUrl)
      }
    }

    _userHasAdminViewPrivileges () {
      const {user} = this.props
      if (!user || !user.permissions) return false
      if (user.permissions.isApplicationAdmin()) return true
      if (user.permissions && user.permissions.canAdministerAnOrganization()) return true
    }

    _checkIfAdmin () {
      if (requireAdmin &&
        !this.props.user.isCheckingLogin &&
        !this._userHasAdminViewPrivileges()
      ) {
        // If an authenticated, non-admin user attempts to visit an admin page,
        // send them back to the root page.
        push('/')
      }
    }

    render () {
      const {user} = this.props
      if (requireAuth && !user.token) {
        // If user is not authenticated and the page requires it, return the
        // unauthorized user page. We should only get to this point if there is
        // a slight delay in the component lifecycle.
        // When the component receives props, a check for auth will trigger the
        // login with lock.
        return null
      } else {
        // Otherwise, check for admin access and finally just return the page.
        if (requireAdmin && !this._userHasAdminViewPrivileges()) {
          // If admin privileges are required, but the user is not authorized.
          return (
            <div>
              <p>You have attempted to view a restricted page without proper credentials</p>
            </div>
          )
        } else {
          // User is authenticated to view page or it is a public route.
          return (
            <WrappedComponent
              // Pass props to wrapped component except for auth-specific props
              {...omit(this.props, ['checkLogin', 'children', 'user'])} />
          )
        }
      }
    }
  }
  AuthStrategyWrapper.displayName = `AuthStrategyWrapper(${getDisplayName(WrappedComponent)})`
  const {checkLogin, login} = userActions
  const {fetchAppInfo} = statusActions
  return connect(
    // state to props
    (state: AppState) => ({user: state.user}),
    // dispatch to props
    {checkLogin, fetchAppInfo, login}
  )(AuthStrategyWrapper)
}

function loginOptional (WrappedComponent) {
  return wrapComponentInAuthStrategy(WrappedComponent)
}

const authRequired = (WrappedComponent) => (wrapComponentInAuthStrategy(WrappedComponent, true))

const adminRequired = (WrappedComponent) => (wrapComponentInAuthStrategy(WrappedComponent, true, true))

type AppProps = {
  history: any,
  store: {
    dispatch: dispatchFn,
    getState: getStateFn
  }
}

export default class App extends React.Component<AppProps> {
  render () {
    const {history} = this.props
    const router = (
      <ConnectedRouter
        history={history}
        onUpdate={logPageView}>
        <Switch>
          <Route
            exact
            path={'/'}
            component={loginOptional(ActivePublicLandingPage)} />
          <Route
            path={'/settings(/:subpage)(/:projectId)'}
            component={authRequired(ActiveUserAccount)} />
          <Route
            path={'/admin(/:subpage)'}
            component={adminRequired(AdminPage)} />
          <Route
            path={'alerts'}
            component={authRequired(MainAlertsViewer)} />
          <Route
            path={'alerts/new'}
            component={authRequired(ActiveAlertEditor)} />
          <Route
            path={'alert/:alertId'}
            component={authRequired(ActiveAlertEditor)} />
          <Route
            path={['/home', 'home/:id']}
            component={authRequired(ActiveUserHomePage)} />
          <Route
            path={'/login'}
            component={Login} />
          <Route
            exact
            path={'/project'}
            component={authRequired(ActiveProjectsList)} />
          <Route
            path={'/project/new'}
            component={authRequired(CreateProject)} />
          <Route
            path={'/project/:projectId(/:subpage)(/:subsubpage)'}
            component={authRequired(ActiveProjectViewer)} />
          <Route
            path={'/feed/:feedSourceId/edit(/:activeComponent)(/:activeEntityId)(/:subComponent)(/:subEntityId)(/:subSubComponent)(/:activeSubSubEntity)'}
            component={authRequired(ActiveGtfsEditor)} />
          <Route
            path={'/feed/:feedSourceId(/version/:feedVersionIndex)(/:subpage)(/:subsubpage)'}
            component={authRequired(ActiveFeedSourceViewer)} />
          <Route
            path={'/gtfsplus/:feedSourceId/:feedVersionId'}
            component={authRequired(ActiveGtfsPlusEditor)} />
          <Route component={loginOptional(PageNotFound)} />
        </Switch>
      </ConnectedRouter>
    )
    // Initialize toast notifications.
    toast.configure()
    // Configure bugsnag if key is provided.
    if (process.env.BUGSNAG_KEY) {
      const bugsnagClient = bugsnag(process.env.BUGSNAG_KEY)
      const ErrorBoundary = bugsnagClient.use(createPlugin(React))
      return (
        <ErrorBoundary>
          {router}
        </ErrorBoundary>
      )
    } else {
      return router
    }
  }
}
