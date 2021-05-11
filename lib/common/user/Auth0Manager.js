// @flow

import auth0 from 'auth0-js'
import Auth0Lock from 'auth0-lock'
import { push } from 'connected-react-router'
import decode from 'jwt-decode'
import uuidv4 from 'uuid/v4'

import * as userActions from '../../manager/actions/user'
import {getComponentMessages, getConfigProperty} from '../util/config'

const clientID = process.env.AUTH0_CLIENT_ID || ''
const domain = process.env.AUTH0_DOMAIN || ''
const auth0Client = new auth0.WebAuth({ domain, clientID })
const DEFAULT_SCOPE = 'app_metadata profile email openid user_metadata'

class Auth0Manager {
  isTryingToGetProfileFromToken: boolean
  isTryingToRenewExpiredToken: boolean
  lock: ?Auth0Lock
  lockOptions: any

  /**
   * Get an Auth0Lock instance.  If one isn't available, create it.
   * I put this here because this will get called after all the config is loaded.
   * The `this.lockOptions` variable is meant to be injected in a testing environment
   *
   * @return {Object} An auth0 lock instance
   */
  getLock (): Auth0Lock {
    if (!this.lock) {
      this.lock = new Auth0Lock(
        clientID,
        domain,
        // NOTE: The `this.lockOptions` variable is meant to be injected in a
        // testing environment.
        this.lockOptions || {
          allowSignUp: false,
          auth: {
            params: { scope: DEFAULT_SCOPE },
            redirect: false,
            responseType: 'token id_token'
          },
          autoclose: true,
          closable: true,
          languageDictionary: {
            title: getComponentMessages('Login')('title')
          },
          theme: {
            logo: getConfigProperty('application.logo_large') || undefined,
            primaryColor: '#2389c9'
          }
        }
      )
    }

    return this.lock
  }

