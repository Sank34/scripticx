# Recent login accounts

The login page remembers up to five identities on the current device. The most recently authenticated/active account appears first with “Last used”. Selecting an identity fills the email field, clears any previous password and focuses the password input. It does not start an authentication request.

The passwordless dialog starts with the selected email and mounts afresh each time, so an email from a previous account cannot carry over into the next dialog. Sending a magic link or OTP still requires the user to press Send.

## Storage and sessions

- `scripticx-recent-accounts-v1`: user ID, email, nickname, username, avatar URL and last-used timestamp. Reads and writes explicitly project those fields; passwords and tokens are excluded. Corrupt entries are ignored, entries are deduplicated and the list is bounded to five identities. Storage failures do not prevent authentication.
- `scripticx-saved-accounts-v1`: the existing authenticated-account registry. Its token handling and isolated session validation continue to support account switching.
- Existing saved accounts seed the recent-identity list, preserving their last-used timestamps. Successfully saving a session remembers its identity. Removing a session on logout retains the identity.

Sign-out still removes the saved token pair. The “Continue session” action is shown only for an account with a saved session, and that session is validated/refreshed by the existing isolated client before activation. If it cannot be resumed, the login form is prefilled instead and offers password or passwordless sign-in. A remembered identity alone grants no access.

“Forget on this device” removes the identity and logs out/removes its saved session if present. The current multi-account logout behavior, including switching to a validated fallback account, is unchanged. Recent identities are local to the browser origin and do not sync between devices. Identities already lost before this feature cannot be reconstructed from deleted sessions.

No database migration is needed.
