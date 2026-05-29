# Security Specification: "Al-Hikaya Wa Ma Fiha"

## Data Invariants
1.   **Assessments**: Only Admins can create/edit/delete assessments. Students can only read active assessments.
2.   **Submissions**: Students can only read their own submissions. Once a submission is completed, it is immutable except for admin corrections.
3.   **Users**: Users can only read/write their own profile (except for role/status which are admin-only). Admins can manage all users.
4.   **Notifications**: General notifications are public or targeted. Only admins can create system-wide notifications.
5.   **Participants**: Participant streak data is updated only upon successful submission and is tied to the student's identity.

## The "Dirty Dozen" Payloads (Identity & Integrity Breakers)

1.  **Identity Spoofing**: Attempt to create a submission as `User_A` but setting `participantId` to `User_B`.
2.  **Privilege Escalation**: A student attempting to update their own `role` from `"student"` to `"admin"`.
3.  **Shadow Field Injection**: Adding an `isAdmin: true` field to a user profile that doesn't expect it.
4.  **Resource Poisoning**: Using a 2KB string as a document ID for a notification.
5.  **State Shortcutting**: Updating a submission status from `"incomplete"` to `"completed"` without providing answers.
6.  **Orphaned Record**: Creating a submission for an `assessmentId` that does not exist in the `assessments` collection.
7.  **Terminal State Violation**: Attempting to change the `score` of a `"completed"` submission.
8.  **Denial of Wallet**: A script attempting to write 500 notifications in a minute with 1MB of junk text in the `message` field.
9.  **Relational Breach**: A student trying to read a submission where the `participantId` is not their own UID.
10. **Query Scraping**: Attempting a `list` query on `submissions` without a `where` filter on `participantId`.
11. **Timestamp Spoofing**: Sending a `createdAt` value from the future in a `loginLog`.
12. **Immutable Field Write**: Attempting to change the `assessmentId` on an existing submission.

## Test Strategy (Mental Model)
Every rule will be evaluated against:
1.  **isSignedIn()**: Is the gate closed for anonymous users?
2.  **isValidId()**: Is the path protected from ID poisoning?
3.  **isValid[Entity]()**: Does the schema match exactly? No shadow fields?
4.  **isOwner() || isAdmin()**: Is the identity verified?
5.  **affectedKeys().hasOnly()**: Are only the intended fields changing during an update action?
