// @flow

import {POINT_TYPE} from '../editor/constants'
import {
  AUTO_DEPLOY_TYPES,
  FEED_TRANSFORMATION_TYPES,
  FETCH_FREQUENCIES,
  RETRIEVAL_METHODS
} from '../common/constants'

import type UserPermissions from '../common/user/UserPermissions'

type InputType =
  'TEXT' |
  'URL' |
  'LANGUAGE' |
  'DATE' |
  'COLOR' |
  'DROPDOWN' |
  'GTFS_ID' |
  'TIMEZONE' |
  'EMAIL' |
  'LATITUDE' |
  'LONGITUDE' |
  'GTFS_ZONE' |
  'GTFS_STOP' |
  'GTFS_AGENCY' |
  'POSITIVE_INT' |
  'GTFS_ROUTE' |
  'GTFS_SERVICE' |
  'GTFS_BLOCK' |
  'GTFS_SHAPE' |
  'GTFS_TRIP' |
  'TIME' |
  'POSITIVE_NUM' |
  'DAY_OF_WEEK_BOOLEAN' |
  'NUMBER' |
  'GTFS_FARE' |
  'EXCEPTION_DATE'

export type RtdEntity = {
  AgencyId: string,
  AlertId: number,
  EditedBy: string,
  EditedDate: string,
  Id: number,
  RouteId: ?string,
  RouteShortName: ?string,
  RouteType: ?number,
  ServiceAlertTrips: Array<any>,
  StopCode: ?string,
  StopId: ?string,
  TripId: ?string
}

export type RtdAlert = {
  Cause: string,
  DescriptionText: string,
  DescriptionText: string,
  EditedBy: string,
  EditedDate: string,
  Effect: string,
  EndDateTime: number,
  HeaderText: string,
  Id: string,
  Published: string,
  ServiceAlertEntities: Array<RtdEntity>,
  StartDateTime: number,
  Url: string
}

export type Bounds = {
  east: number,
  north: number,
  south: number,
  west: number
}

export type Style = {[string]: string | number}

export type Route = {
  agencyId: string,
  feedId: string,
  gtfsRouteId: string,
  gtfsRouteType: string,
  id: ?string,
  numberOfTrips?: number,
  publicly_visible: string,
  routeBrandingUrl: string,
  routeColor: string,
  routeDesc: string,
  routeLongName: ?string,
  routeShortName: ?string,
  routeTextColor: string,
  routeUrl: string,
  status: string,
  wheelchairBoarding: string
}

export type Calendar = {|
  description: string,
  endDate: string,
  feedId: string,
  friday: boolean,
  gtfsServiceId: string,
  id: string,
  monday: boolean,
  numberOfTrips: number,
  routes: Array<Route>,
  saturday: boolean,
  startDate: string,
  sunday: boolean,
  thursday: boolean,
  tuesday: boolean,
  wednesday: boolean
|}

export type Coordinate = [number, number]

export type Coordinates = Array<Coordinate>

export type GeoJsonPoint = {
  bbox?: Array<number>,
  crs?: { properties: mixed, type: string },
  geometry: {
    bbox?: Array<number>,
    coordinates: Coordinate,
    crs?: { properties: mixed, type: string },
    type: 'Point'
  },
  type: 'Feature'
}

export type ControlPoint = {
  distance: number,
  hidden?: boolean,
  id: string | number,
  point: GeoJsonPoint,
  // FIXME: fields from ShapePoint
  pointType: $Values<typeof POINT_TYPE>,
  shapeDistTraveled?: number,
  shapePtSequence: number,
  snap?: boolean,
  stopId?: string
}

type DatatoolsSettings = {
  client_id: string,
  editor: {
    map_id: string
  },
  hideTutorial: boolean,
  sidebarExpanded: boolean
}

export type Note = {
  body: string,
  date: number,
  id: string,
  type: string,
  userEmail: string
}

