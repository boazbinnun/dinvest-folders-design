import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, AlertTriangle, CheckCircle, XCircle, Info, Search, Building2, Users, Shield, Eye, EyeOff, BookOpen, Scale, FileSignature, ClipboardList } from "lucide-react";

// ─── DATA ───
const SCAN_DATE = "30.03.2026";

const PROPERTIES = {
  "020": {
    id: "020", owner: "Kobella Limited", ownerTag: "Kobella",
    address: "Zehntenstr. 58-58a", city: "4133 Pratteln", type: "MFH",
    typeLabel: "Mehrfamilienhaus / Residential", buildings: 1, units: 30, files: 1664,
    filingSystem: "Flat", color: "#9B59B6",
    scanNote_de: "Gut dokumentiert — 26 aktive Mieter, starkes Fotoarchiv",
    scanNote_en: "Well documented — 26 active tenants, strong photo archive",
    severity: "ok"
  },
  "023": {
    id: "023", owner: "Kobella Limited", ownerTag: "Kobella",
    address: "Steinenbachgässlein 49", city: "4051 Basel", type: "COM",
    typeLabel: "Gewerbe / Commercial", buildings: 1, units: 15, files: 764,
    filingSystem: "Flat", color: "#E67E22",
    scanNote_de: "Solide Basis — Handwerker-Ordner muss aufgeteilt werden",
    scanNote_en: "Solid base — Handwerker folder needs splitting",
    severity: "warning"
  },
  "200": {
    id: "200", owner: "GAD Real Estate AG", ownerTag: "David Gast",
    address: "Kanalgasse 36-38 / Marktgasse 37", city: "2502 Biel", type: "MIX",
    typeLabel: "Gemischt / Mixed Use", buildings: 3, units: 49, files: 1012,
    filingSystem: "Hierarchical", color: "#2E75B6",
    scanNote_de: "Service-Verträge + Korrespondenz fehlen komplett",
    scanNote_en: "Service contracts + correspondence completely missing",
    severity: "warning"
  },
  "201": {
    id: "201", owner: "GAD Real Estate AG", ownerTag: "David Gast",
    address: "Niederfeldweg 2", city: "4124 Schönenbuch", type: "MFH",
    typeLabel: "Mehrfamilienhaus / Residential", buildings: 3, units: 61, files: 1172,
    filingSystem: "Hierarchical", color: "#27AE60",
    scanNote_de: "632 Fotos stark — Service-Verträge + Renovationen fehlen",
    scanNote_en: "632 photos strong — service contracts + renovations missing",
    severity: "warning"
  }
};

const MANDANT_CATEGORIES = [
  { id: "ablage", num: "01", de: "Ablage", en: "Filing Archive", icon: "📁", legal: "OR 958f, MWSTG", retention: "10 Jahre",
    currentFolder: { name: "Ablage/", action: "prefix", label: "Add number prefix" },
    statuses: { "020": "ok", "023": "ok", "200": "ok", "201": "ok" },
    fileCounts: { "020": 233, "023": 213, "200": 479, "201": 337 },
    gaps: {},
    desc_de: "Laufende Rechnungen und Bankauszüge, nach Jahr geordnet",
    desc_en: "Current invoices and bank statements, organized by year" },
  { id: "vertrag", num: "02", de: "Bewirtschaftungsvertrag", en: "Management Contract", icon: "📋", legal: "OR 394ff", retention: "Dauer+10J",
    currentFolder: { name: "Bewirtschaftungsvertrag/", action: "prefix", label: "Add number prefix" },
    statuses: { "020": "ok", "023": "ok", "200": "partial", "201": "partial" },
    fileCounts: { "020": 11, "023": 5, "200": 1, "201": 1 },
    gaps: { "200": "Only 1 file — missing signed contract or annexes", "201": "Only 1 file — missing signed contract or annexes" },
    desc_de: "Verwaltungsvertrag zwischen Eigentümer und Dinvest",
    desc_en: "Management contract between owner and Dinvest" },
  { id: "buchhaltung", num: "03", de: "Buchhaltung", en: "Accounting", icon: "💰", legal: "OR 958f, MWSTG", retention: "10-20 Jahre",
    currentFolder: { name: "Buchhaltung/", action: "prefix", label: "Add number prefix" },
    statuses: { "020": "ok", "023": "ok", "200": "ok", "201": "ok" },
    fileCounts: { "020": 67, "023": 48, "200": 44, "201": 30 },
    gaps: {},
    desc_de: "Jahresabschluss, HNK-Abrechnungen, Inkasso, Bankbelege",
    desc_en: "Annual statements, ancillary costs, collections, bank receipts" },
  { id: "versicherungen", num: "04", de: "Versicherungen", en: "Insurance", icon: "🛡️", legal: "VVG", retention: "Dauer+10J",
    currentFolder: { name: "Versicherungen/", action: "prefix", label: "Add number prefix" },
    statuses: { "020": "ok", "023": "partial", "200": "partial", "201": "partial" },
    fileCounts: { "020": 33, "023": 4, "200": 2, "201": 3 },
    gaps: { "023": "Only 4 files — missing liability policy and schedule", "200": "Only 2 files — missing building and liability policies", "201": "Only 3 files — missing building insurance schedule" },
    desc_de: "Aktuelle und alte Versicherungspolicen (Gebäude, Haftpflicht)",
    desc_en: "Current and old insurance policies (building, liability)" },
  { id: "service", num: "05", de: "Service-Verträge", en: "Service Contracts", icon: "🔧", legal: "OR 363ff", retention: "Dauer+10J",
    currentFolder: { name: "Handwerker/ ⚠", action: "split", label: "Split from 11 Renovationen" },
    statuses: { "020": "partial", "023": "partial", "200": "missing", "201": "missing" },
    fileCounts: { "020": "~40*", "023": "~40*", "200": 0, "201": 0 },
    gaps: { "020": "Files exist in Handwerker folder — need to split out", "023": "Files exist in Handwerker folder — need to split out", "200": "No service contracts found — HVAC, elevator, cleaning needed", "201": "No service contracts found — HVAC, elevator, cleaning needed" },
    desc_de: "Heizung, Lift, Reinigung, Gartenpflege (*in Handwerker-Ordner)",
    desc_en: "HVAC, elevator, cleaning, landscaping (*in Handwerker folder)" },
  { id: "hauswartung", num: "06", de: "Hauswartung", en: "Caretaker", icon: "🏠", legal: "Best Practice", retention: "Aktiv",
    currentFolder: { name: "Hauswart/", action: "rename", label: "Rename + number prefix" },
    statuses: { "020": "ok", "023": "ok", "200": "ok", "201": "partial" },
    fileCounts: { "020": 18, "023": 5, "200": 16, "201": 1 },
    gaps: { "201": "Only 1 file — missing caretaker contract, access codes, cleaning schedule" },
    desc_de: "HW-Verträge, Aufträge, Zutritt-Codes, Reinigungspläne",
    desc_en: "Caretaker contracts, tasks, access codes, cleaning schedules" },
  { id: "schaeden", num: "07", de: "Versicherungsschäden", en: "Insurance Claims", icon: "⚠️", legal: "VVG", retention: "10J n. Abschl.",
    currentFolder: { name: "Versicherungsschäden/", action: "prefix", label: "Add number prefix" },
    statuses: { "020": "partial", "023": "missing", "200": "ok", "201": "partial" },
    fileCounts: { "020": 3, "023": 0, "200": 13, "201": 3 },
    gaps: { "020": "Only 3 claims — check if historical claims are unfiled", "023": "No claims folder exists — create even if currently empty", "201": "Only 3 claims — verify all open cases are documented" },
    desc_de: "Schadenmeldungen für Allgemeinteile und Mietobjekte",
    desc_en: "Claims for common areas and rental units" },
  { id: "korrespondenz", num: "08", de: "Korrespondenz", en: "Correspondence", icon: "✉️", legal: "OR, DSG 2023", retention: "10 Jahre",
    currentFolder: { name: "— no folder", action: "new", label: "Scattered in Ablage/Diverses — collect" },
    statuses: { "020": "partial", "023": "partial", "200": "missing", "201": "missing" },
    fileCounts: { "020": "verstreut", "023": "verstreut", "200": 0, "201": 0 },
    gaps: { "020": "Letters scattered across other folders — consolidate", "023": "Letters scattered across other folders — consolidate", "200": "No correspondence folder — owner/tenant letters missing", "201": "No correspondence folder — owner/tenant letters missing" },
    desc_de: "Briefe an/von Eigentümer, Mieter, Behörden, Handwerker",
    desc_en: "Letters to/from owner, tenants, authorities, contractors" },
  { id: "plaene", num: "09", de: "Pläne", en: "Building Plans", icon: "📐", legal: "SIA, VKF/BSV", retention: "Gebäudelebensd.",
    currentFolder: { name: "Pläne/", action: "prefix", label: "Add number prefix" },
    statuses: { "020": "ok", "023": "ok", "200": "ok", "201": "partial" },
    fileCounts: { "020": 34, "023": 20, "200": 157, "201": 4 },
    gaps: { "201": "Only 4 plans — missing HVAC, electrical, and fire safety plans" },
    desc_de: "Grundriss, Heizung, Sanitär, Lüftung, Brandschutz, Elektro",
    desc_en: "Floor plans, HVAC, plumbing, ventilation, fire, electrical" },
  { id: "fotos", num: "10", de: "Fotos", en: "Photos", icon: "📷", legal: "Best Practice", retention: "Gebäudelebensd.",
    currentFolder: { name: "Fotos/", action: "prefix", label: "Add number prefix" },
    statuses: { "020": "ok", "023": "ok", "200": "ok", "201": "ok" },
    fileCounts: { "020": 330, "023": 204, "200": 104, "201": 632 },
    gaps: {},
    desc_de: "Marketing-Fotos, Allgemeinteile, Zustandsdokumentation",
    desc_en: "Marketing photos, common areas, condition documentation" },
  { id: "renovationen", num: "11", de: "Renovationen", en: "Renovations", icon: "🔨", legal: "Best Practice, SIA 118", retention: "10+ Jahre",
    currentFolder: { name: "Handwerker/ ⚠", action: "split", label: "Split from 05 Service-Verträge" },
    statuses: { "020": "partial", "023": "partial", "200": "missing", "201": "missing" },
    fileCounts: { "020": "~56*", "023": "~56*", "200": 0, "201": 0 },
    gaps: { "020": "Files in Handwerker folder — split into own category", "023": "Files in Handwerker folder — split into own category", "200": "No renovation records found — collect project docs", "201": "No renovation records found — collect project docs" },
    desc_de: "Projekte, Offerten, Rechnungen (*in Handwerker-Ordner)",
    desc_en: "Projects, quotes, invoices (*in Handwerker folder)" },
  { id: "mietverhaeltnisse", num: "12", de: "Mietverhältnisse", en: "Tenancy Overview", icon: "👥", legal: "OR 253ff", retention: "Aktuell",
    currentFolder: { name: "Mieter/", action: "rename", label: "Rename + number prefix" },
    statuses: { "020": "ok", "023": "ok", "200": "ok", "201": "partial" },
    fileCounts: { "020": 681, "023": 157, "200": 8, "201": 6 },
    gaps: { "201": "Only 6 files for 61 units — missing rent roll and termination list" },
    desc_de: "Mieterspiegel, Kündigungsliste, Mieterverzeichnis",
    desc_en: "Rent roll, termination list, tenant directory" },
  { id: "compliance", num: "13", de: "Compliance", en: "Compliance", icon: "✅", legal: "EnG, NIV, VKF, DSG 2023", retention: "Permanent",
    currentFolder: { name: "SINA/ (1 file)", action: "new", label: "Rename + build mostly new" },
    statuses: { "020": "partial", "023": "partial", "200": "partial", "201": "missing" },
    fileCounts: { "020": "minimal", "023": "minimal", "200": 1, "201": 0 },
    gaps: { "020": "Missing GEAK, SiNa/NIV, fire safety plan, land registry", "023": "Missing GEAK, electrical cert., fire safety, land registry", "200": "Only 1 file — missing GEAK, SiNa/NIV, fire safety, DSG notice", "201": "No compliance docs — all certificates need to be collected" },
    desc_de: "GEAK, SiNa/NIV, Brandschutzkonzept, DSG-Erklärung, Grundbuchauszug",
    desc_en: "Energy cert., electrical cert., fire protection, privacy notice, land registry" }
];

