# AceReads Team Project

This repository is the team's shared source-code location for the CS492 AceReads bookstore project.

## New team members: start here

1. Install Node.js, MySQL Community Server, MySQL Workbench, and GitHub Desktop.
2. Clone this repository with GitHub Desktop.
3. Copy `.env.example` and rename the copy to `.env`.
4. Put your local MySQL password in `.env`. Never upload `.env`.
5. In MySQL Workbench, run `database/00_full_setup.sql`.
6. In this folder, run `npm install`.
7. Run `npm start`.
8. Open `http://localhost:3000`.

Use `API_TESTING.md` for copy-and-paste Postman requests.

## Where everyone puts code

- Sprint 1 work: `src/sprint-1/`
- Sprint 2 work: `src/sprint-2/`
- Browser pages: `public/`
- Database setup: `database/`
- Final shared routes: `src/routes/`

Each file starts with its task ID. Open the file matching your assignment and paste or write your code below the marked comment.

## Existing supplied work

- `T1-005`: books database schema
- `T1-006`: book CRUD model
- `T1-007`: book catalog management page
- `T2-008`: order-management backend
- `T2-009`: customer order-tracking page

The supplied files were preserved and connected to a small Express/MySQL application.

Additional implementation-guide code was added for:

- `T1-001` through `T1-004`: registration, password security, login, and auth UI
- `T2-001` through `T2-003`: shopping-cart schema, API, and UI

## Simplest team rule

Before working, click **Fetch origin** and **Pull origin** in GitHub Desktop. Work only in the file labeled with your task ID. Commit with a message such as `T2-003 add shopping cart UI`, then push.

See [TEAM_START_HERE.md](TEAM_START_HERE.md) for screenshots-free beginner instructions.
