# Ledgerly Expense Tracker

Ledgerly is a small expense-tracking application with a Spring Boot API and a responsive, framework-free browser frontend. Users register, sign in with a bearer JWT, and manage expenses owned by their account.

## Features

- Account registration with BCrypt password hashing and JWT login.
- User-owned expense creation, listing, editing, and deletion.
- Category and date-range filters, sorting, and server-side pagination.
- Dashboard totals, category spending visualization, and monthly trend calculated from the user's expenses.
- Responsive layout, loading and empty states, notifications, and persistent dashboard dark mode.

## Technology and structure

- Java 21, Spring Boot 4, Spring MVC, Spring Security, Spring Data JPA, Jakarta Validation, and H2.
- HTML, CSS, vanilla JavaScript, Fetch API, and SVG charts; no frontend framework or package installation.
- Backend source: src/main/java/com/shreyas/expence/proj.
- Frontend: frontend/.

The backend uses controller → service → repository layers. DTOs define request and response contracts. SecurityConfig enables stateless JWT bearer authentication, BCrypt, CORS, and authentication error responses.

## Authentication and ownership

1. POST /user/register accepts name, email, and password. The service stores a BCrypt hash and returns only id, name, and email.
2. POST /user/login accepts email and password. On success it returns a JWT and safe user profile:

   ~~~json
   {
     "token": "<JWT>",
     "tokenType": "Bearer",
     "expiresIn": 3600,
     "user": { "id": 1, "name": "Example User", "email": "user@example.com" }
   }
   ~~~

3. The frontend stores the JWT and safe profile in localStorage under ledgerly.auth. It does not store the password.
4. Protected API calls send Authorization: Bearer <JWT>. The JWT subject identifies the user. The expense service sets the owner on creation and scopes reads, updates, deletes, filtering, sorting, and paging to that user. Clients must not send a userId.

## API summary

All expense endpoints require a valid bearer token. Expense request JSON is:

~~~json
{ "amount": 12.50, "category": "Food", "description": "Lunch", "date": "2026-10-03" }
~~~

Amount must be positive; category and description must be nonblank; date uses yyyy-MM-dd.

| Method | Path | Purpose |
|---|---|---|
| POST | /user/register | Register; returns 201 and safe user profile |
| POST | /user/login | Login; returns 200 with bearer JWT |
| GET | /expenses | List all expenses for the authenticated user |
| GET | /expenses/page?page=0&size=10 | Return a zero-based page for that user |
| GET | /expense/{id} | Read one owned expense |
| POST | /expense | Create an expense |
| PUT | /expense/{id} | Update an owned expense |
| DELETE | /expense/{id} | Delete an owned expense |
| GET | /expenses/filter?category=Food | Filter by category |
| GET | /expenses/filter/date?startDate=2026-10-01&endDate=2026-10-31 | Filter by inclusive date range |
| GET | /expenses/sort?by=date&direction=desc | Sort by an entity property |

Expense responses contain id, amount, category, description, and date. Missing or non-owned expense IDs return 404. Incorrect or unknown login credentials return the same generic 401 message. Validation failures return 400 with a JSON field-to-message map. Security errors return JSON with status, error, and message.

GET /login is a legacy public greeting endpoint, not the login API; the frontend does not use it.

## Run locally

From the project root, in PowerShell:

1. Start the backend:

   ~~~powershell
   .\mvnw.cmd spring-boot:run
   ~~~

   The backend listens on http://localhost:8080.

2. In a second terminal, serve the frontend:

   ~~~powershell
   python -m http.server 5500 --directory frontend
   ~~~

3. Open http://localhost:5500/index.html. Use the registration link to create an account, then sign in. CORS is configured for this frontend origin.

### Example login and protected request

~~~http
POST http://localhost:8080/user/login
Content-Type: application/json

{ "email": "user@example.com", "password": "<your password>" }
~~~

Use the returned token in a protected request:

~~~http
GET http://localhost:8080/expenses
Authorization: Bearer <JWT>
~~~

## Configuration and data limitations

- H2 uses jdbc:h2:mem:expenses; data is temporary and is lost when the application stops. This is the current development configuration.
- The development JWT key has a local fallback. Set JWT_SECRET to a private random value of at least 32 UTF-8 bytes outside local development; never commit or share it. The configured token lifetime is app.jwt.expiration-seconds (currently 3600 seconds).
- CORS currently allows http://localhost:5500 only. Change it deliberately if the frontend is served from another origin.
- Frontend analytics are derived from /expenses; the API has no separate statistics endpoint. Filter and sort endpoints return full lists without pagination metadata.

## Verification

Run backend build and tests:

~~~powershell
.\mvnw.cmd test
~~~

Check frontend JavaScript syntax:

~~~powershell
node --check frontend/js/api.js
node --check frontend/js/auth.js
node --check frontend/js/dashboard.js
node --check frontend/js/expense.js
~~~