const UNIT_DOCS = [
  { id: "mietvertrag", de: "Mietvertrag", en: "Lease Agreement", legal: "OR 253ff" },
  { id: "depot", de: "Mietzinsdepot", en: "Security Deposit", legal: "OR 257e" },
  { id: "bewerbung", de: "Bewerbung", en: "Application", legal: "DSG 2023" },
  { id: "uebergabe", de: "Übergabe", en: "Handover Protocol", legal: "Best Practice" },
  { id: "korrespondenz", de: "Korrespondenz", en: "Correspondence", legal: "OR 253ff, DSG" }
];

const ALL_BUILDINGS = {
  "200": [
    { name: "Kanalgasse 36", units: [
      { id: "4031", type: "Büro 3. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4032", type: "Büro 3. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4033", type: "Büro 3. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4034", type: "Büro 3. OG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4035", type: "Büro 3. OG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "ok" }},
      { id: "4036", type: "Lagerraum 3. OG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "ok" }},
      { id: "4037", type: "Büro 3. OG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4038", type: "Büro 3. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4039", type: "Büro 3. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4040", type: "Büro 4. OG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4041", type: "Büro 4. OG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4042", type: "Büro 4. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "ok" }},
      { id: "4043", type: "Büro 4. OG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4044", type: "Büro 4. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4045", type: "Büro 4. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4046", type: "Sportanlage 4. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4047", type: "Büro 4. OG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4048", type: "Büro 4. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4049", type: "Büro 4. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4051", type: "Büro 5. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
    ]},
    { name: "Kanalgasse 38", units: [
      { id: "2091", type: "Lagerraum 2. UG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "2092", type: "Lagerraum 2. UG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "2093", type: "Lagerraum 1. UG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "3001", type: "Ladenfläche EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "3002", type: "Ladenfläche EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "3003", type: "Automat EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "3011", type: "Gewerbe 1. OG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "3091", type: "Ladenfläche 1. UG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4021", type: "Büro 2. OG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4022", type: "Büro 2. OG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4023", type: "Terrasse 2. OG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "9001", type: "Antenne DG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "9002", type: "Antenne DG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "9101", type: "Werbefläche EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
    ]},
    { name: "Marktgasse 37", units: [
      { id: "1131", type: "1-Zi Whg 3. OG li", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1132", type: "1-Zi Whg 3. OG re", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1133", type: "2½-Zi Whg 3. OG li", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1134", type: "3½-Zi Whg 3. OG re", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1141", type: "2½-Zi Whg 4. OG li", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1142", type: "1-Zi Whg 4. OG re", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1143", type: "2½-Zi Whg 4. OG li", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1144", type: "3½-Zi Whg 4. OG re", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "4151", type: "Büro 5. OG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
    ]}
  ],
  "201": [
    { name: "Baselstrasse 12", units: [
      { id: "1111", type: "3½-Zi 1. OG li", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1112", type: "4½-Zi 1. OG re", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1121", type: "3½-Zi 2. OG li", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1122", type: "4½-Zi 2. OG re", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1131", type: "4½-Zi 3. OG li", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "ok" }},
      { id: "1132", type: "5-Zi 3. OG re", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "ok" }},
    ]},
    { name: "Baselstrasse 14", units: [
      { id: "1211", type: "4½-Zi 1. OG li", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1212", type: "3½-Zi 1. OG re", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1221", type: "4½-Zi 2. OG li", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "ok" }},
      { id: "1222", type: "3½-Zi 2. OG re", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1231", type: "5-Zi 3. OG li", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1232", type: "4½-Zi 3. OG re", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
    ]},
    { name: "Niederfeldweg 2", units: [
      { id: "1011", type: "4½-Zi 1. OG li", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1012", type: "3½-Zi 1. OG re", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1021", type: "3½-Zi 2. OG li", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "ok" }},
      { id: "1022", type: "3½-Zi 2. OG re", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1031", type: "5-Zi 3. OG li", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "1032", type: "4½-Zi 3. OG re", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "2001", type: "Hobbyraum EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "2002", type: "Hobbyraum EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "2003", type: "Hobbyraum EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "2101", type: "Hobbyraum EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "2102", type: "Hobbyraum EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "2201", type: "Hobbyraum EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "2202", type: "Hobbyraum EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "2203", type: "Hobbyraum EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "5001", type: "Einzelgarage EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "5002", type: "Einzelgarage EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "5003", type: "Einzelgarage EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "5004", type: "Einzelgarage EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "5005", type: "Einzelgarage EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "5006", type: "Einzelgarage EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "5007", type: "Einzelgarage EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "5008", type: "Einzelgarage EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "5009", type: "Einzelgarage EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "6001", type: "Abstellplatz EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "6002", type: "Abstellplatz EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "6003", type: "Abstellplatz EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "6004", type: "Abstellplatz EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "6005", type: "Abstellplatz EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "6006", type: "Abstellplatz EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "6007", type: "Abstellplatz", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "6008", type: "Abstellplatz EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "6009", type: "Abstellplatz EG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
      { id: "8000", type: "Infrastruktur 3. OG", docs: { mietvertrag: "missing", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
    ]}
  ],
  "020": [{ name: "Zehntenstr. 58-58a", units: [
    { id: "W7", type: "3½-Zi Whg 58", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "ok", korrespondenz: "ok" }},
    { id: "W9", type: "4½-Zi Whg 58", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "ok", korrespondenz: "ok" }},
    { id: "W12", type: "3½-Zi Whg 58", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "ok", korrespondenz: "ok" }},
    { id: "W15", type: "4½-Zi Whg 58a", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "ok", korrespondenz: "ok" }},
    { id: "W18", type: "3½-Zi Whg 58a", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "ok", korrespondenz: "ok" }},
    { id: "G01", type: "Gewerbe EG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "missing", uebergabe: "ok", korrespondenz: "ok" }},
    { id: "G02", type: "Gewerbe EG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "ok", korrespondenz: "ok" }},
    { id: "L01", type: "Lager UG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
    { id: "L02", type: "Lager UG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
    { id: "PP01", type: "Parkplatz", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
    { id: "PP02", type: "Parkplatz", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
    { id: "PP03", type: "Parkplatz", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
  ]}],
  "023": [{ name: "Steinenbachgässlein 49", units: [
    { id: "EG", type: "Gewerbe EG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "ok", korrespondenz: "ok" }},
    { id: "1OG", type: "Büro 1. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "ok", korrespondenz: "ok" }},
    { id: "2OG", type: "Büro 2. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "missing", korrespondenz: "ok" }},
    { id: "3OG", type: "Gewerbefl. 3. OG", docs: { mietvertrag: "ok", depot: "ok", bewerbung: "ok", uebergabe: "ok", korrespondenz: "ok" }},
    { id: "4OG", type: "Büro 4. OG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "ok", uebergabe: "missing", korrespondenz: "ok" }},
    { id: "5OG", type: "Büro 5. OG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
    { id: "6OG", type: "Büro 6. OG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
    { id: "UG", type: "Lager UG", docs: { mietvertrag: "ok", depot: "missing", bewerbung: "missing", uebergabe: "missing", korrespondenz: "missing" }},
  ]}]
};

// ─── COMPONENTS ───

const StatusBadge = ({ status, size = "sm" }) => {
  const cfg = {
    ok: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", label: "OK", Icon: CheckCircle },
    partial: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", label: "PARTIAL", Icon: AlertTriangle },
    missing: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "MISSING", Icon: XCircle },
  }[status] || { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300", label: "N/A", Icon: Info };
  const sz = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${cfg.bg} ${cfg.text} ${cfg.border} ${sz}`}>
      <cfg.Icon size={size === "lg" ? 14 : 12} />
      {cfg.label}
    </span>
  );
};

const ProgressBar = ({ ok, partial, missing, total }) => {
  const pOk = (ok / total) * 100;
  const pPartial = (partial / total) * 100;
  const pMissing = (missing / total) * 100;
  return (
    <div className="w-full">
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
        {pOk > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${pOk}%` }} />}
        {pPartial > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${pPartial}%` }} />}
        {pMissing > 0 && <div className="bg-red-400 transition-all" style={{ width: `${pMissing}%` }} />}
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span className="text-emerald-600">{ok} OK</span>
        <span className="text-amber-600">{partial} Partial</span>
        <span className="text-red-600">{missing} Missing</span>
      </div>
    </div>
  );
};

const TreeNode = ({ label, icon, status, children, level = 0, defaultOpen = false, info, legal }) => {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = Array.isArray(children) ? children.filter(Boolean).length > 0 : (children != null && children !== false);
  const ml = level * 20;
  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-blue-50 transition-colors ${level === 0 ? "font-semibold" : ""}`}
        style={{ marginLeft: ml }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (open ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />) : <span className="w-3.5" />}
        <span className="text-lg flex-shrink-0">{icon}</span>
        <span className="flex-1 text-sm truncate">{label}</span>
        {legal && <span className="text-xs text-gray-400 hidden sm:inline">{legal}</span>}
        {status && <StatusBadge status={status} />}
      </div>
      {info && open && (
        <div className="text-xs text-gray-500 italic ml-16 mb-1 px-2" style={{ marginLeft: ml + 44 }}>{info}</div>
      )}
      {open && hasChildren && children}
    </div>
  );
};

// ─── PAGE COMPONENTS ───

const PageDashboard = ({ selectedProp, lang, t }) => {
  const prop = PROPERTIES[selectedProp];

  const stats = useMemo(() => {
    const s = { ok: 0, partial: 0, missing: 0 };
    MANDANT_CATEGORIES.forEach(c => { s[c.statuses[selectedProp]]++; });
    return { ...s, total: MANDANT_CATEGORIES.length };
  }, [selectedProp]);

  const alerts = MANDANT_CATEGORIES.filter(c => c.statuses[selectedProp] === "missing");
  const warnings = MANDANT_CATEGORIES.filter(c => c.statuses[selectedProp] === "partial");

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">
            {prop.id} — {prop.address}, {prop.city}
          </h2>
          <span className="text-sm text-gray-500">{prop.owner}</span>
        </div>
        <ProgressBar ok={stats.ok} partial={stats.partial} missing={stats.missing} total={stats.total} />
      </div>

      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={16} className="text-red-600" />
            <span className="font-bold text-red-800 text-sm">{alerts.length} {t ? "fehlende Dokumentenkategorien" : "missing document categories"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map(a => (
              <span key={a.id} className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-1 border border-red-200">
                {a.icon} {a.num}. {t ? a.de : a.en}
              </span>
            ))}
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="font-bold text-amber-800 text-sm">{warnings.length} {t ? "unvollständige Kategorien" : "incomplete categories"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {warnings.map(a => (
              <span key={a.id} className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-1 border border-amber-200">
                {a.icon} {a.num}. {t ? a.de : a.en}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {MANDANT_CATEGORIES.map(cat => (
          <div key={cat.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3 hover:shadow-sm transition">
            <span className="text-2xl flex-shrink-0">{cat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-gray-800">{cat.num}. {t ? cat.de : cat.en}</span>
                <span className="text-xs text-gray-400">{cat.legal}</span>
                <span className="text-xs text-gray-400">· {cat.retention}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{t ? cat.desc_de : cat.desc_en}</div>
              {cat.fileCounts && (
                <div className="text-xs mt-1 font-medium" style={{color: cat.fileCounts[selectedProp] === 0 ? "#9C0006" : "#006100"}}>
                  {cat.fileCounts[selectedProp] === 0
                    ? (t ? "0 Dateien gefunden" : "0 files found")
                    : (t ? `${cat.fileCounts[selectedProp]} Dateien` : `${cat.fileCounts[selectedProp]} files`)}
                </div>
              )}
              {cat.gaps && cat.gaps[selectedProp] && (
                <div className={`text-xs mt-1 italic flex items-center gap-1 ${cat.statuses[selectedProp] === "missing" ? "text-red-600" : "text-amber-600"}`}>
                  <AlertTriangle size={10} className="flex-shrink-0" />
                  {cat.gaps[selectedProp]}
                </div>
              )}
            </div>
            <StatusBadge status={cat.statuses[selectedProp]} size="lg" />
          </div>
        ))}
      </div>
    </div>
  );
};

const PageFolderStructure = ({ lang, t }) => {
  return (
    <div className="space-y-6">
      {/* Level Hierarchy Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-3">{t ? "5-Stufen Hierarchie" : "5-Level Hierarchy"}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">Level</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">Layer (DE)</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">Layer (EN)</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">Naming Pattern</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">Description & Example</th>
              </tr>
            </thead>
            <tbody>
              {[
                { lvl: "L0", de: "Mandant", en: "Mandate", pattern: "{NNN} - {Street}, {ZIP City} - {Owner}", desc: "Root folder per property. Contains mandate number, address, and owner.", ex: "020 - Zehntenstr. 58-58a, 4133 Pratteln - Kobella Limited" },
                { lvl: "L1", de: "Mandat-Dokumente", en: "Mandate Docs", pattern: "{NN} {Category Name}", desc: "13 mandatory document categories at mandate level, numbered 01–13.", ex: "02 Bewirtschaftungsvertrag" },
                { lvl: "L2", de: "Gebäude", en: "Building", pattern: "{Street Name Nr.}", desc: "Building sub-folder. Only for multi-building properties — omit for single buildings.", ex: "Kanalgasse 38" },
                { lvl: "L3", de: "Objekt", en: "Unit", pattern: "{UnitNr} {Type} {Floor} {Side}", desc: "Individual rental unit with Immotop2 number, type, floor, and position.", ex: "4031 Büro 3. OG links" },
                { lvl: "L4", de: "Mieter-Dokumente", en: "Tenant Docs", pattern: "{Document Type}", desc: "5 standard sub-folders per rental unit for tenant documents.", ex: "Mietvertrag | Depot | Bewerbung | Übergabe | Korrespondenz" },
              ].map((l, i) => (
                <tr key={l.lvl} className={`border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
                  <td className="py-3 px-3 text-xs font-bold">{l.lvl}</td>
                  <td className="py-3 px-3 text-xs font-semibold">{l.de}</td>
                  <td className="py-3 px-3 text-xs">{l.en}</td>
                  <td className="py-3 px-3 text-xs font-mono text-blue-700">{l.pattern}</td>
                  <td className="py-3 px-3 text-xs text-gray-600">{l.desc}<br/><span className="font-mono text-gray-400 text-xs">{l.ex}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandat Categories */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-3">{t ? "13 Mandat-Kategorien (L1 Unterordner)" : "13 Mandate Categories (L1 Subfolders)"}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">Nr</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">Deutsch</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">English</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">{t ? "Rechtsgrundlage" : "Legal Basis"}</th>
              </tr>
            </thead>
            <tbody>
              {MANDANT_CATEGORIES.map((cat, idx) => (
                <tr key={cat.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="py-2 px-3 text-xs font-bold text-gray-700">{cat.num}</td>
                  <td className="py-2 px-3 text-xs">{cat.icon} {cat.de}</td>
                  <td className="py-2 px-3 text-xs">{cat.en}</td>
                  <td className="py-2 px-3 text-xs text-gray-600">{cat.legal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unit Docs */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-3">{t ? "5 Mieter-Dokumente (L4 Unterordner)" : "5 Tenant Documents (L4 Subfolders)"}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">ID</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">Deutsch</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">English</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">{t ? "Rechtsgrundlage" : "Legal Basis"}</th>
              </tr>
            </thead>
            <tbody>
              {UNIT_DOCS.map((doc, idx) => (
                <tr key={doc.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="py-2 px-3 text-xs font-bold">U{idx + 1}</td>
                  <td className="py-2 px-3 text-xs">{doc.de}</td>
                  <td className="py-2 px-3 text-xs">{doc.en}</td>
                  <td className="py-2 px-3 text-xs text-gray-600">{doc.legal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const actionBadge = (action, name) => {
  const styles = {
    prefix:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
    rename:  "bg-amber-50 text-amber-700 border border-amber-200",
    split:   "bg-orange-50 text-orange-700 border border-orange-200",
    new:     "bg-red-50 text-red-700 border border-red-200",
  };
  const labels = {
    prefix: "→ Add prefix",
    rename: "→ Rename",
    split:  "→ Split",
    new:    "→ Build new",
  };
  return (
    <div>
      <div className="font-mono text-xs text-gray-700 mb-1">{name}</div>
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${styles[action]}`}>{labels[action]}</span>
    </div>
  );
};

const PageCategories = ({ lang, t }) => {
  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap gap-3 text-xs">
        <span className="font-semibold text-blue-800 self-center">{t ? "Migration:" : "Migration:"}</span>
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">→ Add prefix</span>
        <span className="text-gray-500 self-center">{t ? "Ordner existiert, nur Nummer fehlt" : "Folder exists, just needs number"}</span>
        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">→ Rename</span>
        <span className="text-gray-500 self-center">{t ? "Ordner umbenennen" : "Folder needs renaming"}</span>
        <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded font-medium">→ Split</span>
        <span className="text-gray-500 self-center">{t ? "Aus Handwerker-Ordner trennen" : "Split out of mixed Handwerker folder"}</span>
        <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-medium">→ Build new</span>
        <span className="text-gray-500 self-center">{t ? "Neu erstellen / sammeln" : "Create new / collect scattered files"}</span>
      </div>

      {/* 13 Categories */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-3">{t ? "13 Mandat-Kategorien (detailliert)" : "13 Mandate Categories (detailed)"}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">Nr</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">Deutsch</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">English</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Inhalt" : "Contents"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Aktueller Ordner" : "Current Folder (Today)"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Rechtsgrundlage" : "Legal"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Aufbewahrung" : "Retention"}</th>
              </tr>
            </thead>
            <tbody>
              {MANDANT_CATEGORIES.map((cat, idx) => (
                <tr key={cat.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="py-2 px-2 text-xs font-bold">{cat.num}</td>
                  <td className="py-2 px-2 text-xs">{cat.icon} {cat.de}</td>
                  <td className="py-2 px-2 text-xs">{cat.en}</td>
                  <td className="py-2 px-2 text-xs text-gray-600">{t ? cat.desc_de : cat.desc_en}</td>
                  <td className="py-2 px-2 text-xs">{actionBadge(cat.currentFolder.action, cat.currentFolder.name)}</td>
                  <td className="py-2 px-2 text-xs text-gray-600 font-mono">{cat.legal}</td>
                  <td className="py-2 px-2 text-xs text-gray-600">{cat.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unit Docs detailed */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-3">{t ? "5 Mieter-Dokumente pro Einheit (L4)" : "5 Tenant Documents per Unit (L4)"}</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-800">
          <strong>{t ? "Aktueller Stand:" : "Current state:"}</strong> {t ? "Alle Mieter-Dateien liegen lose im Einheiten-Ordner — L4-Unterordner existieren noch nicht." : "All tenant files are loose in the unit folder — L4 sub-folders do not exist yet."}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">ID</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">Deutsch</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">English</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Inhalt" : "Contents"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Rechtsgrundlage" : "Legal"}</th>
              </tr>
            </thead>
            <tbody>
              {UNIT_DOCS.map((doc, idx) => {
                const retData = [
                  { retention: "Term + 10y", starts: "After lease end", note: "Lease must be kept for full term + 10 years" },
                  { retention: "Term + 1y", starts: "After lease end", note: "Security deposit records 1 year after end" },
                  { retention: "2y", starts: "After close", note: "Tenant applications kept per DSG 2023" },
                  { retention: "Term + 3y", starts: "After move-out", note: "Handover protocols for disputes" },
                  { retention: "10y", starts: "Document date", note: "All correspondence for legal compliance" }
                ][idx];
                return (
                  <tr key={doc.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="py-2 px-2 text-xs font-bold">U{idx + 1}</td>
                    <td className="py-2 px-2 text-xs">{doc.de}</td>
                    <td className="py-2 px-2 text-xs">{doc.en}</td>
                    <td className="py-2 px-2 text-xs text-gray-600">{retData.note}</td>
                    <td className="py-2 px-2 text-xs text-gray-600 font-mono">{doc.legal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PageNamingConventions = ({ lang, t }) => {
  return (
    <div className="space-y-6">
      {/* General Rules */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-3">{t ? "Allgemeine Benennungsregeln" : "General Naming Rules"}</h3>
        <div className="space-y-3">
          <div className="flex gap-3 pb-2 border-b border-gray-100">
            <span className="font-bold text-gray-600 min-w-32">{t ? "Sprache" : "Language"}</span>
            <span className="text-gray-600">Deutsch (Primär), English (optional)</span>
          </div>
          <div className="flex gap-3 pb-2 border-b border-gray-100">
            <span className="font-bold text-gray-600 min-w-32">{t ? "Zulässige Zeichen" : "Allowed Characters"}</span>
            <span className="text-gray-600">A-Z, a-z, 0-9, Umlaute (Ä, Ö, Ü, ß), Bindestrich (-), Unterstrich (_), Punkt (.)</span>
          </div>
          <div className="flex gap-3 pb-2 border-b border-gray-100">
            <span className="font-bold text-gray-600 min-w-32">{t ? "Datumsformat" : "Date Format"}</span>
            <span className="text-gray-600 font-mono">ISO 8601 (YYYY-MM-DD)</span>
          </div>
          <div className="flex gap-3 pb-2 border-b border-gray-100">
            <span className="font-bold text-gray-600 min-w-32">{t ? "Versionierung" : "Versioning"}</span>
            <span className="text-gray-600">_v1, _v2 {t ? "für Entwürfe. Finale Version ohne Suffix" : "for drafts. Final version has no suffix"}</span>
          </div>
          <div className="flex gap-3 pb-2 border-b border-gray-100">
            <span className="font-bold text-gray-600 min-w-32">{t ? "Großschreibung" : "Capitalization"}</span>
            <span className="text-gray-600">{t ? "PascalCase für Ordner, lowercase für Dateien" : "PascalCase for folders, lowercase for files"}</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-gray-600 min-w-32">{t ? "Max Pfadlänge" : "Max Path Length"}</span>
            <span className="text-gray-600">260 Zeichen (Windows Limit)</span>
          </div>
        </div>
      </div>

      {/* Folder Renames: Before → After */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-1">{t ? "Ordner-Umbenennung: Vorher → Nachher" : "Folder Renames: Before → After"}</h3>
        <p className="text-xs text-gray-500 mb-3">{t ? "Bestehende Ordnernamen und was sich ändert" : "How existing folder names change under the new standard"}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Heute" : "Today (Before)"}</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600 text-xs"></th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Neu (Standard)" : "New (Standard)"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Aktion" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { before: "Ablage/", after: "01 Ablage/", action: "prefix", note: t ? "Nummer voranstellen" : "Add number prefix" },
                { before: "Bewirtschaftungsvertrag/", after: "02 Bewirtschaftungsvertrag/", action: "prefix", note: t ? "Nummer voranstellen" : "Add number prefix" },
                { before: "Buchhaltung/", after: "03 Buchhaltung/", action: "prefix", note: t ? "Nummer voranstellen" : "Add number prefix" },
                { before: "Versicherungen/", after: "04 Versicherungen/", action: "prefix", note: t ? "Nummer voranstellen" : "Add number prefix" },
                { before: "Handwerker/ ⚠", after: "05 Service-Verträge/  +  11 Renovationen/", action: "split", note: t ? "Aufteilen in zwei Kategorien" : "Split into two categories" },
                { before: "Hauswart/", after: "06 Hauswartung/", action: "rename", note: t ? "Umbenennen + Nummer" : "Rename + add number" },
                { before: "Versicherungsschäden/", after: "07 Versicherungsschäden/", action: "prefix", note: t ? "Nummer voranstellen" : "Add number prefix" },
                { before: "— (verstreut in Ablage)", after: "08 Korrespondenz/", action: "new", note: t ? "Neuer Ordner, Dateien einsammeln" : "New folder, collect scattered files" },
                { before: "Pläne/", after: "09 Pläne/", action: "prefix", note: t ? "Nummer voranstellen" : "Add number prefix" },
                { before: "Fotos/", after: "10 Fotos/", action: "prefix", note: t ? "Nummer voranstellen" : "Add number prefix" },
                { before: "Mieter/", after: "12 Mietverhältnisse/", action: "rename", note: t ? "Umbenennen + Nummer" : "Rename + add number" },
                { before: "SINA/ (1 Datei)", after: "13 Compliance/", action: "new", note: t ? "Umbenennen + neu aufbauen" : "Rename + build out" },
              ].map((row, idx) => {
                const badgeStyle = { prefix: "bg-emerald-50 text-emerald-700 border-emerald-200", rename: "bg-amber-50 text-amber-700 border-amber-200", split: "bg-orange-50 text-orange-700 border-orange-200", new: "bg-red-50 text-red-700 border-red-200" }[row.action];
                return (
                  <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="py-2 px-2 text-xs font-mono text-gray-500">{row.before}</td>
                    <td className="py-2 px-2 text-xs text-center text-gray-400">→</td>
                    <td className="py-2 px-2 text-xs font-mono font-semibold text-gray-800">{row.after}</td>
                    <td className="py-2 px-2 text-xs"><span className={`px-1.5 py-0.5 rounded border font-medium ${badgeStyle}`}>{row.note}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* File Naming Examples */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-3">{t ? "Dateibenennung nach Typ" : "File Naming by Type"}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Dateityp" : "File Type"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Muster" : "Pattern"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Beispiel" : "Example"}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: "Lease", pattern: "{YYYY-MM}_{Type}_{Surname}.pdf", example: "2024-06_Mietvertrag_Müller.pdf" },
                { type: "Invoice", pattern: "{YYYY-MM-DD}_{Company}_{Subject}.pdf", example: "2025-01-15_Schindler_Lift-Wartung.pdf" },
                { type: "Statement", pattern: "{YYYY}_{Type}.pdf", example: "2024_HK-NK-Abrechnung.pdf" },
                { type: "Photo", pattern: "{YYYY-MM-DD}_{Area}_{Description}.jpg", example: "2025-03-15_Treppenhaus_Wasserschaden.jpg" },
                { type: "Plan", pattern: "{Type}_{Description}_{Version}.pdf", example: "Grundriss_EG_v2.pdf" },
                { type: "Protocol", pattern: "{YYYY-MM-DD}_{Type}_{Surname}.pdf", example: "2025-04-01_Übergabe_Meier.pdf" },
                { type: "Insurance Policy", pattern: "{Provider}_{Type}_{Valid-from}.pdf", example: "Basler_Gebäude_2024-01.pdf" },
                { type: "Letter", pattern: "{YYYY-MM-DD}_{To/From}_{Subject}.pdf", example: "2025-02-10_An-Mieter_Mietanpassung.pdf" },
              ].map((item, idx) => (
                <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="py-2 px-2 text-xs font-bold text-gray-700">{item.type}</td>
                  <td className="py-2 px-2 text-xs font-mono text-gray-600">{item.pattern}</td>
                  <td className="py-2 px-2 text-xs font-mono text-emerald-700">{item.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const LEGAL_LINKS = {
  "OR": "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de",
  "OR 253ff": "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#part_2/tit_8",
  "OR 257e": "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_257_e",
  "OR 267a": "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_267_a",
  "OR 394ff": "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#part_2/tit_13",
  "OR 363ff": "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#part_2/tit_11",
  "OR 958f": "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#part_4",
  "MWSTG": "https://www.fedlex.admin.ch/eli/cc/2009/615/de",
  "VVG": "https://www.fedlex.admin.ch/eli/cc/24/719_735_717/de",
  "DSG 2023": "https://www.fedlex.admin.ch/eli/cc/2022/491/de",
  "EnG": "https://www.fedlex.admin.ch/eli/cc/2017/762/de",
  "NIV": "https://www.fedlex.admin.ch/eli/cc/2001/465/de",
  "VKF": "https://www.vkf.ch",
  "SIA": "https://www.sia.ch",
};

const LegalLink = ({ law }) => {
  const url = LEGAL_LINKS[law];
  if (url) {
    return <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline decoration-dotted">{law}</a>;
  }
  return <span>{law}</span>;
};

const PageLegalRetention = ({ lang, t }) => {
  return (
    <div className="space-y-6">
      {/* Swiss Laws */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-3">{t ? "Schweizer Rechtsgrundlagen" : "Swiss Legal Basis"}</h3>
        <p className="text-xs text-gray-500 mb-3">{t
          ? "Klicken Sie auf die Abkürzung, um das Gesetz auf Fedlex zu öffnen."
          : "Click any abbreviation to open the law on Fedlex (official Swiss law portal)."}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">Abkürzung</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">Vollname</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">English Name</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Relevanz" : "Relevance"}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { abbr: "OR", full: "Obligationenrecht", en: "Code of Obligations", relevance: "Tenancy (OR 253ff), agency (OR 394ff), works (OR 363ff), bookkeeping (OR 957ff)" },
                { abbr: "MWSTG", full: "Mehrwertsteuergesetz, Art. 70 Abs. 3", en: "Federal VAT Act", relevance: "20-year retention for real estate-related records" },
                { abbr: "VVG", full: "Versicherungsvertragsgesetz", en: "Federal Insurance Contract Act", relevance: "Retention of policies and claim files, limitation periods" },
                { abbr: "DSG 2023", full: "Datenschutzgesetz (revidiert 1.9.2023)", en: "Federal Data Protection Act", relevance: "Tenant personal data, deletion obligations, right of access" },
                { abbr: "EnG", full: "Energiegesetz", en: "Federal Energy Act", relevance: "GEAK requirement (cantonal energy certificate)" },
                { abbr: "NIV", full: "Niederspannungs-Installationsverordnung", en: "Low Voltage Installation Ordinance", relevance: "Periodic safety certificates (SiNa) for electrical installations" },
                { abbr: "VKF", full: "Vereinigung Kantonaler Feuerversicherungen", en: "Association of Cantonal Fire Insurers", relevance: "Fire protection concept, escape routes, periodic inspections" },
                { abbr: "SIA", full: "Schweizer Ingenieur- und Architektenverein", en: "Swiss Society of Engineers & Architects", relevance: "Construction norms (SIA 118, 180, 380)" },
                { abbr: "kant.", full: "Kantonale Miet- und Bauvorschriften (BL, BS, BE)", en: "Cantonal regulations", relevance: "Security deposit rules, conciliation authority, building police" },
              ].map((law, idx) => (
                <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="py-2 px-2 text-xs font-bold text-gray-700"><LegalLink law={law.abbr} /></td>
                  <td className="py-2 px-2 text-xs">{law.full}</td>
                  <td className="py-2 px-2 text-xs text-gray-600">{law.en}</td>
                  <td className="py-2 px-2 text-xs text-gray-600">{law.relevance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retention Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-3">{t ? "Aufbewahrungsfristen Übersicht" : "Retention Periods Overview"}</h3>
        <p className="text-xs text-gray-500 mb-3">{t
          ? "Aufbewahrungsfristen beginnen i.d.R. am Ende des Geschäftsjahres."
          : "Retention periods generally start at the end of the fiscal year in which the document was created."}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Dokumenttyp" : "Document Type"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Aufbewahrung" : "Retention"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Ab" : "Starts From"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Rechtsgrundlage" : "Legal Basis"}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">{t ? "Hinweis" : "Notes"}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { doc: "Financial records, receipts", ret: "10 years", from: "End of fiscal year", law: "OR 958f", note: "Extended to 20y for real estate (MWSTG)" },
                { doc: "Lease agreements", ret: "Term + 10y", from: "End of tenancy", law: "OR 253ff", note: "Including all amendments" },
                { doc: "Management contract", ret: "Term + 10y", from: "End of mandate", law: "OR 394ff", note: "Agent's accountability obligation" },
                { doc: "Insurance policies", ret: "Term + 10y", from: "End of policy", law: "VVG", note: "Active policies: always accessible" },
                { doc: "Claims files", ret: "10 years", from: "Case closed", law: "VVG", note: "If litigation: until statute of limitations" },
                { doc: "Rejected applications", ret: "Max. 6 months", from: "Rejection date", law: "DSG 2023", note: "Delete immediately if no reason to retain" },
                { doc: "Tenant personal data", ret: "Tenancy + 10y", from: "End of tenancy", law: "DSG 2023", note: "Subject access rights apply" },
                { doc: "Building plans", ret: "Building lifetime", from: "Creation date", law: "SIA", note: "Never destroy while building exists" },
                { doc: "GEAK, SiNa, fire cert.", ret: "Permanent", from: "Issue date", law: "EnG", note: "Renew per cantonal schedule" },
                { doc: "Photos (condition docs)", ret: "Building lifetime", from: "Date taken", law: "—", note: "Evidence in disputes" },
                { doc: "Handover protocols", ret: "Tenancy + 3y", from: "End of tenancy", law: "OR 267a", note: "Burden of proof for condition" },
              ].map((item, idx) => (
                <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="py-2 px-2 text-xs font-bold text-gray-700">{item.doc}</td>
                  <td className="py-2 px-2 text-xs font-bold">{item.ret}</td>
                  <td className="py-2 px-2 text-xs text-gray-600">{item.from}</td>
                  <td className="py-2 px-2 text-xs font-mono"><LegalLink law={item.law} /></td>
                  <td className="py-2 px-2 text-xs text-gray-500 italic">{item.note || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PagePropertyDetail = ({ selectedProp, lang, t }) => {
  const prop = PROPERTIES[selectedProp];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="font-bold text-gray-800 mb-1">{t ? "Liegenschaft" : "Property"}: {prop.id} — {prop.address}</h2>
      <p className="text-xs text-gray-500 mb-3">{t ? "Ordnerstruktur mit Einheiten-Status" : "Folder structure with unit status"}</p>
      <div className="border rounded-lg p-2 bg-gray-50 mb-4">
        <TreeNode label={`${prop.owner}`} icon="👤" level={0} defaultOpen={true}
          info={t ? "L0: Eigentümer" : "L0: Owner"}>
          <TreeNode label={`${prop.id} - ${prop.address}, ${prop.city}`} icon="🏢" level={1} defaultOpen={true}
            info={t ? "L1: Liegenschaft — enthält Mandat-Dokumente + Gebäude" : "L1: Property — contains mandate docs + buildings"}>
            <TreeNode label={t ? "Mandat Dokumente" : "Mandate Documents"} icon="📁" level={2} defaultOpen={false}
              info={t ? "13 Kategorien für liegenschaftsweite Dokumente" : "13 categories for property-wide documents"}>
              {MANDANT_CATEGORIES.map(cat => (
                <TreeNode key={cat.id} label={`${cat.num}. ${t ? cat.de : cat.en}`}
                  icon={cat.icon} status={cat.statuses[selectedProp]} level={3}
                  legal={cat.legal}
                  info={cat.gaps && cat.gaps[selectedProp]
                    ? `${t ? cat.desc_de : cat.desc_en} ⚠ ${cat.gaps[selectedProp]}`
                    : (t ? cat.desc_de : cat.desc_en)}>
                  {null}
                </TreeNode>
              ))}
            </TreeNode>
            {(ALL_BUILDINGS[selectedProp] || []).map((bldg, bi) => (
              <TreeNode key={bi} label={bldg.name} icon="🏗️" level={2}
                defaultOpen={bi === 0}
                info={t ? `L2: Gebäude — ${bldg.units.length} Einheiten` : `L2: Building — ${bldg.units.length} units`}>
                {bldg.units.map((u, ui) => {
                  const uStatus = Object.values(u.docs).every(d => d === "ok") ? "ok"
                    : Object.values(u.docs).every(d => d === "missing") ? "missing" : "partial";
                  return (
                    <TreeNode key={ui} label={`${u.id} ${u.type}`} icon="🚪" status={uStatus} level={3}
                      info={t ? "L3: Objekt / Mietobjekt" : "L3: Rental Unit"}>
                      {UNIT_DOCS.map(doc => (
                        <TreeNode key={doc.id} label={t ? doc.de : doc.en} icon="📄" status={u.docs[doc.id] || "missing"} level={4}
                          legal={doc.legal}>
                          {null}
                        </TreeNode>
                      ))}
                    </TreeNode>
                  );
                })}
              </TreeNode>
            ))}
          </TreeNode>
        </TreeNode>
      </div>
    </div>
  );
};

const PageMigration = ({ lang, t }) => {
  const phases = [
    {
      num: 1,
      de: "Vorbereitung",
      en: "Preparation",
      items: [
        { de: "Backup aktueller Ordnerstruktur erstellen", en: "Create backup of current folder structure" },
        { de: "Target-Struktur mit allen 13 Kategorien anlegen", en: "Set up target structure with all 13 categories" },
        { de: "Benennungskonventionen im Team kommunizieren", en: "Communicate naming conventions to team" },
        { de: "Rollen & Zugriffe definieren (Admin, Verwalter, Leser)", en: "Define roles & access levels" }
      ]
    },
    {
      num: 2,
      de: "Datenmigration",
      en: "File Migration",
      items: [
        { de: "Alte Dateien nach Kategorien organisieren", en: "Organize old files by categories" },
        { de: "Handwerker-Ordner aufteilen (Service/Renovationen/Schäden)", en: "Split Handwerker folder into 3 categories" },
        { de: "Korrespondenz sammeln & zuordnen", en: "Collect & assign correspondence" },
        { de: "Duplikate & veraltete Dateien löschen", en: "Remove duplicates & outdated files" }
      ]
    },
    {
      num: 3,
      de: "Compliance Aufbau",
      en: "Compliance Build",
      items: [
        { de: "Grundbuchauszug 12 Ordner bereitstellen", en: "Provide land registry extract for 12 folder" },
        { de: "GEAK-Zertifikat hochladen (13 Ordner)", en: "Upload GEAK certificate to folder 13" },
        { de: "SiNa/NIV-Erklärung (Elektro) sammeln", en: "Collect electrical safety documentation" },
        { de: "Brandschutzkonzept erstellen/sammeln", en: "Create/collect fire safety plan" }
      ]
    },
    {
      num: 4,
      de: "QA & Freigabe",
      en: "QA & Sign-Off",
      items: [
        { de: "Spot-Check: 10% der Mietverträge überprüfen", en: "Spot-check 10% of lease agreements" },
        { de: "Alle Dateinamen auf Konventionen prüfen", en: "Verify file naming conventions" },
        { de: "Fehlende Dokumente dokumentieren & priorisieren", en: "Document & prioritize missing docs" },
        { de: "Signoff durch Eigentümer/Verwalter", en: "Sign-off from owner/manager" }
      ]
    }
  ];

  return (
    <div className="space-y-4">
      {phases.map((phase, pidx) => (
        <div key={phase.num} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{phase.num}</div>
            <div>
              <h3 className="font-bold text-gray-800">{t ? phase.de : phase.en}</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 ml-11">
            {phase.items.map((item, idx) => (
              <label key={idx} className="flex items-start gap-2 cursor-pointer text-sm">
                <input type="checkbox" className="mt-0.5 rounded" />
                <span className="text-gray-700">{t ? item.de : item.en}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Property status */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
        <h3 className="font-bold text-blue-900 mb-3">{t ? "Migrationen pro Liegenschaft" : "Migration Status per Property"}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.values(PROPERTIES).map(prop => (
            <div key={prop.id} className="bg-white rounded-lg border border-blue-200 p-3">
              <div className="font-bold text-gray-800">{prop.id}</div>
              <div className="text-xs text-gray-600 mb-2">{prop.address}</div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Phase 1</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="rounded" />
                  <span>Phase 2</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="rounded" />
                  <span>Phase 3</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="rounded" />
                  <span>Phase 4</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PageUnits = ({ selectedProp, lang, t }) => {
  const prop = PROPERTIES[selectedProp];
  const buildings = ALL_BUILDINGS[selectedProp] || [];

  const totalUnits = buildings.reduce((sum, b) => sum + b.units.length, 0);
  const allUnits = buildings.flatMap(b => b.units);
  const completeUnits = allUnits.filter(u => Object.values(u.docs).every(d => d === "ok")).length;
  const missingUnits = allUnits.filter(u => Object.values(u.docs).every(d => d === "missing")).length;
  const partialUnits = totalUnits - completeUnits - missingUnits;

  const [expandedBuilding, setExpandedBuilding] = useState(0);

  return (
    <div>
      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-gray-800">
            {t ? "Einheiten-Dokumentation" : "Unit Documentation"} — {prop.id} {prop.address}
          </h2>
          <span className="text-sm text-gray-500">{totalUnits} {t ? "Einheiten" : "units"} · {buildings.length} {t ? "Gebäude" : "buildings"}</span>
        </div>
        <ProgressBar ok={completeUnits} partial={partialUnits} missing={missingUnits} total={totalUnits} />
      </div>

      {/* Building tabs */}
      {buildings.length > 1 && (
        <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border border-gray-200 overflow-x-auto">
          {buildings.map((bldg, bi) => (
            <button
              key={bi}
              onClick={() => setExpandedBuilding(bi)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${expandedBuilding === bi ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              🏗️ {bldg.name}
              <span className={`text-xs ml-1 ${expandedBuilding === bi ? "text-blue-200" : "text-gray-400"}`}>({bldg.units.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Unit table for selected building */}
      {buildings.map((bldg, bi) => {
        if (buildings.length > 1 && bi !== expandedBuilding) return null;
        return (
          <div key={bi} className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
              <span className="text-lg">🏗️</span>
              <span className="font-bold text-gray-700">{bldg.name}</span>
              <span className="text-xs text-gray-400">({bldg.units.length} {t ? "Einheiten" : "units"})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">{t ? "Einheit" : "Unit"}</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">{t ? "Typ" : "Type"}</th>
                    {UNIT_DOCS.map(d => (
                      <th key={d.id} className="text-center py-2 px-2 font-semibold text-gray-600 text-xs">{t ? d.de : d.en}</th>
                    ))}
                    <th className="text-center py-2 px-2 font-semibold text-gray-600 text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bldg.units.map((u, ui) => {
                    const vals = Object.values(u.docs);
                    const overall = vals.every(d => d === "ok") ? "ok" : vals.every(d => d === "missing") ? "missing" : "partial";
                    return (
                      <tr key={ui} className={`border-t border-gray-100 ${overall === "missing" ? "bg-red-50" : ""}`}>
                        <td className="py-2 px-3 font-mono font-bold text-xs">{u.id}</td>
                        <td className="py-2 px-3 text-xs text-gray-600">{u.type}</td>
                        {UNIT_DOCS.map(d => (
                          <td key={d.id} className="text-center py-2 px-2">
                            <StatusBadge status={u.docs[d.id] || "missing"} />
                          </td>
                        ))}
                        <td className="text-center py-2 px-2"><StatusBadge status={overall} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── MAIN APP ───
export default function DinvestPortalMockup() {
  const [selectedProp, setSelectedProp] = useState("020");
  const [propertyTab, setPropertyTab] = useState("dashboard");
  const [docPage, setDocPage] = useState(null);
  const [lang, setLang] = useState("de");

  const t = lang === "de";

  const docPages = [
    { id: "folder-structure", icon: "📁", de: "Ordnerstruktur", en: "Folder Structure" },
    { id: "categories", icon: "📋", de: "Kategorien", en: "Categories" },
    { id: "naming", icon: "🔤", de: "Benennung", en: "Naming" },
    { id: "legal", icon: "⚖️", de: "Recht & Aufbewahrung", en: "Legal & Retention" },
    { id: "migration", icon: "🚀", de: "Migration", en: "Migration" },
  ];

  const propertyTabs = [
    { id: "dashboard", icon: "📊", de: "Dashboard", en: "Dashboard" },
    { id: "property", icon: "🏢", de: "Ordnerstruktur", en: "Folder Tree" },
    { id: "units", icon: "🚪", de: "Einheiten", en: "Units" },
  ];

  const isDocMode = docPage !== null;
  const activeDocPage = docPages.find(d => d.id === docPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        {/* Top row: Logo + Lang toggle */}
        <div className="px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Building2 size={20} className="text-blue-900" />
              </div>
              <div>
                <div className="font-bold text-lg leading-tight">inhouse.dinvest.ag</div>
                <div className="text-blue-200 text-xs">{t ? "Dokumentenverwaltung" : "Document Management"} — {t ? "Scan" : "Scan"}: {SCAN_DATE}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/boazbinnun/dinvest-folders-design/blob/main/SPEC.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-blue-800 border border-blue-600 rounded px-3 py-1.5 hover:bg-blue-600 transition flex items-center gap-1.5"
              >
                📄 {t ? "Spezifikation" : "Spec"}
              </a>
              <button onClick={() => setLang(lang === "de" ? "en" : "de")}
                className="text-xs bg-blue-800 border border-blue-600 rounded px-3 py-1.5 hover:bg-blue-600 transition">
                {t ? "🇬🇧 EN" : "🇩🇪 DE"}
              </button>
            </div>
          </div>
        </div>
        {/* Second row: Doc menu links */}
        <div className="bg-blue-950/40 border-t border-blue-600/30 px-4 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setDocPage(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition whitespace-nowrap ${!isDocMode ? "bg-white/20 text-white" : "text-blue-200 hover:text-white hover:bg-white/10"}`}
            >
              <span>🏠</span>
              {t ? "Liegenschaften" : "Properties"}
            </button>
            <span className="text-blue-400/40 px-1">|</span>
            {docPages.map(dp => (
              <button
                key={dp.id}
                onClick={() => setDocPage(dp.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition whitespace-nowrap ${docPage === dp.id ? "bg-white/20 text-white" : "text-blue-200 hover:text-white hover:bg-white/10"}`}
              >
                <span>{dp.icon}</span>
                {t ? dp.de : dp.en}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">

        {/* ═══ DOCUMENTATION MODE ═══ */}
        {isDocMode && (
          <div>
            {/* Doc page breadcrumb */}
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setDocPage(null)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                ← {t ? "Zurück zu Liegenschaften" : "Back to Properties"}
              </button>
              <span className="text-gray-300">·</span>
              <span className="text-sm font-semibold text-gray-700">{activeDocPage?.icon} {t ? activeDocPage?.de : activeDocPage?.en}</span>
            </div>

            {docPage === "folder-structure" && <PageFolderStructure lang={lang} t={t} />}
            {docPage === "categories" && <PageCategories lang={lang} t={t} />}
            {docPage === "naming" && <PageNamingConventions lang={lang} t={t} />}
            {docPage === "legal" && <PageLegalRetention lang={lang} t={t} />}
            {docPage === "migration" && <PageMigration lang={lang} t={t} />}
          </div>
        )}

        {/* ═══ PROPERTY EXPLORER MODE ═══ */}
        {!isDocMode && (
          <div>
            {/* Property selector cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {Object.values(PROPERTIES).map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProp(p.id)}
                  className={`rounded-xl p-3 border-2 transition-all text-left ${selectedProp === p.id ? "border-blue-500 bg-white shadow-lg scale-[1.02]" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="font-bold text-sm">{p.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${p.type === "COM" ? "bg-orange-100 text-orange-700" : p.type === "MIX" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{p.type}</span>
                  </div>
                  <div className="text-xs text-gray-600 truncate">{p.address}</div>
                  <div className="text-xs text-gray-400">{p.city} · {p.ownerTag}</div>
                </button>
              ))}
            </div>

            {/* Property sub-tabs */}
            <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border border-gray-200">
              {propertyTabs.map(pt => (
                <button
                  key={pt.id}
                  onClick={() => setPropertyTab(pt.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${propertyTab === pt.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  <span>{pt.icon}</span>
                  {t ? pt.de : pt.en}
                </button>
              ))}
            </div>

            {/* Property pages */}
            {propertyTab === "dashboard" && <PageDashboard selectedProp={selectedProp} lang={lang} t={t} />}
            {propertyTab === "property" && <PagePropertyDetail selectedProp={selectedProp} lang={lang} t={t} />}
            {propertyTab === "units" && <PageUnits selectedProp={selectedProp} lang={lang} t={t} />}
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-6 text-center text-xs text-gray-400 pb-4">
          Dinvest AG · inhouse.dinvest.ag · {t ? "Interaktiver Mockup" : "Interactive Mockup"} · {SCAN_DATE}
        </div>
      </div>
    </div>
  );
}