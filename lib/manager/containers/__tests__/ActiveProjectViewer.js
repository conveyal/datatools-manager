// @flow

import ActiveProjectViewer from '../ActiveProjectViewer'
import mockData from '../../../../__tests__/test-utils/mock-data'

const {store} = mockData

describe('lib > manager > ActiveProjectViewer', () => {
  it('should render with newly created project', () => {
    const mockState = store.getMockStateWithProject()
    expect(
      store.mockWithProvider(
        ActiveProjectViewer,
        mockState.router,
        mockState
      ).snapshot()
    ).toMatchSnapshot()
  })
})
