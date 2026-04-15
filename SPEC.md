# Dinvest Document Management Portal — Implementation Spec

> **For:** Idan (developer)  
> **Prepared by:** Boaz / Dinvest AG  
> **Mockup:** https://dinvest-folders-design.vercel.app  
> **Repo:** https://github.com/boazbinnun/dinvest-folders-design  
> **Last updated:** 2026-04-15

---

## 1. What This Is

Dinvest AG manages residential and commercial properties across Switzerland. This portal — **inhouse.dinvest.ag** — is an internal dashboard for property managers to:

- See which documents exist for each property
- Spot missing or incomplete document categories
- Track compliance with Swiss legal retention requirements
- Manage unit-level tenant documents
- Guide the migration from the old flat folder system to the new 5-level standard

The current repo contains a **fully interactive React mockup** with hardcoded sample data for 4 real properties. Your job is to replace the hardcoded data with real data from the actual file storage system, and build a backend that scans and indexes the documents.

---

## 2. Tech Stack

### Frontend (already built)
- **React 18** + **Vite**
- **Tailwind CSS** for styling
- **lucide-react** for icons
- Single component file: `src/App.jsx` (1,260 lines)
- No router, no state management library — plain React `useState`

### Backend (to be built)
- Your choice — Node.js / Python / Next.js API routes all work
- Must expose a REST or GraphQL API that the frontend consumes
- Must be deployable on Vercel (preferred, already set up)

### File Storage
- Current: **SharePoint / OneDrive** or local NAS (confirm with Boaz)
- The backend must be able to scan folder structures and return document metadata

---

## 3. Current Data Model (hardcoded in mockup)

### 3.1 Property (`PROPERTIES` object in App.jsx)

Each property has:

```js
{
  id: "020",                  // 3-digit mandate number
  owner: "Kobella Limited",   // legal owner name
  ownerTag: "Kobella",        // short label for display
  address: "Zehntenstr. 58-58a",
  city: "4133 Pratteln",
  type: "MFH",                // MFH | COM | MIX (residential / commercial / mixed)
  typeLabel: "Mehrfamilienhaus / Residential",
  buildings: 1,               // number of buildings
  units: 30,                  // total rental units
  files: 1664,                // total files found in current scan
  filingSystem: "Flat",       // "Flat" = old system, "Hierarchical" = already migrated
  color: "#9B59B6",           // UI accent color per property
  scanNote_de: "...",         // human-readable scan summary in German
  scanNote_en: "...",         // human-readable scan summary in English
  severity: "ok"              // ok | warning | critical — overall health indicator
}
```

**Current 4 properties:**

| ID | Owner | Address | Type | Buildings | Units | Files |
|----|-------|---------|------|-----------|-------|-------|
| 020 | Kobella Limited | Zehntenstr. 58-58a, Pratteln | MFH | 1 | 30 | 1,664 |
| 023 | Kobella Limited | Steinenbachgässlein 49, Basel | COM | 1 | 15 | 764 |
| 200 | GAD Real Estate AG | Kanalgasse 36-38 / Marktgasse 37, Biel | MIX | 3 | 49 | 1,012 |
| 201 | GAD Real Estate AG | Niederfeldweg 2, Schönenbuch | MFH | 3 | 61 | 1,172 |

---

### 3.2 The 13 Mandatory Document Categories (`MANDANT_CATEGORIES`)

Every property must have all 13 categories. Each category has a status per property: `ok` | `partial` | `missing`.

