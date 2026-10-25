# QuickNotes — API Client & System Design

QuickNotes is a browser-based REST API practice client and a production system-design proposal for a note-taking service supporting **1 million registered users**. The browser uses [JSONPlaceholder](https://jsonplaceholder.typicode.com/) to demonstrate GET, POST and DELETE; the backend documents specify a separate real QuickNotes API.

## Run the API client
1. Clone this repository: `git clone <YOUR_GITHUB_REPOSITORY_URL>`.
2. Open the project folder in VS Code.
3. Start a local static server, e.g. `python -m http.server 8000` from the repository root.
4. Visit `http://localhost:8000` in your browser (internet connection required).
5. Click **Load notes**, create a note using the form, and delete a note using its button. Watch the status messages and disabled buttons.

No build tools or npm dependencies are required. The HTML file loads `style.css` and `api.js` from the same folder. Open DevTools → Console/Network if troubleshooting.

## API behavior and limitations
- GET requests the latest ten sample posts with `?_limit=10` and renders title and body.
- POST validates a trimmed title of 1–100 characters and sends `{title, body, userId: 1}`; a successful response is inserted at the top.
- DELETE sends `/posts/{id}` and removes the selected note only after a successful response.
- JSONPlaceholder **does not persist** POST/DELETE changes. The client tracks notes in memory with unique local keys (even when mock POSTs return the same ID). Reloading from the server resets the list; refreshing the page clears it.
- Errors, empty results and in-progress states are displayed; requests disable buttons to prevent overlapping actions.
- User-supplied text is inserted with `textContent`, not `innerHTML`.

## Technical documents
- [REST API Design](docs/api-design.md) — endpoints, JSON contracts, status codes and errors.
- [Data Model](docs/data-model.md) — PostgreSQL schema, relationships, SQL queries and indexes.
- [Architecture](docs/architecture.md) — requirements, load estimates, diagram, flows and trade-offs.

## What I learned
1. How to call REST APIs with `fetch`, async/await and explicit HTTP error handling.
2. How to implement GET, POST and DELETE with form validation, loading states and accessible feedback.
3. Why mock API responses are not the same as persistent storage and how to manage local UI state.
4. How relational database keys, join tables and indexes support a scalable application.
5. How caching, load balancing, replicas and queues affect performance, reliability and consistency.

 