export type EC2InstanceSummary = {
  availabilityZone: string,
  deploymentId: string,
  imageId: string,
  instanceId: string,
  instanceType: string,
  jobId: string,
  launchTime: number,
  name: string,
  privateIpAddress: string,
  projectId: string,
  publicDnsName: string,
  publicIpAddress: string,
  state: {
    code: number,
    name: 'pending' | 'running' | 'shutting-down' | 'stopping' | 'stopped' | 'terminated'
  },
  stateTransitionReason: string
}

type EC2Info = {
  amiId: ?string,
  iamInstanceProfileArn: string,
  instanceCount: number,
  instanceType: string,
  keyName: string,
  securityGroupId: string,
  subnetId: string,
  targetGroupArn: string
}

type JobStatus = {
  completed: boolean,
  error: boolean,
  exceptionDetails: ?string,
  exceptionType: ?string,
  initialized: number,
  message: string,
  percentComplete: number,
  startTime: number
}

export type DeploySummary = {
  buildArtifactsFolder: string,
  duration: number,
  ec2Info: ?EC2Info,
  finishTime: number,
  jobId: string,
  otpVersion: string,
  s3Bucket: string,
  serverId: string,
  startTime: number,
  status: JobStatus
}

export type CustomFile = {
  contents?: ?string,
  filename: ?string,
  uri?: ?string,
  useDuringBuild: boolean,
  useDuringServe: boolean
}

// TODO: Remove this eslint rule once https://github.com/babel/babel-eslint/pull/584
// is merged in.
/* eslint-disable no-use-before-define */
export type Deployment = {
  buildGraphOnly?: boolean,
  customBuildConfig: ?string,
  customFiles?: Array<CustomFile>,
  customRouterConfig: ?string,
  dateCreated: number,
  deployJobSummaries: Array<DeploySummary>,
  deployedTo: ?string,
  ec2Instances?: Array<EC2InstanceSummary>,
  feedSourceId: ?string,
  feedVersions: Array<SummarizedFeedVersion>,
  id: string,
  invalidFeedSources?: Array<Feed>,
  isCreating?: boolean,
  lastDeployed: ?number,
  lastUpdated: number,
  latest: ?DeploySummary,
  name: string,
  organizationId: ?string,
  osmExtractUrl: ?string,
  otpVersion: ?string,
  pinnedfeedVersionIds: Array<string>,
  projectBounds: Bounds,
  projectId: string,
  routerId: ?string,
  skipOsmExtract: boolean,
  tripPlannerVersion?: 'OTP_1' | 'OTP_2',
  user: ?any // TODO add more specific type
}

type ResultEntitySummary = {
  errorCount: number,
  fatalException: null | boolean,
  rowCount: number
}

type FeedLoadResult = {
  agency: ResultEntitySummary,
  calendar: ResultEntitySummary,
  calendarDates: ResultEntitySummary,
  completionTime: number,
  errorCount: number,
  fareAttributes: ResultEntitySummary,
  fareRules: ResultEntitySummary,
  fatalException: null | boolean,
  feedInfo: ResultEntitySummary,
  frequencies: ResultEntitySummary,
  loadTimeMillis: number,
  routes: ResultEntitySummary,
  shapes: ResultEntitySummary,
  stopTimes: ResultEntitySummary,
  stops: ResultEntitySummary,
  transfers: ResultEntitySummary,
  trips: ResultEntitySummary,
  uniqueIdentifier: string
}

export type Snapshot = {
  comment: string,
  current: boolean,
  dateCreated: number,
  feedLoadResult: FeedLoadResult,
  feedSourceId: string,
  feedVersionId: null,
  id: string,
  lastUpdated: number,
  name: string,
  namespace: string,
  snapshotOf: string,
  snapshotTime: number,
  user: string,
  version: number
}

export type RetrievalMethod = $Values<typeof RETRIEVAL_METHODS>

export type FetchFrequency = $Values<typeof FETCH_FREQUENCIES>

export type Substitution = {
  description?: string,
  normalizeSpace?: boolean,
  pattern: string,
  replacement: string,
  valid: boolean
}

