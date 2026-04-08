# Twin Service Endpoints (SSELFIE Control Plane)

## Base URL

- Production: `https://sselfie.ai`

## Auth

- All Twin endpoints require:
  - `Authorization: Bearer <TWIN_SHARED_SECRET>`
- Backend env required:
  - `TWIN_SHARED_SECRET`

---

## 1) GET `/api/twin/pipeline`

Returns current Brand Engine lead pipeline state.

### Response

```json
{
  "leads": [
    {
      "id": "123",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "instagram": "janedoe",
      "source": "manychat_dm",
      "status": "qualified",
      "score": 85,
      "applied_at": "2026-02-16T08:00:00.000Z",
      "updated_at": "2026-02-16T08:15:00.000Z",
      "notes": "..."
    }
  ],
  "spots_remaining": 9,
  "revenue_total": 6000
}
```

Notes:
- `id` is currently numeric in DB and returned as string (example `"123"`).
- `status` is normalized: `new|qualified|offer_sent|booked|closed|rejected`.

---

## 2) POST `/api/twin/pipeline/update`

Updates lead pipeline status/score/notes.

### Request

```json
{
  "lead_id": "123",
  "status": "qualified",
  "score": 85,
  "notes": "High intent - replied in 2h"
}
```

### Response

```json
{
  "ok": true,
  "lead": {
    "id": "123",
    "status": "qualified",
    "score": 85,
    "updated_at": "2026-02-16T08:20:00.000Z"
  }
}
```

---

## 3) GET `/api/twin/queue`

Returns approval queue items.

### Query params

- `status=pending|approved|rejected|all` (default: `pending`)

### Response

```json
{
  "items": [
    {
      "id": "77",
      "type": "offer_email",
      "lead_id": "123",
      "subject": "Your Brand Engine Spot",
      "body": "Draft content...",
      "status": "pending",
      "created_at": "2026-02-16T08:30:00.000Z"
    }
  ]
}
```

---

## 4) POST `/api/twin/queue/submit`

Submits an item to approval queue.

### Request

```json
{
  "type": "offer_email",
  "lead_id": "123",
  "subject": "Your Brand Engine Spot",
  "body": "Draft content here..."
}
```

### Response

```json
{
  "ok": true,
  "item": {
    "id": "77",
    "type": "offer_email",
    "lead_id": "123",
    "status": "pending",
    "created_at": "2026-02-16T08:30:00.000Z"
  }
}
```

---

## 5) GET `/api/twin/digest?since=<ISO_DATETIME>`

Returns digest summary and action items.

### Response

```json
{
  "new_leads": 3,
  "status_changes": [
    {
      "lead_id": "123",
      "status": "qualified",
      "updated_at": "2026-02-16T08:15:00.000Z"
    }
  ],
  "pending_approvals": 2,
  "spots_remaining": 9,
  "revenue_total": 6000,
  "actions_needed": [
    "Review 2 pending approval item(s).",
    "Follow up with 1 qualified lead(s) with no update in 48h."
  ]
}
```

---

## Security fix included

- `POST /api/admin/brand-engine-calendly` now requires admin auth (`requireAdmin`).

---

## 6) POST `/api/twin/queue/update` (approval status update)

Updates queue item status.

### Request

```json
{
  "id": "77",
  "status": "approved"
}
```

### Response

```json
{
  "ok": true,
  "item": {
    "id": "77",
    "status": "approved",
    "updated_at": "2026-02-16T08:45:00.000Z"
  }
}
```
