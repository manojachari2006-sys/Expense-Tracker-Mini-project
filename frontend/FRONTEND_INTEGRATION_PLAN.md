# Frontend integration reference

This reference was refreshed against the current Spring Boot source while implementing the dashboard. The backend remains unchanged. Local API origin: `http://localhost:8080`; CORS permits the frontend origin `http://localhost:5500`.

## Backend structure and authentication

The backend is a Spring MVC / Spring Data JPA application under `com.shreyas.expence.proj`, with controllers, services, repositories, DTOs, entities, exception advice, and a `security` package. `SecurityConfig` enables stateless bearer-token security. Registration stores BCrypt hashes. Login authenticates email/password and returns a signed JWT with a one-hour configured lifetime (`expiresIn` is supplied by the response).

Registration: `POST /user/register`, public. Request: `{ "name": "...", "email": "...", "password": "..." }`. Required: nonblank name/password and nonblank valid email. Success: `201` and `{ "id": 1, "name": "...", "email": "..." }`. Duplicate email: `409` JSON `{ "status": 409, "error": "Conflict", "message": "Email already exists" }`.

Login: `POST /user/login`, public. Request: `{ "email": "...", "password": "..." }`. Both are nonblank and email must be valid. Success: `200` and `{ "token": "...", "tokenType": "Bearer", "expiresIn": 3600, "user": { "id": 1, "name": "...", "email": "..." } }`. Missing account and incorrect password use the same generic `401` response: `{ "status": 401, "error": "Unauthorized", "message": "Invalid email or password" }`.

The client stores the token and safe `user` object in `localStorage` under `ledgerly.auth`; it never stores the password. Protected requests send `Authorization: Bearer <token>`. Missing, invalid, or expired token returns `401` JSON with message `Missing, invalid, or expired bearer token`; forbidden returns `403` JSON. The API module clears local auth and redirects to login on protected `401` responses.

## Expense API inventory

All expense endpoints below require a valid bearer token and operate only on the authenticated user's expenses. Ownership is derived from the JWT subject; clients must not send a user ID.

Expense request body for create/update: `{ "amount": 12.50, "category": "Food", "description": "Lunch", "date": "2026-10-03" }`. Amount is required and positive; category and description are required nonblank strings; date is required in `yyyy-MM-dd` form. Responses contain `{ "id": 1, "amount": 12.50, "category": "Food", "description": "Lunch", "date": "2026-10-03" }`.

| Method and path | Request / response |
|---|---|
| `GET /expenses` | Full list for current user; response is an array of expense responses. Used to calculate all-time summaries and category options. |
| `GET /expenses/page?page=0&size=10` | Zero-based page and size query parameters; returns only the current user's page as an array. Response does not include total count/page metadata. |
| `GET /expense/{id}` | Returns the owned expense; missing or non-owned ID returns `404` `ApiError`. |
| `POST /expense` | Expense request body; returns `201` and created response. |
| `PUT /expense/{id}` | Expense request body; returns `200` and updated response; missing/non-owned ID returns `404`. |
| `DELETE /expense/{id}` | Returns `200` with `Deleted Successfully`; missing/non-owned ID returns `404`. |
| `GET /expenses/filter?category=Food` | Category query parameter; returns matching current-user array. |
| `GET /expenses/filter/date?startDate=2026-10-01&endDate=2026-10-31` | Inclusive `LocalDate` range query parameters; returns matching current-user array. |
| `GET /expenses/sort?by=date&direction=desc` | Sort property and direction query parameters; returns the current user's full sorted array. Backend selects descending only for `desc`, otherwise ascending. |

There is no dedicated summary or statistics endpoint. The filtering and sorting routes return lists and do not accept paging parameters. The interface therefore uses real backend pagination only in the unfiltered/default list; filtered/sorted results are displayed as returned. Where category and date filters are combined, the client intersects the two real API results by expense ID. Where sorting is combined with filters, the client sorts the filtered result because no combined endpoint exists.

## Error and server behavior

Validation failures return `400` with a JSON map of field names to validation messages. Duplicate registration returns the `409` `ApiError` above. Unknown email/password login returns generic `401`. Missing/non-owned expense returns `404` with `{ "status": 404, "error": "Not Found", "message": "Expense not found" }`. Authentication errors return the `401` JSON above. The client shows friendly UI messages and field-level validation where a field map is available.

No explicit `server.port` is set, so Spring Boot uses `8080`. CORS allows `http://localhost:5500`, methods `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, and headers `Content-Type`, `Authorization`.

## Frontend file responsibilities

```text
frontend/
├── index.html                 # Login page
├── register.html              # Registration page
├── dashboard.html             # Authenticated dashboard shell and expense view
├── FRONTEND_INTEGRATION_PLAN.md
├── css/
│   ├── style.css              # Shared design tokens and base styles
│   ├── auth.css               # Login and registration layout
│   └── dashboard.css          # Responsive dashboard, list, modal, and toast styles
├── js/
│   ├── api.js                 # Fetch wrapper, auth header, endpoint helpers, errors
│   ├── auth.js                # Registration/login forms and auth storage helpers
│   ├── dashboard.js           # Auth guard, user greeting, summaries, rendering, notices
│   └── expense.js             # Expense CRUD, filtering, sorting, paging, form validation
└── assets/                    # Optional static assets
```

## Development/run sequence

1. Start the backend from the project root with `./mvnw spring-boot:run` (Windows: `mvnw.cmd spring-boot:run`).
2. Serve the `frontend/` directory over HTTP from the project root with `python -m http.server 5500 --directory frontend`.
3. Open `http://localhost:5500/index.html`, register or sign in, then use the dashboard. Do not use `file://`; the configured CORS origin is the local HTTP server.
4. Keep backend contracts authoritative. No backend changes were required for the current frontend integration.