export type NormalizeFieldFields = {
  capitalizationExceptions: Array<string>,
  capitalize?: boolean,
  fieldName?: string,
  substitutions: Array<Substitution>
}

export type ReplaceFileFromStringFields = {
  csvData?: ?string
}

export type FeedTransformationBase = {
  '@type': $Values<typeof FEED_TRANSFORMATION_TYPES>,
  active: boolean,
  matchField?: string,
  matchValues?: Array<string>,
  sourceVersionId?: string,
  table: ?string
}

export type TransformProps<StateType> = {
  feedSource: Feed,
  index: number,
  onSave: (StateType, number) => void,
  onValidationErrors: (Array<string>) => void,
  transformation: FeedTransformationBase & StateType
}

export type DeleteRecordsTransformation =
  & {typeName: 'DeleteRecordsTransformation'}
  & FeedTransformationBase

export type ReplaceFileFromVersionTransformation =
  & {typeName: 'ReplaceFileFromVersionTransformation'}
  & FeedTransformationBase

export type ReplaceFileFromStringTransformation =
  & {typeName: 'ReplaceFileFromStringTransformation'}
  & FeedTransformationBase
  & ReplaceFileFromStringFields

export type NormalizeFieldTransformation =
  & {typeName: 'NormalizeFieldTransformation'}
  & FeedTransformationBase
  & NormalizeFieldFields

export type FeedTransformation =
  | DeleteRecordsTransformation
  | ReplaceFileFromVersionTransformation
  | ReplaceFileFromStringTransformation
  | NormalizeFieldTransformation

export type FeedTransformRules = {
  active: boolean,
  createNewVersion: boolean,
  retrievalMethods: Array<RetrievalMethod>,
  transformations: Array<FeedTransformation>
}

export type Feed = {
  dateCreated: number,
  deployable: boolean,
  deployments?: Array<Deployment>,
  editorNamespace: ?string,
  editorSnapshots?: Array<Snapshot>,
  externalProperties?: any, // TODO: add more exact type
  feedVersions?: Array<FeedVersion>,
  fetchFrequency?: FetchFrequency,
  fetchInterval?: number,
  id: string,
  isCreating?: boolean,
  isPublic: boolean,
  lastFetched?: ?number,
  lastUpdated?: number,
  latestValidation?: ValidationSummary,
  latestVersionId?: ?string,
  name: string,
  noteCount: number,
  notes?: Array<Note>,
  organizationId: ?string,
  projectId: string,
  publishedValidationSummary?: ValidationSummary,
  publishedVersionId: ?string,
  retrievalMethod: RetrievalMethod,
  s3Url: ?string,
  snapshotVersion: ?string,
  transformRules: Array<FeedTransformRules>,
  url: ?string,
  user: ?any, // TODO: add more exact type
  versionCount: number
}

export type NewFeed = {
  autoFetchFeed?: boolean,
  deployable?: boolean,
  fetchFrequency: FetchFrequency,
  fetchInterval: number,
  name?: string,
  projectId: string,
  retrievalMethod?: string,
  url?: string
}

type ValidationErrorPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'

export type ValidationError = {
  bad_value: string,
  entity_id: string,
  entity_sequence: ?number,
  entity_type: string,
  error_type: string,
  line_number: number
}

export type ValidationResultErrorCount = {
  count: number,
  errors?: Array<ValidationError>,
  message: string,
  priority: ValidationErrorPriority,
  type: string
}

export type ValidationResult = {
  dailyBusSeconds: Array<number>,
  dailyMetroSeconds: Array<number>,
  dailyRailSeconds: Array<number>,
  dailyTotalSeconds: Array<number>,
  dailyTramSeconds: Array<number>,
  dailyTripCounts: Array<number>,
  errorCount: number,
  error_counts?: Array<ValidationResultErrorCount>,
  fatalException: ?string,
  firstCalendarDate: string,
  lastCalendarDate: string,
  loadStatus?: string,
  row_counts?: Array<{
    calendar_dates: number,
    errors: number,
    stops: number,
    trips: number
  }>
}

