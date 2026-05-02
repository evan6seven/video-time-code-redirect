# Video Time Code Redirect

Userscript for `docs.google.com` that intercepts links containing a `?t=` query parameter, looks up a stored redirect target, and forwards the user while preserving the timestamp.

## Behavior

- Runs only on `https://docs.google.com/*`
- Intercepts normal left-clicks on links with a `t` query parameter
- Opens redirected links in a new tab
- Includes a compact on/off toggle beside `🔀` that disables both redirection and new mapping prompts
- Stores mappings as normalized `source URL -> destination URL`
- Uses userscript-manager storage, preferring modern async `GM.*` APIs with legacy `GM_*` fallbacks
- Removes `t` from both source and destination before storage, then reapplies the clicked `t` value during redirect
- Prompts for a destination URL the first time a source URL is encountered
- Adds a floating `🔀` button for viewing, editing, deleting individual mappings, and deleting all mappings

Example:

`https://youtu.be/7bX9Wztjp3o?t=17352`

becomes

`https://kick.com/destiny/videos/4afad2ff-48f5-4399-8aa9-dff1ae8f685d?t=17352`

after saving the mapping:

`https://youtu.be/7bX9Wztjp3o` -> `https://kick.com/destiny/videos/4afad2ff-48f5-4399-8aa9-dff1ae8f685d`

## Compatibility

- Tampermonkey
- Violentmonkey
- Userscripts Safari (`quoid/userscripts`)
- Other userscript managers that support either `GM.getValue` / `GM.setValue` or `GM_getValue` / `GM_setValue`

For Userscripts Safari, the script includes `@inject-into content` because `GM` APIs are only available in the content script scope.

## Import Into A Userscript Manager

1. Open your userscript manager
2. Choose the option to install from a URL
3. Paste `https://raw.githubusercontent.com/evan6seven/video-time-code-redirect/main/tampermonkey.user.js`
