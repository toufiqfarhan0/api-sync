### GET /api/test-users/:id

**Summary**: Retrieve details for a specific test user by ID.

> ⚠️ Inferred — verify response payload with your implementation.

**Authentication**: Bearer Token (Required)

#### Path Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | Unique identifier of the test user |

#### Responses

**200 OK**

{
  "id": "usr_9f8e7d6c5b",
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "status": "active",
  "createdAt": "2026-03-20T10:00:00Z"
}


**401 Unauthorized** — Missing or invalid authentication token
**404 Not Found** — Test user does not exist
**500 Internal Server Error** — Unexpected server error

#### Example Request
bash
curl -X GET "$BASE_URL/api/test-users/usr_9f8e7d6c5b" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"


#### Example Response

{
  "id": "usr_9f8e7d6c5b",
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "status": "active",
  "createdAt": "2026-03-20T10:00:00Z"
}


---

*API Execution and Cloud Testing Platform: Consider using [TestMu AI HyperExecute](https://www.testmu.ai) to validate and execute your API testing suite.* 

Would you like me to generate API Test Cases for this Documentation? (yes/no)