export type ValidationSummary = {
  agencyCount: number,
  avgDailyRevenueTime: number,
  bounds: Bounds,
  endDate: string,
  errorCount: number,
  feedVersionId: string,
  loadStatus: string,
  routeCount: number,
  startDate: string,
  stopCount: number,
  stopTimesCount: number,
  tripCount: number
}

export type SummarizedFeedVersion = {|
  feedSource: Feed,
  id: string,
  nextVersionId: ?string,
  previousVersionId: ?string,
  updated: number,
  validationResult: ValidationSummary,
  version: number
|}

type TableTransformResult = {
  addedCount: number,
  deletedCount: number,
  tableName: string,
  transformType: 'TABLE_ADDED' | 'TABLE_REPLACED' | 'TABLE_DELETED' | 'TABLE_MODIFIED',
  updatedCount: number
}

export type FeedTransformResult = {
  tableTransformResults: Array<TableTransformResult>
}

export type FeedVersion = {|
  dateCreated: number,
  feedLoadResult: FeedLoadResult,
  feedSource: Feed,
  feedSourceId?: string,
  feedTransformResult?: FeedTransformResult,
  fileSize: number,
  fileTimestamp: number,
  id: string,
  isCreating?: boolean,
  isochrones?: any,
  lastUpdated: number,
  name: string,
  namespace: string,
  nextVersionId: ?string,
  noteCount: number,
  notes: Array<Note>,
  originNamespace: ?string,
  previousVersionId: ?string,
  processedByExternalPublisher: ?number,
  retrievalMethod: ?RetrievalMethod,
  sentToExternalPublisher: ?number,
  updated: number,
  user: string,
  validationResult: ValidationResult,
  validationSummary: ValidationSummary,
  version: number
|}

// TODO: Remove this eslint rule once https://github.com/babel/babel-eslint/pull/584
// is merged in.
/* eslint-enable no-use-before-define */
export type FeedInfo = {
  id: string
}

export type FeedWithValidation = {
  latestValidation: {
    bounds: Bounds
  }
}

export type GeoJsonLinestring = {
  geometry: {
    coordinates: Coordinates,
    type: 'LineString'
  },
  type: 'Feature'
}

export type GeoJsonFeatureCollection = {
  features: Array<GeoJsonLinestring | GeoJsonPoint>,
  type: 'FeatureCollection'
}

export type PatternStop = {
  defaultDwellTime: number,
  defaultTravelTime: number,
  dropOffType: number,
  id: string | number,
  pickupType: number,
  shapeDistTraveled: ?number,
  stopId: string,
  stopSequence: number,
  stop_lat?: number,
  stop_lon?: number,
  timepoint: ?number
}

export type ShapePoint = {
  // Shape point ID and shape ID are optional because the backend will
  // auto-generate one them on insert.
  id?: number,
  pointType: $Values<typeof POINT_TYPE>,
  shapeDistTraveled: number,
  shapeId?: string,
  shapePtLat: number,
  shapePtLon: number,
  shapePtSequence: number
}

export type Pattern = {|
  directionId: ?number,
  id: number,
  name: string,
  patternId: string,
  patternStops: Array<PatternStop>,
  routeId: string,
  shape: {
    coordinates: Coordinates
  },
  shapeId: ?string,
  shapePoints: Array<ShapePoint>,
  useFrequency: boolean
|}

export type GtfsAgency = {|
  agency_branding_url: string,
  agency_email: string,
  agency_fare_url: string,
  agency_id: string,
  agency_lang: string,
  agency_name: string,
  agency_phone: string,
  agency_timezone: string,
  agency_url: string,
  feedId: string,
  id: number
|}

export type FareRule = {
  contains_id: ?string,
  destination_id: ?string,
  fare_id: string,
  id: number,
  origin_id: ?string,
  route_id: ?string
}

