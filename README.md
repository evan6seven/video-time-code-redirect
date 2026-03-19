# Video Time Code Redirect

Firefox extension for `docs.google.com` that intercepts links containing a `?t=` query parameter, looks up a stored redirect target, and forwards the user while preserving the timestamp.

## Behavior

- Runs only on `https://docs.google.com/*`
- Intercepts normal left-clicks on links with a `t` query parameter
- Opens redirected links in a new tab
- Stores mappings in `browser.storage.local` as normalized `source URL -> destination URL`
- Removes `t` from both source and destination before storage, then reapplies the clicked `t` value during redirect
- Prompts for a destination URL the first time a source URL is encountered
- Adds a floating `Redirect Mappings` menu for viewing, editing, deleting, and hiding all extension UI
- Restores hidden UI with `Alt+Shift+M`

Example:

`https://youtu.be/7bX9Wztjp3o?t=17352`

becomes

`https://kick.com/destiny/videos/4afad2ff-48f5-4399-8aa9-dff1ae8f685d?t=17352`

after saving the mapping:

`https://youtu.be/7bX9Wztjp3o` -> `https://kick.com/destiny/videos/4afad2ff-48f5-4399-8aa9-dff1ae8f685d`

## Load In Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click `Load Temporary Add-on...`
3. Select [manifest.json](/Users/mainuser/Code/Browser Extensions/Video time code redirect/manifest.json)
