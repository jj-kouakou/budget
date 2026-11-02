# Local-first PWA with no backend

Context: the app is personal, single-user, and used from one phone. We decided
it ships as an installable PWA whose data lives entirely in the phone's browser
storage, with static hosting as the only deployment target. A backend would add
auth, sync, conflict resolution, and an operational surface in exchange for
multi-device access we explicitly do not need. The cost we accept: the ledger
can be lost to storage eviction or a cleared site, so persistent-storage
permission and a real export/import path are required features, not extras.

Status: accepted
