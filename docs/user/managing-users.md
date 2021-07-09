# Managing Users

## Overview

User accounts in the Transit Data Tools suite are managed via Auth0, a third-party authentication service. (For details on setting up Auth0 for use with this application, see the Deployment documentation.)

Auth0 allows for access via internally defined user accounts as well as third-party identity providers (e.g. social networking sites); this documentation deals with internal accounts only. Internal accounts use username-password authentication, with a user's email address serving as the unique username.

## User Permissions

The Data Tools suite uses a system of user permissions to regulate access to various functions within the application.

### Admin users
Three types of administrator-level users exist:

- **Application-level administrator**: has full access to the Data Tools suite, including access to all projects and feed sources, the ability to create new projects, and the ability to create and manage users.
- **Organization-level administrator**: has full access to all projects and feed sources for an organization. **Note:** this user type is only for users of non-enterprise implementations (i.e., https://gtfs.ibi-transit.com).
- **Project-level administrator**: has full access to a single project, including all project-level permissions. Is not able to create new projects or administer users.

### Non-admin users
For non-administrative users, permissions may be assigned on an individual basis by choosing `Custom`. A non-administrative user's permissions can also be set to only apply to particular feeds within a project. All users with project access have read-only access to all project feeds by default.

#### User permissions examples
1. A user may need edit privileges to only one feed source. In this case, the `Edit GTFS feeds` and the specific feed (e.g., Agency X) would be checked.
2. Agencies may wish to grant access to users that can view basic reporting info, but should not have the ability to modify or manage anything in the application. Here, `Custom` should be selected, but no other permissions or feeds should be checked.

## Managing Users

To create or manage users, you must be logged in as an application- or organization-level administrator. From the `Home` page, click the `Admin` button in the top right-hand box to access the user management console. You will then see a list of all users in the system:

![screenshot](../img/user-admin.png?)

Click `Edit` next to a user name to see an expanded user profile where specific permissions can be set:

![screenshot](../img/user-profile.png)

To create a new user, click the `Create User` button:

![screenshot](../img/create-user.png)

 You will be asked to provide an email address (which serves as the user's username), an initial password for the user, and any initial permission settings. Once created, the user will receive a confirmation email at the specified email address.

## Password Reset
Did you forget your password or need to otherwise change it? While logged out, click the `Log In` button and then "Don't remember your password". After submitting the email address associated with your user account, an email will be sent to you containing a link to reset your password.

![screenshot](../img/password-reset-logged-out.png)

Already logged in, but still need to change your password? Simply click the user icon at the bottom of the lefthand sidebar and click "Change Password" to submit your email address.

![screenshot](../img/password-reset-logged-in.png)

**Note:** if you don't receive a password reset email within a few minutes, please check your spam/junk folder.