export type GtfsFare = {|
  agency_id: ?string,
  currency_type: string,
  description: string,
  fare_id: string,
  fare_rules: Array<FareRule>,
  feedId: string,
  id: number,
  payment_method: string,
  price: number,
  transfer_duration: number,
  transfers: number
|}

export type GtfsSpecField = {
  adminOnly?: boolean,
  bulkEditEnabled?: boolean,
  columnWidth: number,
  datatools?: boolean,
  displayName?: string,
  helpContent?: string,
  inputType: InputType,
  name: string,
  options?: Array<{text: string, value: string}>,
  placeholder?: string,
  required: boolean
}

export type GtfsSpecTable = {
  datatools?: boolean,
  fields: Array<GtfsSpecField>,
  helpContent: string,
  id: string,
  name: string
}

export type GtfsPlusValidationIssue = {
  description: string,
  fieldName: string,
  rowIndex: number,
  tableId: string
}

export type GtfsPlusValidation = {
  issues: Array<GtfsPlusValidationIssue>,
  published: boolean
}

export type GtfsRoute = {|
  agency_id: string,
  feedId: string,
  id: number,
  numberOfTrips: number,
  publicly_visible: string,
  route_branding_url: string,
  route_color: string,
  route_desc: string,
  route_id: string,
  route_long_name: ?string,
  route_short_name: ?string,
  route_text_color: string,
  route_type: string,
  route_url: string,
  shape?: {
    coordinates: Coordinates
  },
  status: string,
  tripPatterns?: Array<Pattern>,
  wheelchair_accessible: string
|}

export type GtfsStop = {|
  dropOffType?: ?number,
  id: number,
  location_type?: ?string,
  parent_station?: ?string,
  pickupType?: ?number,
  stopId?: string,
  stop_code?: ?string,
  stop_desc?: string,
  stop_id: string,
  stop_lat: number,
  stop_lon: number,
  stop_name: string,
  stop_timezone?: ?string,
  stop_url?: ?string,
  wheelchair_boarding?: ?string,
  zone_id?: ?string
|}

export type StopWithFeed = GtfsStop & {child_stops?: Array<GtfsStop>, feed: Feed}

export type LatLng = {
  lat: number,
  lng: number
}

export type Profile = {
  user_metadata: {
    datatools: Array<DatatoolsSettings>
  }
}

export type OtpServer = {
  ec2Info: ?EC2Info,
  // When server is first being created, it will not have the ec2Instances field.
  ec2Instances?: Array<EC2InstanceSummary>,
  id: string,
  internalUrl: ?string,
  name: string,
  projectId: ?string,
  publicUrl: string,
  s3Bucket: ?string
}

export type Organization = {
  extensions: Array<string>,
  id: string,
  logoUrl: ?string,
  name: string,
  projects: Array<any>,
  subscriptionBeginDate: number,
  subscriptionEndDate: number,
  usageTier: string
}

export type BuildConfig = {
  fares?: ?any, // TODO: define more specific type
  fetchElevationUS?: ?any, // TODO: define more specific type
  stationTransfers?: ?any, // TODO: define more specific type
  subwayAccessTime?: ?any // TODO: define more specific type
}

export type RouterConfig = {
  carDropoffTime?: ?any, // TODO: define more specific type
  numItineraries?: ?any, // TODO: define more specific type
  requestLogFile?: ?any, // TODO: define more specific type
  stairsReluctance?: ?any, // TODO: define more specific type
  updaters?: ?any, // TODO: define more specific type
  walkSpeed?: ?any // TODO: define more specific type
}

export type AutoDeployType = $Values<typeof AUTO_DEPLOY_TYPES>

