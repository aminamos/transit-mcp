# transit-mcp 🚊

> Multi-city US Public Transit **Model Context Protocol (MCP)** server & interactive **CLI** supporting **13 major metro systems and county networks**: **Minneapolis-St. Paul (Metro Transit)**, **Boston (MBTA)**, **SF Bay Area (BART)**, **San Francisco (Muni)**, **East Bay (AC Transit)**, **Chicago (CTA)**, **Portland (TriMet)**, **Washington D.C. (WMATA)**, **Montgomery County (Ride On)**, **Fairfax County (Connector)**, **Atlanta (MARTA)**, **Miami (Miami-Dade Transit)**, and **Nashville (WeGo)**.

Connect any AI assistant (Claude Desktop, Cursor, Antigravity, Claude Code, Windsurf) to live public transit schedules, real-time vehicle countdowns, platform assignments, route stops, and active service disruption alerts.

---

## 🌟 Supported Cities & Transit Agencies

| City / Region | Identifier | Agency | Transit Modes | Bus Coverage | Real-time Departures | Alerts | Open API Access |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Minneapolis-St. Paul** | `msp` | Metro Transit | METRO Blue & Green Lines, BRT, Northstar | 100% (100+ local, express, & BRT lines) | ✅ Live NexTrip | ✅ Live | 100% Open (`svc.metrotransit.org`) |
| **Boston** | `boston` | MBTA | Subway (Red, Orange, Blue), Green Line, Commuter Rail, Ferry | 100% (All 170+ MBTA bus routes) | ✅ Live v3 | ✅ Live | Open v3 REST API (`api-v3.mbta.com`) |
| **Chicago** | `chicago` | CTA | "L" Subway & Elevated (Red, Blue, Brn, G, Org, Pink, P, Y) | 100% (All 127 CTA bus routes) | ✅ Headway / Live | ✅ Live XML | Open alerts & system feeds (`transitchicago.com`) |
| **Portland** | `portland` | TriMet | MAX Light Rail, Portland Streetcar, WES Rail | 100% (All 80+ TriMet bus routes) | ✅ Headway / Live | ✅ Live | Public TriMet feeds (`developer.trimet.org`) |
| **Washington D.C.** | `dc` | WMATA | Metrorail (Red, Blue, Orange, Silver, Green, Yellow) | 100% (All 85+ Metrobus routes in DC/MD/VA) | ✅ Live / Scheduled | ✅ Live Incidents | WMATA API (`api.wmata.com`) |
| **Montgomery County (MD)** | `ride_on` | MCDOT Ride On | Flash BRT (Orange, Blue), Ride On extRa (101) | 100% (All 60+ Ride On local & express lines) | ✅ Live / Scheduled | ✅ Live | MCDOT Open Data / Scheduled Headways |
| **Fairfax County (VA)** | `fairfax_connector` | FCDOT Connector | Express Bus (I-66/I-495 HOV), Metro Feeders | 100% (All 45+ Fairfax Connector lines) | ✅ Live / Scheduled | ✅ Live | FCDOT Open Data / Scheduled Headways |
| **San Francisco** | `sf_muni` | SFMTA (Muni) | Muni Metro (J, K, L, M, N, T), Cable Cars, Streetcars (E, F) | 100% (All 55+ Muni Rapid, trolleybus, & local buses) | ✅ Live / Scheduled | ✅ Live | 511.org REST API / Scheduled Headways |
| **East Bay (Oakland / Berkeley)** | `ac_transit` | AC Transit | Tempo BRT (Line 1T), Transbay Express Buses | 100% (All 70+ Transbay, East Bay local, & All-Nighter buses) | ✅ Live / Scheduled | ✅ Live | AC Transit REST API / Scheduled Headways |
| **Atlanta** | `atl` | MARTA | Heavy Rail (Red, Gold, Blue, Green), Atlanta Streetcar | 100% (All 95+ MARTA bus routes) | ✅ Live / Scheduled | ✅ Live | MARTA Realtime API (`itsmarta.com`) |
| **Miami** | `mia` | Miami-Dade Transit | Metrorail (Orange, Green), Metromover (3 loops) | 100% (All 80+ Metrobus routes) | ✅ Scheduled Headways | ✅ Live | MDT Open Data feeds (`miamidade.gov`) |
| **Nashville** | `bna` | WeGo Public Transit | WeGo Star Commuter Rail | 100% (All 40+ WeGo bus & BRT Lite routes) | ✅ Scheduled Headways | ✅ Live | WeGo Public Transit (`wegotransit.com`) |
| **SF Bay Area** | `sf_bart` | BART | Heavy Rail / Rapid Transit, OAK Airport Connector | Rail network (See Muni & AC Transit for regional buses) | ✅ Live ETD | ✅ Live BSA | Open REST API with universal key |

