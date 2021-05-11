// @flow

import * as React from 'react'

import CurrentStatusMessage from '../containers/CurrentStatusMessage'
import CurrentStatusModal from '../containers/CurrentStatusModal'
import ConfirmModal from './ConfirmModal'
import SelectFileModal from './SelectFileModal'
import Title from './Title'
import InfoModal from './InfoModal'
import ActiveSidebar from '../containers/ActiveSidebar'
import ActiveSidebarNavItem from '../containers/ActiveSidebarNavItem'
import PageContent from '../containers/PageContent'

import { getConfigProperty, isModuleEnabled } from '../util/config'

type Props = {
  children?: React.Node,
  title?: string
}

export default class ManagerPage extends React.Component<Props> {
  showInfoModal (props: any) {
    this.refs.infoModal.open(props)
  }

  showConfirmModal (props: any) {
    this.refs.confirmModal.open(props)
  }

  showSelectFileModal (props: any) {
    this.refs.selectFileModal.open(props)
  }

  isActive (path: string) {
    return window.location.pathname.split('/')[1] === path
  }

  render () {
    const {title} = this.props
    const homeIsActive = this.isActive('home') || this.isActive('feed') || this.isActive('project')
    const appTitle = getConfigProperty('application.title') || 'Data Tools'
    const changelogUrl: ?string = getConfigProperty('application.changelog_url')
    const docsUrl: ?string = getConfigProperty('application.docs_url')
    const supportEmail: ?string = getConfigProperty('application.support_email')
    return (
      <div>
        <Title>{`${appTitle}${title ? ` - ${title}` : ''}`}</Title>
        <CurrentStatusMessage />
        <ConfirmModal />
        <InfoModal />
        <SelectFileModal />
        <CurrentStatusModal />
        <ActiveSidebar>
          <ActiveSidebarNavItem
            icon='home'
            label='Home'
            link={`/home`}
            active={homeIsActive} />
          {isModuleEnabled('alerts')
            ? <ActiveSidebarNavItem
              icon='exclamation-circle'
              label='Alerts'
              link={`/alerts`}
              active={this.isActive('alerts')} />
            : null
          }
        </ActiveSidebar>
        <PageContent>
          <div
            style={{
              padding: '20px',
              paddingBottom: '140px',
              minHeight: '100%',
              marginBottom: '-140px',
              // minHeight: '500px',
              position: 'relative'
            }}
          >
            {this.props.children}
          </div>

          <footer className='manager-footer'>
            <div className='container'>
              <ul className='list-inline text-center text-muted'>
                {changelogUrl && <li><a href={changelogUrl}>Changelog</a></li>}
                {docsUrl && <li><a href={docsUrl}>Guide</a></li>}
                {supportEmail && <li><a href={`mailto:${supportEmail}`}>Contact</a></li>}
              </ul>
              <p className='text-center text-muted'>
                <span role='img' title='Copyright' aria-label='copyright'>
                  &copy;
                </span>{' '}
                <a href='https://www.ibigroup.com'>IBI Group</a>
              </p>
            </div>
          </footer>
        </PageContent>

      </div>
    )
  }
}
