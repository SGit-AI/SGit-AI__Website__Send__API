---
title: Releases
description: Every release of the reader code, newest first, with its date, size and manifest. A release is never edited after it is published.
---

# Releases

A release is a directory under `/vX.Y.Z/` on this host, served exactly as it is in the repository, with a `manifest.json` of every file's size and SHA-256. The current one is named in [`/releases.json`](/releases.json). A change to the code is the next directory, never an edit of this one; [independent releases](/docs/versioning/) is the rule and the reason.

<!-- releases -->

The website around the releases has versions of its own, one per change that lands on `main`; [the version history](/versions/) has a line for each.