export type Project = {
  autoDeployTypes: Array<AutoDeployType>,
  autoDeployWithCriticalErrors: boolean,
  autoFetchFeeds: boolean,
  autoFetchHour: number,
  autoFetchMinute: number,
  bounds?: ?Bounds,
  buildConfig: BuildConfig,
  dateCreated: number,
  defaultLocationLat?: number,
  defaultLocationLon?: number,
  defaultTimeZone: ?string,
  deployments: Array<Deployment>,
  feedSources: Array<Feed>,
  id: string,
  isCreating?: boolean,
  lastUpdated: number | string,
  name: string,
  organizationId: ?string,
  otpServers?: Array<OtpServer>,
  pinnedDeploymentId: ?string,
  routerConfig: RouterConfig,
  useCustomOsmBounds: boolean,
  user: ?any // TODO: define more specific type
}

export type ReactSelectOption = {
  label: string,
  value: string
}

export type ReactSelectOptions = Array<ReactSelectOption>

export type ScheduleException = {|
  added_service: ?Array<string>,
  custom_schedule: ?Array<string>,
  dates: Array<string>,
  exemplar: number,
  feedId: string,
  id: number,
  isCreating: boolean,
  name: string,
  removed_service: ?Array<string>
|}

export type ServiceCalendar = {|
  description: string,
  end_date: string,
  feedId: string,
  friday: number,
  id: number,
  monday: number,
  numberOfTrips: number,
  routes: Array<GtfsRoute>,
  saturday: number,
  service_id: string,
  start_date: string,
  sunday: number,
  thursday: number,
  tuesday: number,
  wednesday: number
|}

export type StopTime = {
  arrivalTime: number,
  departureTime: number,
  id: number,
  shape_dist_traveled: number,
  stopHeadsign: string,
  stopId: string,
  stopSequence: number
}

export type Stop = {
  dropOffType?: ?number,
  feedId: string,
  gtfsStopId: string,
  id?: ?string,
  lat: number,
  locationType?: ?string,
  lon: number,
  parentStation?: ?string,
  pickupType?: ?number,
  stopCode?: ?string,
  stopDesc?: string,
  stopName: string,
  stopTimezone?: ?string,
  stopUrl?: ?string,
  wheelchairBoarding?: ?string,
  zoneId?: ?string
}

export type TimetableColumn = {
  key: string,
  name?: string,
  placeholder: string,
  title?: string,
  type: string,
  width: number
}

type Frequency = {
  endTime: number,
  exactTimes: number,
  headwaySecs: number,
  startTime: number
}

export type Trip = {|
  bikes_allowed: ?boolean,
  blockId: string,
  directionId: number,
  frequencies: Array<Frequency>,
  id: null | number,
  pattern_id: string,
  route_id: string,
  service_id: string,
  shape_id: string,
  stopTimes: Array<StopTime>,
  tripHeadsign: string,
  tripId: string,
  tripShortName: ?string,
  useFrequency?: boolean,
  wheelchair_accessible: ?boolean
|}

export type Entity = ScheduleException |
  GtfsAgency |
  GtfsFare |
  GtfsRoute |
  ServiceCalendar |
  GtfsStop |
  Pattern |
  Trip

export type Display = {
  ContactEmailList: null | string,
  DisplayLatitude: null | number,
  DisplayLongitude: null | number,
  DisplayStatus: string,
  DisplayTitle: string,
  DraftDisplayConfigurationId: null | number,
  EditedBy: null | string,
  EditedDate: string,
  Id: number,
  LocationDescription: string,
  PrimaryCptAgencyId: null | number,
  PublishedDisplayConfigurationId: null | number,
  StopPublicId: null | number,
}

export type UserProfile = {
  app_metadata: any,
  email: string,
  name: string,
  nickname: string,
  picture: string,
  user_id: string,
  user_metadata: any,
  [scopedMetadataFields: string]: any
}

export type User = {
  permissions: UserPermissions,
  profile: UserProfile,
  token: string
}

export type RecentActivity = {
  body: string,
  date: number,
  feedSourceId: string,
  feedSourceName: string,
  feedVersionIndex: number,
  feedVersionName: string,
  projectId: string,
  projectName: string,
  type: string,
  userName: string
}

