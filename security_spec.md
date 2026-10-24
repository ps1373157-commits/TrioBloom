# Security Specification: TrioBloom 🌷

## 1. Data Invariants
1. **Private Chat Isolation**: Private conversations and messages inside `/conversations/{conversationId}/messages/{messageId}` can only ever be read or written by authenticated users whose UID is strictly contained in the conversation's `participantIds`. No other member or unauthenticated user can access them.
2. **Member Approval Requirement**: Only authenticated members whose profile document in `/members/{uid}` has `isApproved == true` or who are registered admins can post to the wall, send messages, or view shared friendship data.
3. **No Self-Privilege Escalation**: Non-admin users cannot change their own `isApproved` status or change their `role` to `admin`.
4. **Identity & Authorship**: When creating posts or sending messages, `authorId` or `senderId` must strictly equal `request.auth.uid`. Impersonation of other friends is strictly denied.
5. **Like / Reaction Integrity**: Updating a wall post's `likedBy` array and `likesCount` is limited to liking/unliking by the authenticated user and cannot alter the post's text, author, or createdAt fields.
6. **Bounds & Length Guards**: String fields enforce strict size limits (messages <= 1000 characters, posts <= 2000 characters, names <= 50 characters) to prevent Denial-of-Wallet and storage abuse.

## 2. The "Dirty Dozen" Payloads (Attacks That Must Be Denied)

1. **Unauthenticated Read of Wall Posts**:
   Anonymous request to `get /wall_posts/post_123` -> PERMISSION_DENIED.
2. **Private Message Snooping (Non-participant read)**:
   User `uid_mallory` attempting `get /conversations/private_palak_priya/messages/msg_456` when participants are `['uid_palak', 'uid_priya']` -> PERMISSION_DENIED.
3. **Self-Approval Escalation on Registration**:
   User `uid_unapproved` attempting `create /members/uid_unapproved` with `{ isApproved: true, role: 'admin' }` -> PERMISSION_DENIED unless admin.
4. **Message Sender Impersonation**:
   User `uid_mallory` sending message with `{ senderId: 'uid_palak', text: 'Hey from Palak!' }` -> PERMISSION_DENIED (`senderId != request.auth.uid`).
5. **Oversized Message Bombing**:
   User sending a message with text length > 1000 characters -> PERMISSION_DENIED.
6. **Wall Post Tampering by Non-Author**:
   User `uid_bob` attempting `update /wall_posts/post_alice` to overwrite `content` -> PERMISSION_DENIED.
7. **Post Author Reassignment**:
   User updating a post and modifying `authorId` or `createdAt` -> PERMISSION_DENIED.
8. **Malicious ID Path Poisoning**:
   Requesting a document with an invalid or 2KB document ID with forbidden characters -> PERMISSION_DENIED.
9. **Unapproved Member Trying to Post on Wall**:
   User with `isApproved: false` attempting `create /wall_posts/post_new` -> PERMISSION_DENIED.
10. **Ghost Field Injection (Shadow Update)**:
    User attempting to update a wall post with an unexpected injection field `{ isHacked: true }` -> PERMISSION_DENIED via strict `affectedKeys().hasOnly()`.
11. **Negative Like Count Resource Poisoning**:
    User setting `likesCount: -999` -> PERMISSION_DENIED.
12. **Private Conversation Creation with Impersonated Participant**:
    User `uid_bob` creating a conversation where `participantIds` does not contain `request.auth.uid` -> PERMISSION_DENIED.
