# AceReads — CS492 Group Project 2

**Professor:** Amr Elchouemi | **Course:** CS492 | **Team:** Tracy Pillow, Ali Osman, Kyonna Robinson, Juana Rodriguez, Nathan Horstmeier, Phillip Williams

This repo is the single source of truth for our project. Every commit is logged with who made it and when — this is our proof of contribution for grading. At the end of each sprint we merge everything to main and download the ZIP for submission.

---

## Join the Repo (One Time Only)

1. Create a free GitHub account at https://github.com if you don't have one
2. Send Nathan your GitHub username on Discord
3. You will get an email invitation from GitHub — accept it
4. You now have access to push branches and open pull requests

---

## Install These First (One Time Only)

1. **Git** — https://git-scm.com — Download and run the installer, keep all defaults
2. **Node.js** — https://nodejs.org — Download the LTS version and run the installer, keep all defaults

Restart your computer after installing both.

---

## Download the Project (One Time Only)

1. Right-click the Start button and open **PowerShell**
2. Type this and press Enter:

```
git clone https://github.com/natehorst240-sketch/CS492-Group-Project.git
```

3. Then type these and press Enter after each:

```
cd CS492-Group-Project/backend
npm install
```

---

## Running the App Locally

1. Open PowerShell
2. Type these and press Enter after each:

```
cd CS492-Group-Project/backend
npm start
```

3. Open your browser and go to **http://localhost:5000**
4. Keep the PowerShell window open while using the app — closing it stops the server
5. Press **Ctrl + C** in PowerShell when you want to stop

---

## Load Demo Data

The first time you run the app it will be empty. Open a second PowerShell window and run:

```
cd CS492-Group-Project/backend
npm run seed
```

| Command | What it does |
|---|---|
| `npm run seed` | Loads demo books and customers |
| `npm run seed:clear` | Removes demo data |
| `npm run seed:reset` | Clears and reloads fresh |

---

## How to Submit Your Work Each Week

Everyone works on their own branch so nothing breaks for the rest of the team while you are working. Here is the full workflow:

### Step 1 - Get the latest code before you start

```
cd CS492-Group-Project
git pull
```

### Step 2 - Create your own branch

Replace `your-name` with your actual name:

```
git checkout -b your-name/sprint2-task
```

For example: `git checkout -b juana/order-tracking` or `git checkout -b kyonna/search-ui`

### Step 3 - Make your changes

Edit files, add features, fix bugs — whatever your task is for the sprint.

### Step 4 - Upload your changes

```
git add .
git commit -m "brief description of what you changed"
git push origin your-name/sprint2-task
```

### Step 5 - Open a Pull Request

1. Go to https://github.com/natehorst240-sketch/CS492-Group-Project
2. You will see a yellow banner saying your branch was recently pushed — click **Compare & pull request**
3. Write a short description of what you changed
4. Click **Create pull request**


### Step 6 - Preview your changes live

When you open a pull request, Vercel automatically builds a preview of your branch and posts a link in the PR comments within about 30 seconds. Click that link to see your changes running live before they are merged — no local setup needed.

<img width="1892" height="901" alt="image" src="https://github.com/user-attachments/assets/f9166e0a-904c-453e-acf0-7e3025a5f5de" />



### Step 7 - Merge to main at the end of the week

We will review the PR, leave comments if anything needs fixing, and merge it to main when it is ready. Once merged the live site at https://cs-492-group-project.vercel.app updates automatically.

### Step 8 - Update the Sprint Excel Sheet

We can keep a running updated version of the sprint planning excel sheet and download it
with the .zip file so everyone submit the same sprint report.

---

## End of Sprint Submission

At the end of each sprint we will merge all open pull requests to main. To download the ZIP for submission:

1. Go to https://github.com/natehorst240-sketch/CS492-Group-Project
2. Make sure you are on the **main** branch
3. Click the green **Code** button → **Download ZIP**
4. Rename the file to `CS492_GP2.ZIP`
5. Submit it on the course website

The GitHub repo itself also serves as proof of contribution — Professor Elchouemi can see every commit, who made it, and when by clicking the **Commits** tab or the **Insights → Contributors** tab on the repo.

---

## Live Version

The app is live at **https://cs-492-group-project.vercel.app** and updates automatically every time code is merged to main.

| Page | Live URL |

| Owner Dashboard | https://cs-492-group-project.vercel.app |
| Customer Store | https://cs-492-group-project.vercel.app/store.html |
| Order Tracking | https://cs-492-group-project.vercel.app/orders.html |

---

## Local URLs (when running on your computer)

| Page | URL |

| Owner Dashboard | http://localhost:5000 |
| Customer Store | http://localhost:5000/store.html |
| Order Tracking | http://localhost:5000/orders.html |

---

## Changes Made to Deploy on Vercel

The original project structure from the team submission required a few changes to get it running on Vercel:

1. **Moved everything out of the `acereads` subfolder** — the repo root is now the project root so Vercel can find all the files directly
2. **Added `vercel.json`** — tells Vercel how to route requests. All `/api/*` calls go to the backend server, all frontend pages are served statically
3. **Added root `package.json`** — Vercel needs a package.json at the root level to understand the project structure
4. **Changed API URLs from `http://localhost:5000` to relative paths** — `store.html`, `orders.html`, and `app.js` were updated so API calls work on any domain instead of only on your local machine
5. **Added auto-seed on cold start** — Vercel resets the database on every deploy since it uses a temporary filesystem. The server now checks if the database is empty on startup and loads the demo data automatically
6. **Updated `server.js` static file path** — the server now detects whether it is running locally or on Vercel and looks for the frontend files in the right place
7. **Added `.github/workflows/test.yml`** — GitHub Actions workflow that runs all unit tests automatically on every push and pull request

---



| Problem | Fix |
|---|---|
| `git` is not recognized | Restart your computer after installing Git |
| `npm` is not recognized | Restart your computer after installing Node.js |
| Page won't load in browser | Make sure `npm start` is running in PowerShell |
| App loads but no books show | Run `npm run seed` |
| Error when pushing | Run `git pull` first then try again |
| GitHub says permission denied | Make sure you accepted the invitation email |

Questions — message me on Discord or the CTU chat.