  /**
   * Use the access token (token for API calls) to get the user's profile.
   * We can't fetch the profile data all the time because we'll get 429'ed by
   * Auth0.  Therfore, we also store the profile data in localStorage, but we
   * assume that the profile data is only valid for 60 seconds since it is
   * possible that the profile data could have changed since we last logged in.
   *
   * @param  {String} accessToken auth0 access token
   * @return {Object}             auth0 profile
   */
  _getProfileFromToken (accessToken: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const profile = getProfile()
      if (
        profile &&
        profile.accessToken === accessToken &&
        profile.dataExpirationTimestamp > (new Date()).getTime()
      ) {
        return resolve(profile)
      }
      this.getLock().getUserInfo(accessToken, (err, profile) => {
        if (err) reject(err)
        else {
          profile.accessToken = accessToken
          // set data expiration timestamp to be 60 seconds into the future
          profile.dataExpirationTimestamp = (new Date()).getTime() + 60000
          // The user_id might not be provided in certain cases, so try to use
          // the `sub` field instead.
          // See https://community.auth0.com/t/missing-user-id-from-user-profile/11457/7
          profile.user_id = profile.user_id || profile.sub
          if (!profile.user_id) {
            return reject(new Error('Could not determine user_id for user!'))
          }
          setProfile(profile)
          resolve(profile)
        }
      })
    })
  }

  hideLock () {
    this.getLock().hide()
  }

  /**
   * Push browser to login route, set up lock listeners, and show the lock
   * widget.
   *
   * @param  {Function} [onHide=noop function]
   *   A function to perform if a user closes the lock without logging in
   * @param  {Function} [push]                  A dispatch-aware action function
   * @param  {Function} receiveTokenAndProfile  A dispatch-aware action function
   * @param  {Mixed} [redirectOnSuccess=false]
   *   The string of the route to redirect to upon login success
   */
  loginWithLock ({
    onHide = () => {},
    push,
    receiveTokenAndProfile,
    redirectOnSuccess
  }: {
    onHide?: () => any,
    push: (string) => void,
    receiveTokenAndProfile: typeof userActions.receiveTokenAndProfile,
    redirectOnSuccess?: string
  }) {
    if (!window.location.pathname.endsWith('/login')) {
      // When login is called, redirect to /login (which must be listed as an
      // Auth0 callback in client settings).
      push && push('/login')
    }
    const lock = this.getLock()

    // Set up listeners for on hide and on authenticated
    let hideFn = onHide
    lock.on('hide', () => hideFn())
    // These listeners make sure the onHide function is not called
    // after a successful login
    const clearOnHideFn = () => { hideFn = () => {} }
    const registerOnHideFn = () => { hideFn = onHide }
    lock.on('signin submit', clearOnHideFn)
    lock.on('signup submit', clearOnHideFn)
    lock.on('authorization_error', registerOnHideFn)

    // On successful authentication, handle auth result and hide lock (using
    // noop function set by 'on signin submit' listener).
    lock.on('authenticated', (authResult) => {
      this._receiveAuthResult({
        authResult,
        push,
        receiveTokenAndProfile,
        redirectOnSuccess
      })

      this.hideLock()
    })

    // Finally, show the lock widget for log in.
    lock.show()
  }

  /**
   * Log a user out from this auth0 client
   * - remove token from localStorage
   * - make a call to auth0 to logout
   */
  logout () {
    if (window.location.pathname !== '/') {
      // Push browser to root page (publicly visible) before token removal, so
      // that the application doesn't try to show the lock widget because the
      // user is no longer authenticated to view the access-restricted page.
      push('/')
    }
    removeTokens()
    const {origin} = window.location
    window.location.replace(`https://${domain}/v2/logout?returnTo=${origin}&client_id=${clientID}`)
  }

  /**
   * Recive an authResult and dispatch appropriate actions
   *
   * @param  {Object} authResult                The authResult
   * @param  {Action} [push]                    react-router-redux push
   * @param  {Action} receiveTokenAndProfile
   * @param  {String} [redirectOnSuccess=false] A possible route to redirect to upon success
   * @return {Mixed}                            actions
   */
  _receiveAuthResult ({
    authResult,
    push,
    receiveTokenAndProfile,
    redirectOnSuccess
  }: {
    authResult: any,
    push?: (string) => void,
    receiveTokenAndProfile: typeof userActions.receiveTokenAndProfile,
    redirectOnSuccess?: string
  }) {
    if (!authResult) return receiveTokenAndProfile()
    const {accessToken, idToken} = authResult
    setAccessToken(accessToken)
    setIdToken(idToken)
    // Get profile with access token and return profile and ID token to store.
    return this._getProfileFromToken(accessToken)
      .then(profile => {
        const actions = [
          receiveTokenAndProfile({
            token: idToken,
            profile
          })
        ]
        if (push && redirectOnSuccess) {
          actions.push(push(redirectOnSuccess))
        }
        return actions
      })
      .catch((err) => {
        console.error('An error occurred while trying to get the user profile', err)
        removeTokens()
        return receiveTokenAndProfile()
      })
  }

  /**
   * Renew session by following these steps:
   * 1. Renew the user's session if needed.
   * 2. If user token hasn't yet expired, use it.
   * 3. If token has expired, try to silently renew it.
   * 4. Logout user if session renewal fails.
   *
   * @param  {Function} receiveTokenAndProfile an action function
   * @param  {Function} logout                 an action function
   * @param  {Boolean} userIsLoggedIn
   * @return {Mixed}  Return is dependent on what actions need to happen
   */
  renewSessionIfNeeded ({
    logout,
    receiveTokenAndProfile,
    userIsLoggedIn
  }: {
    logout: (boolean) => any,
    receiveTokenAndProfile: (any) => any,
    userIsLoggedIn: boolean
  }) {
    // Get the ID token if we've saved it in localStorage before
    const idToken = getIdToken()

    if (idToken) {
      // user has logged in before
      // check if token is expired
      if (tokenIsExpired(idToken)) {
        // FIXME: is there a need to check expiration of the access token?
        // expired, try to refresh token
        if (this.isTryingToRenewExpiredToken) {
          return []
        }

        this.isTryingToRenewExpiredToken = true
        return (
          renewAuth()
            .then((authResult) => {
              this.isTryingToRenewExpiredToken = false
              return this._receiveAuthResult({
                authResult,
                receiveTokenAndProfile
              })
            })
            .catch((err) => {
              this.isTryingToRenewExpiredToken = false
              console.error('an error occurred while trying to log in', err)
              return logout(userIsLoggedIn)
            })
        )
      } else {
        // Token is still valid.  However, it is possible that the profile data
        // of the user has changed since we last logged in.  Therefore, we must
        // periodically refetch the profile data.
        if (this.isTryingToGetProfileFromToken) {
          return []
        }

        // we need to get profile from token
        this.isTryingToGetProfileFromToken = true

        const accessToken = getAccessToken()
        if (!accessToken) return logout(userIsLoggedIn)
        // try to get the profile from localStorage
        return this._getProfileFromToken(accessToken)
          .then((profile) => {
            this.isTryingToGetProfileFromToken = false
            return receiveTokenAndProfile({
              token: idToken,
              profile
            })
          })
          .catch((err) => {
            this.isTryingToGetProfileFromToken = false
            console.error('an error occurred while trying to get the token', err)
            return logout(userIsLoggedIn)
          })
      }
    } else {
      // user hasn't logged in before
      return logout(userIsLoggedIn)
    }
  }

  resetPassword () {
    this.getLock().show({
      allowLogin: false,
      allowSignUp: false
    })
  }
}