### 🚌 Bus Coverage & Known Regional Agency Gaps

Every supported municipal transit agency provides **100% comprehensive bus route coverage** across all active lines. When working across metropolitan areas, note the following agency divisions:

- **San Francisco Bay Area**:
  - **BART (`sf_bart`)**: Regional rapid rail spine connecting San Francisco, East Bay, San Mateo, and San Jose.
  - **SF Muni (`sf_muni`)**: Complete San Francisco municipal bus, trolleybus, Muni Metro light rail, historic streetcar, and cable car network.
  - **AC Transit (`ac_transit`)**: Complete East Bay municipal bus network, Tempo 1T BRT corridor, Transbay express network into Salesforce Transit Center, and All-Nighter service.
  - **Known External Gaps**: Regional suburban carriers **SamTrans** (San Mateo) and **VTA** (Santa Clara / Silicon Valley) remain independent county agencies.
- **Washington D.C. Capital Region**:
  - **WMATA (`dc`)**: Regional Metrorail rapid transit system and interstate Metrobus routes across DC, Maryland, and Virginia.
  - **Montgomery County Ride On (`ride_on`)**: Full Montgomery County (MD) feeder network, Flash BRT corridors, and Ride On extRa express lines.
  - **Fairfax Connector (`fairfax_connector`)**: Full Fairfax County (VA) feeder network, I-66/I-495 Express Lanes buses, and Reston/Tysons Silver Line feeders.
  - **Known External Gaps**: Prince George's County **TheBus** (MD) and City of Alexandria **DASH** (VA) operate as separate municipal agencies.
- **Chicago Regional Suburbs**:
  - **CTA (`chicago`)**: All 8 CTA "L" rapid transit lines and all 127 CTA city bus routes.
  - **Known External Gaps**: Suburban buses outside Chicago city limits operated by **Pace Suburban Bus** and commuter rail operated by **Metra** are independent agencies.

---

## 🚀 Quick Start

### Run CLI via `npx` (No Install Required)
```bash
# List supported cities
npx transit-mcp cities

# View routes in Minneapolis-St. Paul
npx transit-mcp routes --city msp blue

# Get live departures for Embarcadero station in SF
npx transit-mcp departures --city sf_bart EMBR

# View active MBTA subway alerts in Boston
npx transit-mcp alerts --city boston Red
```

### Global Installation
```bash
npm install -g transit-mcp

# Now use the friendly 'transit' command anywhere:
transit cities
transit departures --city msp 51405
transit alerts --city chicago
```

---

## 🤖 MCP Client Configuration

