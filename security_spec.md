# Security Specification — RESOLUTION Platform

## 1. Data Invariants

1. **PII Split-Collection Isolation**: All Personally Identifiable Information (`email`, `mobileNumber`, `dateOfBirth`, `postalCode`, `employeeIdVerification`, `currentSalary`) for users is stored in `/users/{userId}/private/{docId}` and is strictly readable and writable ONLY by the document owner (`request.auth.uid == userId`) or a verified administrator (`isAdmin()`).
2. **Role & Privilege Escalation Prevention**: Users cannot self-assign `role == 'admin'` during `/users/{userId}` creation or update unless `isAdmin()` is true.
3. **Immutable Ownership & Timestamps**: All `ownerId`, `candidateId`, `studentId`, `userId`, and `createdAt` fields are strictly immutable on update (`incoming().createdAt == existing().createdAt`). Creation and update timestamps must equal `request.time`.
4. **Strict Key & Size Validation**: Every write operation invokes a dedicated `isValid[Entity](incoming())` helper enforcing `hasAll()`, `hasOnly()`, string `.size()` limits, and array `.size()` limits.
5. **Query Enforcer on List Operations**: Sensitive collections (`/applications`, `/placements`, `/retentionCheckIns`, `/enrollments`, `/salaryHistory`, `/emailNotifications`, `/auditLogs`) enforce ownership or admin status directly against `resource.data` during `list` queries.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Privilege Escalation on User Creation**: `{ "uid": "attacker1", "displayName": "Attacker", "role": "admin", "careerStatus": "undergraduate" }` -> Denied (`role == 'admin'` blocked for non-admins).
2. **Shadow Field Injection on User Profile**: `{ "uid": "user1", "displayName": "User", "role": "user", "careerStatus": "undergraduate", "isSuperUser": true }` -> Denied (`hasOnly` check fails).
3. **Cross-User PII Read**: Authenticated `user2` performs `get` on `/users/user1/private/info` -> Denied (`userId == request.auth.uid || isAdmin()` fails).
4. **Forged Timestamp on Job Creation**: `{ "companyId": "comp1", "ownerId": "user1", "createdAt": "2020-01-01T00:00:00Z" }` -> Denied (`incoming().createdAt == request.time` fails).
5. **Identity Spoofing on Application Creation**: Authenticated `user1` creates `/applications/app1` with `candidateId: "user2"` -> Denied (`incoming().candidateId == request.auth.uid` fails).
6. **Unauthorized Application Status Tampering**: Candidate `user1` attempts to update `/applications/app1` status to `"Hired"` -> Denied (only `companyOwnerId` or `isAdmin()` can update application status).
7. **Resource Poisoning via Oversized String**: Job description of 50,000 characters -> Denied (`description.size() <= 4000` fails).
8. **Array Exhaustion Attack**: User profile with 500 skill elements -> Denied (`skills.size() <= 50` fails).
9. **ID Poisoning Attack**: Document ID containing spaces or special characters -> Denied (`isValidId()` regex guard fails).
10. **Unverified Email Admin Spoof**: Token with `email == "wasimakram99941@gmail.com"` but `email_verified == false` -> Denied (`request.auth.token.email_verified == true` required).
11. **Salary Record Tampering**: User attempts to modify an existing `SalaryHistoryRecord` `createdAt` or `userId` -> Denied (immutable fields).
12. **Blanket List Scraping on Salary History**: Authenticated user attempts `list` on `/salaryHistory` without `where('userId', '==', uid)` -> Denied (`resource.data.userId == request.auth.uid || isAdmin()`).
