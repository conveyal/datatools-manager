# Managing Projects and Feeds

## Creating Projects

Projects are created from the main Project listing page. Click the `Create Project` button to create a new Project; a row for the new Project will appear in the table. Type a name and click the check button (or hit Enter/Return) to finish creating the Project.

![screen capture](../gif/create-project.gif)

## Managing Projects

Clicking on a project in the main project listing will take you to the detailed project profile page:

![screenshot](../gif/project-profile.gif)

At the top of the page is the **Project Settings** panel which can be expanded to reveal optional properties that can be specified for the project. These include the location of the project's geographic coverage area (specified either as a single coordinate or a rectangular region) and the default time zone. These values, when provided, are used to populate the corresponding feed-level properties when creating new feeds within this project.

To the left of the Project Settings panel is the **Feed Sources** panel. Feed Sources are the core of a project, and are documented in more detail below. Likewise the **Deployments** panel will be covered in more detail later in the documentation. 

## Creating a Feed Source

Feed Sources are created from a Project's main profile page. Click the `+New` button from the `Actions` dropdown to create a new feed; Specify a name and optional feed source URL and click "Save". You may also adjust whether to automatically fetch the feed from the source URL and to make the feed deployable. 

## Managing Feed Sources

After a Feed Source has been created, it will appear in the Project's table of Feed Sources. From this table, a basic summary of information for the feed is presented (including if the latest version has expired and how many validation issues it has).

To access the Feed Source Profile for this feed, click on its name. 

![screenshot](../gif/feed-profile.gif)

At the top of the page is a set of tabs, which include:

- **GTFS** - main point of entry for Feed Source
    - Feed Version Navigator (covered in more detail below)
    - Feed Version Summary - view feed info and discover information about routes, patterns and stops
    - Validation issues - view and filter list of validation issues
    - Version comments - leave and view comments specific to a Feed Version
- **Snapshots** - list of Editor snapshots (or save points)
- **Notes** - where users can leave and view comments specific to this Feed Source
- **Settings** - access to Feed Source settings
    - Editing basic Feed Source properties such as name, fetch URL, and public visibility
    - Viewing/editing settings provided by custom extensions
    - Deleting a Feed Source (for users with sufficient permissions) in the **Danger zone** properties.

## Creating Feed Versions

Feed Versions are created from the main Feed Source profile page. There are three methods for creating new versions:

1. **Manually Upload a File**: Select `Upload` from the `+ Create new version` dropdown to select a GTFS file from your local machine.

2. **Fetch From A Remote URL**: Select `Fetch` from the `+ Create new version` dropdown. **Note:** to fetch a new version, the "Feed source fetch URL" property must be set to a valid GTFS URL under `Feed Source > Settings`.

3. **Import From the GTFS Editor**: Select `From snapshot` from the `+ Create new version` dropdown. The list of snapshots should now be visible showing any available snapshots of the feed in the Editor. Select the desired snapshot by clicking the "Publish" button to publish the snapshot as a new version.

4. **Service Period Merge** (certain Data Tools configurations only): If a Feed Source has two or more Feed Versions, a new Feed Version can be created by merging two versions representing a transit agency's service over different time periods. While viewing a particular Feed Version, click `Merge with version` (underneath the map view) to select which past version you would like to merge with.

5. **Regional Merge**: For Projects that contain multiple Feed Sources across a region, it can be useful to merge multiple transit agencies together into a combined GTFS feed for the entire region. While viewing a Project's list of Feed Sources, click `Actions > Merge all` to produce a combined GTFS file for all Feed Sources.

**Note:** when uploading or fetching a feed, and the file being uploaded or fetched is not different from the latest version, no new Feed Version will be created.

## Feed Transformations

Data Tools now supports **Feed Transformations**, which can apply a set of changes automatically to each new GTFS feed loaded into the system. This is especially helpful for applying repeatable changes to or inserting supplementary files into GTFS feeds that need to be enhanced. It provides a critical stopgap to improve GTFS coming out of systems that cannot be modified (e.g., scheduling software that has a rigid export format). The different transformation types currently supported are:

1. **Replace File From Version** - any file in an incoming GTFS (e.g., feed_info.txt) can be overwritten or inserted with a file extracted from a previously loaded feed version.

2. **Replace File From String** - any file in an incoming GTFS (e.g., feed_info.txt) can be overwritten or inserted with user-defined CSV data.

### Configuring Feed Transformations

Follow the steps below to configure Feed Transformations for an existing Feed Source:

1. Select a Feed Source and click `Settings > Feed Transformations`.
2. From here, click `Add transformation` to begin creating a new set of rules for incoming GTFS feeds. Your first ruleset will automatically apply to GTFS that is fetched automatically *and* manually uploaded, but this can be changed for each ruleset to apply to any of the retrieval methods listed in [Creating Feed Versions](#creating-feed-versions).
3. Click `Add step to transformation` to select a transformation type and fill in the required fields for each type. Multiple transformations can be specified and each will be applied to the incoming GTFS file in the order that they are defined.

![screenshot](../img/configure-feed-transformations.png)

### Viewing the Feed Transformation Summary

Once the Feed Transformations have all been configured, you can import a new GTFS file using one of the retrieval methods you have specified for your ruleset. Once the GTFS file has been processed, a summary of the transformations is available by hovering over the wrench icon that is visible in the Feed Version panel.

![screenshot](../img/feed-transformation-summary.png)


## Viewing and Managing Feed Versions

The Feed Version navigator allows you to navigate through all available versions of a given feed using the `←` and `→` buttons (or view a list of all versions). You can also use this interface to:

- download a Feed Version to your local machine as a GTFS data file,
- load a version into the Editor, and
- delete a Feed Version from the Data Manager. (Note: deleting a Feed Version cannot be undone.)

![screenshot](../img/feed-version-navigator.png)

To the left of the navigator is a list of views available for to the currently active version. These include basic feed statistics, the detailed feed validation report, and any user comments specific to this feed.
