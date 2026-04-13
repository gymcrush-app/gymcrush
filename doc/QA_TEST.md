# QA Test Checklist (Founder-friendly)

Use this as a script. Each tester should run it on a **fresh install** (delete the app first), and note any issues with **screen recording + steps + what you expected**.

---

## Pre-flight (setup)

- **Device / OS**: iPhone model + iOS version
- **Build**: TestFlight build number (or “dev build”)
- **Network**:
  - Test once on good Wi‑Fi
  - Test once on cellular / weak connection (or “Low Data Mode”)
- **Location**:
  - Test once with Location = **Allow While Using**
  - Test once with Location = **Don’t Allow**

---

## 1) Install + first open

- [ ] App opens without crashing
- [ ] Loading/splash doesn’t hang > 10 seconds
- [ ] No broken UI (missing buttons, overlapped text, unreadable text)

---

## 2) Signup (new user)

- [ ] Create account with valid email/password
- [ ] Validation
  - [ ] Invalid email shows a helpful message
  - [ ] Weak/empty password shows a helpful message
- [ ] Duplicate account: try signing up with an email that already exists (should fail gracefully)
- [ ] Onboarding flow
  - [ ] Can move forward/back where expected
  - [ ] Required fields actually block “Continue” until filled
  - [ ] Finishing onboarding lands you in the main app (Discover)

---

## 3) Login (existing user)

- [ ] Login success with correct password
- [ ] Login failure shows helpful message with wrong password
- [ ] App relaunch while logged in keeps you logged in

---

## 4) Reset password

- [ ] From Login screen: **Forgot password**
  - [ ] No email entered → shows “enter your email” guidance
  - [ ] Valid email → confirm message appears (“check your inbox”)
- [ ] Complete reset via email link
- [ ] Log in with new password
- [ ] Old password no longer works

---

## 5) Logout

- [ ] Log out from Profile/settings
- [ ] Confirm you are returned to Login
- [ ] Relaunch app: you should still be logged out

---

## 6) Delete account (when implemented)

- [ ] Find “Delete account” in settings/profile
- [ ] Confirm warnings are clear (what happens to profile/messages)
- [ ] After deletion:
  - [ ] You cannot log in again with that account
  - [ ] App behaves cleanly (no stuck loading / no crashes)
  - [ ] Creating a new account with same email behaves as intended (either allowed or clearly blocked)

---

## 7) Permissions (non-technical but critical)

### Photos

- [ ] During onboarding/profile edit: add photos
  - [ ] Permission prompt appears
  - [ ] If you tap **Don’t Allow**, the app explains you need permission and doesn’t crash
  - [ ] If you allow, photo picker works reliably

### Location

- [ ] When asked, try:
  - [ ] **Allow While Using** → gyms / discovery behave normally
  - [ ] **Don’t Allow** → app still usable (or clearly explains what’s limited)

### Notifications (if enabled)

- [ ] Opt-in prompt appears at a sensible time
- [ ] If you allow notifications:
  - [ ] You receive a notification for the intended event(s)
  - [ ] Tapping it opens the correct screen
- [ ] If you deny notifications:
  - [ ] App still works and doesn’t repeatedly nag

---

## 8) Profile creation & editing

- [ ] View your profile: photos, name, gym, prompts, lifestyle fields show correctly
- [ ] Edit profile
  - [ ] Change display name → it saves
  - [ ] Add photo(s) → they appear and persist after closing/reopening app
  - [ ] Reorder photos → order persists
  - [ ] Remove a photo → it stays removed after relaunch
  - [ ] Update prompts/answers → they persist
  - [ ] Update “home gym”:
    - [ ] Search results appear
    - [ ] Selecting a gym shows it on your profile
    - [ ] Close and reopen app → gym still correct

---

## 9) Discover (swiping)

- [ ] Discover loads profiles (no infinite spinner)
- [ ] Swiping works
  - [ ] Like / Pass actions register
  - [ ] No accidental double-swipes / stuck cards
- [ ] Empty state
  - [ ] If no profiles available, “empty feed” messaging is clear and app doesn’t break
- [ ] Profile detail sheet / modal
  - [ ] Opens and closes reliably
  - [ ] Photos and prompts display correctly

---

## 10) Matching + Chat (if part of v1)

- [ ] Create a match (however your app supports it)
- [ ] Chat list shows match
- [ ] Open chat
  - [ ] Send a message
  - [ ] Message appears instantly (or within a short time)
  - [ ] Close and reopen chat → message still there
- [ ] Bad network behavior
  - [ ] Try sending with weak signal → app shows a clear error and doesn’t lose the message silently

---

## 11) Safety: block/report (if part of v1)

- [ ] Report a profile
  - [ ] Flow is obvious and confirms submission
- [ ] Block a user
  - [ ] Blocked user no longer appears in Discover/Chat
  - [ ] No lingering notifications/messages from blocked user

---

## 12) Purchases (RevenueCat / subscriptions) (when implemented)

Test with a sandbox tester account / TestFlight sandbox:

- [ ] Paywall opens
- [ ] Purchase succeeds
- [ ] Purchase failure is handled gracefully (no stuck spinner)
- [ ] Restore purchases works
- [ ] Subscription state correctly gates premium features
- [ ] Cancel subscription (Apple settings) then verify app reflects the change (may require app restart)

---

## 13) General quality checks (quick pass)

- [ ] No crashes during normal navigation
- [ ] Back navigation always works (never traps you)
- [ ] Performance: no obvious lag spikes on Discover swipes
- [ ] Visual polish: no typos, no placeholder “Coming soon” in v1 areas you intend to ship
- [ ] Privacy sanity: app never shows another user’s private data unexpectedly

---

## Bug report template (copy/paste)

- **Title**:
- **Device / iOS**:
- **Build**:
- **Steps** (1…2…3…):
- **Expected**:
- **Actual**:
- **Screenshot / screen recording**:
- **How often**: once / sometimes / always

