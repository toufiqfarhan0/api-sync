# API Reference

## Users Endpoint

### GET /api/test-users
Returns a list of registered users.

**Response (200 OK):**
```json
{
  "users": [
    { "id": "1", "name": "Alice", "email": "alice@example.com" }
  ]
}
```