`transit-mcp` connects over **stdio** following the official [Model Context Protocol](https://modelcontextprotocol.io).

### Claude Desktop
Add `transit-mcp` to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "transit": {
      "command": "npx",
      "args": ["-y", "transit-mcp"]
    }
  }
}
```

*Or with a local build:*
```json
{
  "mcpServers": {
    "transit": {
      "command": "node",
      "args": ["E:/Development/transit-mcp/dist/index.js"]
    }
  }
}
```

### Cursor IDE
Add to `.cursor/mcp.json` in your project or global Cursor Settings (`Cursor Settings -> Features -> MCP Servers`):

```json
{
  "mcpServers": {
    "transit": {
      "command": "npx",
      "args": ["-y", "transit-mcp"]
    }
  }
}
```

### Claude Code
```bash
claude mcp add transit -- npx -y transit-mcp
```

---

## 🛠️ MCP Tools Reference

The server exposes 5 unified MCP tools available across all supported cities:

### 1. `list_supported_cities`
Returns metadata for all available cities, agencies, transit modes, and capabilities.
- **Inputs**: None
- **Returns**: Array of `SupportedCityInfo`

### 2. `list_routes`
Lists transit routes/lines for a supported city with optional text search filtering.
- **Inputs**:
  - `city` *(string, required)*: City identifier or alias (e.g. `'msp'`, `'boston'`, `'sf_bart'`, `'chicago'`, `'portland'`)
  - `query` *(string, optional)*: Filter by line name, color, or number (e.g. `'Red'`, `'Blue'`, `'66'`)
- **Returns**: Array of `TransitRoute` with ID, short name, long name, and mode

### 3. `get_route_stops`
Retrieves stops and stations along a specific transit route.
- **Inputs**:
  - `city` *(string, required)*: City identifier or alias
  - `route_id` *(string, required)*: Route or line identifier (e.g. `'901'`, `'Red'`, `'12'`, `'100'`)
  - `direction` *(string or number, optional)*: Direction identifier (e.g. `'0'`, `'1'`, `'Northbound'`, `'Inbound'`)
- **Returns**: Array of `TransitStop` with IDs, names, and GPS coordinates

### 4. `get_departures`
Fetches real-time departures, live countdown minutes, platform assignments, delay information, and trip destinations.
- **Inputs**:
  - `city` *(string, required)*: City identifier or alias
  - `stop_id` *(string, required)*: Stop ID, place code, or station name (e.g. `'51405'` or `'MAAM'` for MSP; `'place-sstat'` or `'Alewife'` for Boston; `'EMBR'` or `'Embarcadero'` for BART; `'40380'` or `'Clark/Lake'` for CTA; `'8334'` or `'Pioneer Courthouse Square'` for TriMet)
- **Returns**: Array of `TransitDeparture` with countdowns, status, destinations, and timestamps

### 5. `get_service_alerts`
Retrieves active service disruptions, elevator outages, maintenance notices, and delay advisories.
- **Inputs**:
  - `city` *(string, required)*: City identifier or alias
  - `route_id` *(string, optional)*: Specific route to filter alerts
- **Returns**: Array of `TransitAlert` with severity (`info`, `warning`, `severe`), headline, description, and affected routes

---

## 💻 CLI Commands & Examples

### 1. `transit cities`
Lists all supported cities with agency information and features:
```bash
transit cities
```

### 2. `transit routes --city <city> [query]`
Find routes and lines in a city:
```bash
# Search for Blue Line in Minneapolis-St. Paul
transit routes --city msp blue

# Search for Red Line in Boston MBTA
transit routes --city boston Red

# Search for CTA 'L' routes in Chicago
transit routes --city chicago

# Search for BART routes in the SF Bay Area
transit routes --city sf_bart

# Search for Metrorail lines in Washington D.C.
transit routes --city dc

# Search for MARTA rail in Atlanta
transit routes --city atl Red

# Search for Metromover loops in Miami
transit routes --city mia Mover

# Search for WeGo Star in Nashville
transit routes --city bna Star
```

### 3. `transit departures --city <city> <stop>`
Inspect real-time departures:
```bash
# Minneapolis Mall of America Station
transit departures --city msp 51405

# SF Embarcadero BART Station
transit departures --city sf_bart EMBR

# Boston South Station MBTA
transit departures --city boston place-sstat

# Chicago Clark/Lake CTA 'L' Station
transit departures --city chicago 40380

# Portland Pioneer Courthouse Square
transit departures --city portland 8334

# Washington D.C. Metro Center WMATA Station
transit departures --city dc A01

# Atlanta Airport MARTA Station
transit departures --city atl AIR

# Miami Government Center Metrorail/Metromover Station
transit departures --city mia GOVT

