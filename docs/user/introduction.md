# Introduction

## Conceptual Overview

The GTFS Data Manager enables exchange and coordination of data creation, updates, validation and deployment of GTFS data feeds for transit schedules.

The platform allows GTFS producers (transit operators, local governments, etc.) to share existing feeds or utilize the build function in GTFS Editor to create and maintain feeds. GTFS creators can use the built in validator to check for potential issues.

## Data Manager Concepts

### Projects

Projects are collections of feed sources and deployments.

### Feed Sources

Feed sources define the locations or upstream sources of GTFS feeds. These can be any combination feeds that are:

1. **Manually Uploaded** - Manually collected/managed feeds provided directly by an external source.  
2. **Fetched Automatically** - Public available feeds that can be fetched from a URL
3. **Produced In House** - Internally managed/created feeds produced by GTFS Editor

### Feed Versions

Feed Versions store specific instances of a GTFS feed for a given feed source as they are published over time. Each Feed Version has an associated GTFS file that is stored within the Data Manager, which can be downloaded by users, where users can view detailed information about that version of the GTFS including validation results.
### Snapshots

Internally managed GTFS data sets are pulled from the GTFS Editor using “snapshots” created in the editor interface. These snapshots are static versions of the data set, that serve as save points that can be exported or used as starting point for future edits. The Data Manager only imports versions of feeds where a snapshot has been created. This allows users to ensure the correct version of data is being imported and to retrieve and review data in the future.



*Note: See section 2.6 in GTFS Editor User Manual for more information on snapshots.*