/**
 * Retrieves the access token from localStorage. The access token is the
 * credential used to get the user profile from Auth0.
 * @return {String} auth0 access token
 */
function getAccessToken () {
  return window.localStorage.getItem('accessToken')
}

/**
 * Retrieves the ID token from localStorage. The ID token is used by the
 * application in API calls as with Bearer as the Authorization header.
 * @return {String} auth0 ID token
 */
function getIdToken () {
  return window.localStorage.getItem('idToken')
}

/**
 * Get the profile from localStorage and parse it.
 * @return {Object}
 */
function getProfile (): ?Object {
  return JSON.parse(window.localStorage.getItem('profile'))
}

/**
 * Check that the decoded token matches the nonce.
 */
function nonceMatches (token, nonce) {
  try {
    const decoded = decode(token)
    return decoded.nonce === nonce
  } catch (err) {
    console.log(err)
    return false
  }
}

/**
 * Remove both access and ID tokens stored in localStorage.
 */
function removeTokens () {
  window.localStorage.removeItem('accessToken')
  window.localStorage.removeItem('idToken')
  window.localStorage.removeItem('profile')
}

/**
 * Attempt to silently renew the session.
 *
 * @return {Promise} if successful, returns an authResult
 */
function renewAuth () {
  return new Promise((resolve, reject) => {
    const nonce = uuidv4()
    auth0Client.renewAuth({
      audience: '',
      nonce,
      postMessageDataType: 'auth0:silent-authentication',
      redirectUri: window.location.origin + '/api/auth0-silent-callback',
      scope: DEFAULT_SCOPE,
      usePostMessage: true
    }, (err, authResult) => {
      if (err) {
        console.log('Failed to renew log in.')
        reject(err)
      } else if (!authResult.accessToken) {
        const err = new Error('accessToken not received from auth0')
        console.log(authResult)
        reject(err)
      } else if (!nonceMatches(authResult.idToken, nonce)) {
        const err = new Error('Nonce string does not match!')
        reject(err)
      } else {
        console.log('renewed auth successfully!')
        resolve(authResult)
      }
    })
  })
}

/**
 * Store the access token in local storage. The access token is the credential
 * used to get the user profile from Auth0. More info:
 * https://auth0.com/docs/tokens/access-token
 * @param {String} token Auth0 access token
 */
function setAccessToken (token: string) {
  window.localStorage.setItem('accessToken', token)
}

/**
 * Store the ID token in local storage. The ID token is used by the
 * application in API calls as with Bearer as the Authorization header. More:
 * https://auth0.com/docs/tokens/id-token
 * @param {String} token Auth0 ID token
 */
function setIdToken (token: string) {
  window.localStorage.setItem('idToken', token)
}

function setProfile (profile: Object) {
  window.localStorage.setItem('profile', JSON.stringify(profile))
}

/**
 * See if a token has expired
 * @param  {String}  token The auth0 token
 * @return {Boolean}       Returns true if token is expired
 */
function tokenIsExpired (token) {
  try {
    const decoded = decode(token)
    if (!decoded.exp) {
      // shouldn't happen, but assume it doesn't expire?
      return false
    }

    return (new Date()).getTime() > decoded.exp * 1000
  } catch (err) {
    console.log(err)
    return true
  }
}

const manager = new Auth0Manager()
export default manager