| Nr | German | English | Legal | Retention |
|----|--------|---------|-------|-----------|
| 01 | Ablage | Filing Archive | OR 958f | 10 years |
| 02 | Bewirtschaftungsvertrag | Management Contract | OR 394ff | Term + 10y |
| 03 | Buchhaltung | Accounting | OR 958f, MWSTG | 10–20 years |
| 04 | Versicherungen | Insurance | VVG | Term + 10y |
| 05 | Service-Verträge | Service Contracts | OR 363ff | Term + 10y |
| 06 | Hauswartung | Caretaker | OR 394ff | Term + 10y |
| 07 | Versicherungsschäden | Insurance Claims | VVG | 10 years |
| 08 | Korrespondenz | Correspondence | OR, DSG | 10 years |
| 09 | Pläne | Building Plans | SIA | Building lifetime |
| 10 | Fotos | Photos | — | Building lifetime |
| 11 | Renovationen | Renovations | OR 363ff | Term + 10y |
| 12 | Mietverhältnisse | Tenancy Overview | OR 253ff | Term + 10y |
| 13 | Compliance | Compliance | VKF, EnG, NIV | Permanent |

---

### 3.3 The 5-Level Folder Hierarchy

```
L0  {NNN} - {Street}, {ZIP City} - {Owner}        ← one root folder per property
L1  {NN} {Category Name}                           ← 13 mandatory categories
L2  {Street Name Nr.}                              ← building (only for multi-building)
L3  {UnitNr} {Type} {Floor} {Side}                 ← individual rental unit
L4  {Document Type}                                ← 5 tenant doc sub-folders
```

**L4 tenant sub-folders (per unit):**

| ID | German | English | Legal | Retention |
|----|--------|---------|-------|-----------|
| U1 | Mietvertrag | Lease Agreement | OR 253ff | Term + 10y |
| U2 | Depot | Security Deposit | OR 257e | Term + 1y |
| U3 | Bewerbung | Application | DSG 2023 | Max 6 months |
| U4 | Übergabe | Handover Protocol | OR 267a | Term + 3y |
| U5 | Korrespondenz | Correspondence | OR, DSG | 10 years |

---

### 3.4 Unit Data (`ALL_BUILDINGS`)

Each property has one or more buildings, each building has units:

```js
ALL_BUILDINGS["020"] = [
  {
    name: "Zehntenstr. 58-58a",   // building address/name
    units: [
      {
        id: "1001",               // Immotop2 unit number
        type: "Wohnung 1. OG links",
        docs: {
          lease: "ok",            // ok | partial | missing
          deposit: "ok",
          application: "partial",
          handover: "missing",
          correspondence: "ok"
        }
      },
      // ...
    ]
  }
]
```

---

## 4. The 8 Views / Pages

### 4.1 Property Selector (sidebar / left panel)
- Lists all properties with ID, address, owner, severity badge
- Clicking a property loads its data on the right
- Search/filter by owner or address

### 4.2 Dashboard (per property)
- Shows overall completeness progress bar (OK / Partial / Missing)
- Red alert panel: missing categories
- Amber warning panel: incomplete categories
- Grid of all 13 categories with status, file count, and gap notes

### 4.3 Folder Tree (per property)
- Interactive tree view of the actual folder structure
- Expandable nodes for L0 → L1 → L2 → L3 → L4
- Each node shows status badge
- Clicking a node expands/collapses children

### 4.4 Units (per property)
- Summary bar: total units, completeness progress
- Building tabs (for multi-building properties)
- Table: one row per unit, columns for each of the 5 tenant doc types
- Status badges in each cell
- Red row highlight for units with zero documents

### 4.5 Folder Structure reference (global)
- Table of the 5-level hierarchy with patterns and examples
- Table of all 13 mandate categories
- Table of the 5 unit doc sub-folders

### 4.6 Categories (global)
- Detailed view of all 13 categories with current folder names and required migration action
- Migration action types: `prefix` (just add number), `rename`, `split`, `new` (build from scratch)
- Unit docs detail table with retention per document type

### 4.7 Naming Conventions (global)
- General naming rules (language, allowed chars, date format, versioning, max path length)
- Before → After rename table showing current names and what they become
- File naming patterns by document type with examples