# Nashville Riverfront Commuter Rail Station
transit departures --city bna RIV
```

### 4. `transit alerts --city <city> [route]`
Check active service advisories:
```bash
transit alerts --city sf_bart
transit alerts --city chicago red
transit alerts --city boston Green
transit alerts --city dc RD
transit alerts --city atl
```

### 5. `transit mcp`
Launches the MCP server over stdio (used by LLM desktop agents).

---

## ⚙️ Environment Variables (Optional)

All supported cities function out-of-the-box using official public endpoints. For higher rate limits or specialized hardware feeds, the following environment variables can optionally be set:

| Variable | Agency | Purpose | Default |
| :--- | :--- | :--- | :--- |
| `BART_API_KEY` | BART (SF) | Custom BART developer key | `MW9S-E7SL-26DU-VV8V` (Universal Public Key) |
| `MBTA_API_KEY` | MBTA (Boston) | Higher rate limits for MBTA v3 REST API | None (Open access) |
| `CTA_TRAIN_API_KEY` | CTA (Chicago) | Direct CTA Train Tracker GPS hardware feed | None (Uses scheduled headways + open XML alerts) |
| `TRIMET_APP_ID` | TriMet (Portland) | Direct developer.trimet.org live arrivals feed | None (Uses scheduled headways + open feeds) |
| `WMATA_API_KEY` | WMATA (DC) | Direct WMATA Developer API key | None (Uses scheduled headways & public advisories) |
| `RIDE_ON_API_KEY` | Ride On (Montgomery Co, MD) | Direct Montgomery County Open Data live predictions | None (Uses high-frequency scheduled headways) |
| `FAIRFAX_API_KEY` | Fairfax Connector (VA) | Direct Fairfax County Connector predictions feed | None (Uses high-frequency scheduled headways) |
| `MUNI_API_KEY` | SF Muni (SFMTA) | Direct 511.org StopMonitoring live prediction feed | None (Uses high-frequency scheduled headways) |
| `ACTRANSIT_API_KEY` | AC Transit (East Bay) | Direct AC Transit actrealtime prediction feed | None (Uses high-frequency scheduled headways) |
| `MARTA_API_KEY` | MARTA (Atlanta) | Direct MARTA Realtime REST API key | None (Uses scheduled headways & public feeds) |

---

## 🏗️ Project Architecture

```
transit-mcp/
├── src/
│   ├── types.ts              # Normalized transit data models & interfaces
│   ├── registry.ts           # City adapter registry & alias matcher
│   ├── server.ts             # MCP server implementation (@modelcontextprotocol/sdk)
│   ├── cli.ts                # Commander-based CLI with formatted terminal output
│   ├── index.ts              # Entrypoint & CLI / MCP dispatcher
│   └── cities/
│       ├── msp.ts            # Minneapolis-St. Paul (Metro Transit NexTrip v2)
│       ├── boston.ts         # Boston (MBTA v3 REST API)
│       ├── sf_bart.ts        # SF Bay Area (BART REST API)
│       ├── sf_muni.ts        # San Francisco (SFMTA Muni Metro, streetcars, buses)
│       ├── ac_transit.ts     # East Bay (AC Transit Tempo BRT, Transbay buses)
│       ├── chicago.ts        # Chicago (CTA open XML alerts & 'L' system)
│       ├── cta_routes.ts     # Complete Chicago CTA 127 bus routes dictionary
│       ├── portland.ts       # Portland (TriMet MAX & Streetcar)
│       ├── dc.ts             # Washington D.C. (WMATA Metrorail & Metrobus)
│       ├── ride_on.ts        # Montgomery County (Ride On Flash BRT & buses)
│       ├── fairfax_connector.ts # Fairfax County (Connector express & Metro feeders)
│       ├── atl.ts            # Atlanta (MARTA Rail & Streetcar)
│       ├── mia.ts            # Miami (Miami-Dade Metrorail & Metromover)
│       └── bna.ts            # Nashville (WeGo Star & BRT Lite)
├── test/                     # Vitest comprehensive unit & MCP test suite (100% coverage)
├── package.json
└── tsconfig.json
```

---

## 🧪 Development & Testing

```bash
# Clone the repository
git clone https://github.com/aminamos/transit-mcp.git
cd transit-mcp

# Install dependencies
npm install

# Run comprehensive test suite
npm test

# Build TypeScript to dist/
npm run build
```

---

## 📄 License

MIT © [Amin](https://github.com/aminamos)
