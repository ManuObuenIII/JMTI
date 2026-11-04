# JMTI app on GitHub (manuobueniii.github.io/JMTI)

These files replace index.html and sw.js in the GitHub repo ManuObuenIII/JMTI (manifest.json and the icons stay as they are).
The page is the full app (the same Index.html as in Apps Script, plus install links). It asks Apps Script for data through
doPost in Code.gs, and sw.js keeps the app on the phone so it opens at once.

## Order
1. Apps Script: paste the new Code.gs, Save, Deploy > Manage deployments > Edit > Version: New version > Deploy.
   Check that "Execute as" is Me and "Who has access" is Anyone.
2. Then put index.html and sw.js on GitHub. (Before step 1 the GitHub page would get no answer from the server.)
3. Everyone signs in once more in the GitHub app (it keeps its own sign-in).

## Later page changes
Every Index.html change also goes to GitHub as index.html (build: same file plus the install links). After an update,
an open app shows "A new version of the app is ready" with a Reload button.

Tested in the preview (sign-in, tabs, maintenance, offline open, new-version bar), not against the live web app.
