# AIDEX Lab website

The lab's public website. It is a static site hosted on GitHub Pages, and its
content (members, news, videos) is stored in a Supabase database so the lab can
update the site without editing any code.

**Live site:** https://aidxlab.github.io

---

## Who this guide is for

Anyone in the lab who needs to add a member, post news, add a video, or handle a
student application. **No coding is required for any of these tasks.** You only
need a browser and access to the Supabase dashboard.

---

## Before you start — the two accounts

| Account | What it controls | Where |
|---|---|---|
| **GitHub** | The website files and the live address | github.com |
| **Supabase** | The content, the applications, and the uploaded files | supabase.com |

You will use **Supabase** for everything in this guide. You only need GitHub if
the design or layout of the site has to change.

> **To sign in to Supabase:** go to supabase.com, sign in, and open the project
> named `<!-- CHECK: your Supabase project name -->`. In the left-hand menu,
> click **Table Editor** to see the content tables, or **Storage** to see the
> uploaded files.

---

## How the site works (one paragraph)

The page itself is a fixed set of files on GitHub Pages. When somebody opens the
site, their browser loads those files and then asks the Supabase database for the
current members, news and videos. This means **changing a row in the database
changes the website** — there is nothing to rebuild and nothing to re-publish.

---

## Task 1 — Add a member

1. Open **Table Editor** and select the **`members`** table.
2. Click **Insert** → **Insert row**.
3. Fill in the fields:

   <!-- CHECK these against your actual columns before publishing this guide -->

   | Field | What to put in it |
   |---|---|
   | `name` | The person's full name, as it should appear on the site |
   | `role` | e.g. Lab Director, PhD Candidate, Research Assistant |
   | `photo` | The filename of their photo (see step 4) |
   | `bio` | One or two sentences. Optional. |
   | `link` | A profile or publication link. Optional. |

4. **For the photo:** open **Storage** → the **`photos`** bucket → **Upload
   file**. Use a filename in lowercase with hyphens and **no spaces**, for
   example `jane-smith.jpg`. Then put that exact filename in the `photo` field.
5. Click **Save**.
6. Open the live site and refresh. The new member appears in the People section.

> **Photo filenames must not contain spaces.** A space in a filename breaks the
> web address of the image and the photo will show as a broken icon.

---

## Task 2 — Post a news item

1. Open **Table Editor** → the **`news`** table.
2. Click **Insert** → **Insert row**.
3. Fill in the title, the date, and the body text.
   <!-- CHECK: list your real news columns here -->
4. Click **Save**, then refresh the live site.

News items are shown newest first.

---

## Task 3 — Add a video

1. Open **Table Editor** → the **`videos`** table.
2. Click **Insert** → **Insert row**.
3. Put in the video's title and its YouTube link or ID.
   <!-- CHECK: whether your column stores the full URL or just the ID -->
4. Click **Save**, then refresh the live site.

Videos only load when a visitor clicks them, so adding videos does not slow the
page down.

---

## Task 4 — Handle a student application

When somebody submits the form on the website, two things happen automatically:
the application is saved to the database, and the lab receives an email.

**To review an application:**

1. Open **Table Editor** → the **`applications`** table.
2. Read the submission. The applicant's CV is in **Storage** → the **`cvs`**
   bucket.
3. If you want to publish them as a lab member, tick the approval field
   (`<!-- CHECK: the real column name, e.g. approved -->`) and save.
4. Their profile appears on the site automatically — you do not need to add them
   to the `members` table by hand.

> **Important:** applications are private. The CV, the email address and the
> written answers are never shown on the public site. Only the fields that the
> approval step copies across become public.

---

## Task 5 — Reply to an enquiry

Messages sent through the contact form are saved in the **`messages`** table.
They are not published anywhere on the site. Read them in the Table Editor and
reply by email as normal.

---

## If something looks wrong

| What you see | What it usually means | What to do |
|---|---|---|
| The site shows no members, or old members | The free database has paused after a period with no visitors | Open the Supabase dashboard and sign in — this wakes it. The site recovers within a minute. |
| A photo shows as a broken icon | The filename in the record does not match the file in Storage | Open Storage, copy the exact filename, and paste it into the record |
| A change does not appear on the site | The page is cached in your browser | Hard-refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac) |
| The site is completely down | GitHub Pages is having an outage | Check githubstatus.com — there is nothing to fix on our side |

**The site is designed not to fail visibly.** If the database cannot be reached
at all, the page falls back to a stored copy of the content, and then to text
built into the page. Visitors never see an error page — but they may see content
that is out of date, which is the signal to check the database.

---

## If the design or layout needs to change

That requires editing the site files in this repository. The structure is:

<!-- CHECK: adjust to match your real file names -->

```
index.html      the whole page, all nine sections
styles.css      colours, fonts, spacing, light and dark themes
script.js       loads content from the database
data/           the stored copy used if the database is unreachable
```

Changes committed to the `main` branch publish automatically to the live site
within a minute or two.

---

## Renaming the site address

The address `aidxlab.github.io` comes from the GitHub account name. Renaming the
account to `aidexlab` changes the address to `aidexlab.github.io` and **the old
address stops working immediately**. Before doing this, update any printed or
circulated links, and regenerate any QR codes.

---

## Handover summary

| Item | Status |
|---|---|
| Website files | In this repository |
| Content database | Supabase project, owned by the lab |
| Uploaded photos and CVs | Supabase Storage |
| Email notifications | Sent automatically when an application or message arrives |
| Running cost | None |

Built by Nishant Shrestha as part of an ITEC320 Work Integrated Learning
placement, Australian Catholic University, 2026.