### 4.8 Legal & Retention (global)
- Swiss law reference table with links to Fedlex (official Swiss law portal)
- Retention matrix: document type → retention period → legal basis → notes
- Clickable law abbreviations (OR, VVG, DSG, etc.) that open the law text in a new tab

### 4.9 Migration Tracker (global)
- 4-phase checklist (Preparation → File Migration → Compliance Build → QA & Sign-Off)
- Per-property phase status tracking (checkboxes)
- Phases: Preparation, File Migration, Compliance Build, QA & Sign-off

---

## 5. UI & Language

- **Bilingual:** German primary, English secondary
- Language toggle (DE / EN) in the header — switches all labels, descriptions, and column headers
- Color system:
  - 🟢 Green (`emerald-500`) = OK / complete
  - 🟡 Amber (`amber-400`) = Partial / incomplete
  - 🔴 Red (`red-400`) = Missing / critical
- Header: blue gradient (`from-blue-900 to-blue-700`)
- Cards: white with `gray-200` border and rounded corners
- Font: system default (Tailwind base)

---

## 6. What Needs to Be Built

### 6.1 Backend API

Replace all hardcoded data in `App.jsx` with API calls. Suggested endpoints:

```
GET /api/properties                    → list of all properties with severity
GET /api/properties/:id                → property detail + category statuses + file counts
GET /api/properties/:id/buildings      → buildings + units + doc statuses
GET /api/properties/:id/folder-tree   → full folder tree with statuses
```

### 6.2 File Scanner

A service that:
1. Connects to the file storage (SharePoint, NAS, or local)
2. Walks the folder structure of each property
3. Maps folders to the 13 categories
4. Counts files per category
5. Determines status: `ok` (has files), `partial` (has some but incomplete), `missing` (empty folder or doesn't exist)
6. Stores results in a database (Postgres, SQLite, or even a JSON file for MVP)

### 6.3 Data Persistence

For MVP a JSON file or SQLite is fine. Long-term: Postgres.

Schema suggestion:

```sql
properties (id, owner, address, city, type, buildings, units, filing_system, last_scan)
property_categories (property_id, category_num, file_count, status, gap_notes)
buildings (id, property_id, name, address)
units (id, building_id, immotop_id, type, floor, side)
unit_docs (unit_id, doc_type, status)
```

### 6.4 Authentication

- Simple email/password login for internal users
- Roles: Admin, Property Manager, Read-only
- No public access required

---

## 7. Key Swiss Legal Context (for the developer)

The retention rules in this system are not just UX labels — they have real legal backing. Don't remove or simplify them. The Swiss laws linked in the app (OR, MWSTG, VVG, DSG 2023, etc.) can all be found on [fedlex.admin.ch](https://www.fedlex.admin.ch).

Key rules to preserve:
- Financial records: **10 years** (OR 958f), extended to **20 years** for real estate (MWSTG Art. 70.3)
- Lease agreements: **term + 10 years** after tenancy ends
- Tenant personal data (applications): **max 6 months** after rejection (DSG 2023 — GDPR equivalent)
- Building plans: **building lifetime** — never delete while building exists
- GEAK, SiNa, fire certs: **permanent**

---

## 8. Questions for Boaz Before Starting

1. Where are the files stored? (SharePoint, OneDrive, NAS, Dropbox?)
2. Is there an existing API for accessing files, or does the scanner need direct file system access?
3. Is Immotop2 available as a data source for unit IDs and tenant data?
4. What's the expected number of properties at launch vs. long-term?
5. Should the migration tracker state be persisted (per user, per session)?
6. Is authentication via Microsoft SSO (since SharePoint is likely Microsoft) preferred?

---

## 9. Out of Scope (for now)

- Document upload / file management from within the portal
- Automated document scanning / OCR
- Email notifications for missing documents
- Tenant-facing portal
- Mobile app

---

## 10. Contact

**Boaz Binnun** — boazbn@gmail.com  
Dinvest AG, Basel