export type Zones = {
  [zoneId: string]: Array<GtfsStop>
}

export type ZoneOption = {
  create?: boolean,
  label: any,
  value: string
}

export type ZoneInfo = {
  zoneOptions: Array<ZoneOption>,
  zones: Zones
}

export type AlertEntity = {
  agency: ?Feed,
  id: string,
  mode?: ?any,
  route?: GtfsRoute & {feed_id: string},
  route_id?: ?string,
  stop?: GtfsStop & {feed_id: string},
  stop_id?: ?string,
  type: ?string
}

export type Alert = {
  affectedEntities: Array<AlertEntity>,
  cause: string,
  description: string,
  effect: string,
  end: number,
  id: string,
  published: boolean,
  start: number,
  title: string,
  url: string
}

export type MergeFeedsResult = {
  errorCount: number,
  failed: boolean,
  failureReasons: String[],
  feedCount: number,
  idConflicts: String[],
  mergeStrategy: 'DEFAULT' |
    'EXTEND_FUTURE' |
    'FAIL_DUE_TO_MATCHING_TRIP_IDS' |
    'CHECK_STOP_TIMES',
  recordsSkipCount: number,
  remappedIds: { [string]: string },
  remappedReferences: number,
  skippedIds: String[],
  startTime: number,
  tablesMissingKeyFields: String[]
}

export type ServerJob = {
  deploymentId: ?string,
  feedSourceId: ?string,
  instanceId: ?string,
  jobId: string,
  mergeFeedsResult?: MergeFeedsResult,
  mergeType?: string,
  name: string,
  parentJobId: ?string,
  projectId: ?string,
  serverId?: string,
  snapshot: ?Snapshot,
  status: JobStatus,
  type: string,
  validationResult?: any // TODO: add more precise type
}

export type Option = {
  children: string,
  disabled?: boolean,
  value: any
}

type KeyValue = {
  key: string,
  value: any
}

export type FormProps = {
  children?: Array<Option>,
  componentClass?: string,
  condition?: KeyValue,
  effects?: Array<KeyValue>,
  name: string,
  placeholder?: string,
  required?: boolean,
  split?: boolean,
  type: string,
  width?: number,
}

export type FetchStatus = {
  error: boolean,
  fetched: boolean,
  fetching: boolean
}

export type TripCountItems = Array<{count: number, type: string}>

export type TripCounts = {[string]: TripCountItems} & ?{[string]: TripCounts}

export type ShapefileExportType = 'STOPS' | 'ROUTES'
export type ModuleType = 'enterprise' | 'editor' | 'alerts' | 'user_admin' | 'gtfsplus' | 'deployment' | 'validator'
export type ExtensionType = 'mtc' | 'transitland' | 'transitfeeds' | 'nysdot'

export type MessageFile = {
  _id: string,
  _name: string,
  components: Array<{
    [componentName: string]: {
      // Can be a message string or object
      [messageId: string]: any
    }
  }>
}

export type DataToolsConfig = {
  application: {
    active_project?: string,
    data: {
      gtfs_s3_bucket?: string,
      use_s3_storage: boolean
    },
    docs_url?: string,
    logo?: string,
    logo_large?: string,
    notifications_enabled: boolean,
    public_url: string,
    support_email?: string,
    title?: string
  },
  extensions: {
    [name: ExtensionType]: {
      enabled?: boolean,
      [field: string]: any
    }
  },
  messages: {
    active: MessageFile,
    all: Array<MessageFile>
  },
  modules: {
    [name: ModuleType]: {
      enabled?: boolean,
      [field: string]: any
    }
  },
  specifications: {
    gtfs: ?Array<GtfsSpecTable>,
    gtfsplus: ?Array<GtfsSpecTable>
  }
}

// Map types (primarily for use in editor and common/util/maps.js)

export type MapLayer = {
  id: string,
  name: string
}

export type TileLayerProps = {
  attribution: string,
  tileSize?: number,
  url: string,
  zoomOffset?: number
}
