# Maya Capability Matrix

Last updated: 2026-03-10

## Canonical Contracts
- Conversation backend: `/api/maya/chat`
- Thread state: `maya_chats`, `maya_chat_messages`
- User image history: `ai_images`
- User memory: `user_personal_brand`, `maya_personal_memory`
- Generated asset drafts: `maya_produced_assets`, `personal_pages`

## Canonical Journeys

| Journey | Entry Surface | Owner Route / Flow | Owner Data | Notes |
| --- | --- | --- | --- | --- |
| First chat | `/studio` -> Maya | `/api/maya/chat` | `maya_chats`, `maya_chat_messages` | Maya home state should reduce decisions before first output |
| Classic image | Maya chat | `/api/maya/chat` -> Classic generation | `generated_images`, `ai_images` | User-facing history stays canonical in `ai_images` |
| Pro image | Maya chat | `/api/maya/chat` -> Pro/Nano Banana | `ai_images` | Reference-image flow stays inline |
| Gallery save | Maya chat | `/api/images/bulk-save`, `/api/gallery/images` | `ai_images` | Maya can surface and save recent images inline |
| Photoshoot | Maya chat follow-on | Maya image -> photoshoot flow | image tables + chat state | Should stay attached to the originating chat turn |
| Video | Maya chat follow-on | Maya image -> video flow | `generated_videos` + chat state | Source images selected inline from Maya |
| Feed | Maya chat | `/api/maya/chat` -> inline feed card -> Feed Planner deep editor | `feed_layouts`, `feed_posts`, Maya chat messages | Entry is inline in Maya; deeper editing stays in Feed Planner |
| Training | Maya chat / Studio | training flow + model completion | user model state | Completion should affect Classic defaults immediately |
| Content calendar | Maya chat | `/api/maya/chat` -> `/api/maya/create-calendar` | `maya_produced_assets`, `personal_pages`, Maya memory | Calendar draft should render inline and reopen from chat |
| HTML / page draft | Maya chat | `/api/maya/chat` -> `/api/maya/create-page` | `maya_produced_assets`, `personal_pages`, Maya memory | Draft preview, reopen, and publish stay on existing page infra |

## Release Gates
- Every Maya journey needs:
  - one owner route
  - one owner persistence path
  - one reload-safe inline renderer
  - one targeted test
  - one manual smoke path
- Shell navigation remains stable during this hardening phase:
  - `Chat`
  - `Studio`
  - `Calendar`
  - `Profile`
- Feed, calendar, and page creation should start in Maya chat, not by routing users away from Maya first.
