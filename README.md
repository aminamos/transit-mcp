# transit-mcp 🚊

> Multi-city US Public Transit **Model Context Protocol (MCP)** server & interactive **CLI** supporting **Minneapolis-St. Paul (Metro Transit)**, **Boston (MBTA)**, **SF Bay Area (BART)**, **Chicago (CTA)**, and **Portland (TriMet)**.

Connect any AI assistant (Claude Desktop, Cursor, Antigravity, Claude Code, Windsurf) to live public transit schedules, real-time vehicle countdowns, platform assignments, route stops, and active service disruption alerts.

---

## 🌟 Supported Cities & Transit Agencies

| City / Region | Identifier | Agency | Transit Modes | Real-time Departures | Alerts | Open API Access |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Minneapolis-St. Paul** | `msp` | Metro Transit | METRO Blue & Green Lines, BRT, Bus, Northstar | ✅ Live NexTrip | ✅ Live | 100% Open (`svc.metrotransit.org`) |
| **Boston** | `boston` | MBTA | Subway (Red, Orange, Blue), Green Line, Commuter Rail, Bus, Ferry | ✅ Live v3 | ✅ Live | Open v3 REST API (`api-v3.mbta.com`) |
| **SF Bay Area** | `sf_bart` | BART | Heavy Rail / Rapid Transit, OAK Airport Automated Connector | ✅ Live ETD | ✅ Live BSA | Open REST API with universal key |
| **Chicago** | `chicago` | CTA | "L" Subway & Elevated (Red, Blue, Brown, Green, Orange, Purple, Pink, Yellow), Bus | ✅ Headway / Live | ✅ Live XML | Open alerts & system feeds (`transitchicago.com`) |
| **Portland** | `portland` | TriMet | MAX Light Rail (Blue, Green, Red, Yellow, Orange), Streetcar, WES, Bus | ✅ Headway / Live | ✅ Live | Public TriMet feeds (`developer.trimet.org`) |

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
```

### 4. `transit alerts --city <city> [route]`
Check active service advisories:
```bash
transit alerts --city sf_bart
transit alerts --city chicago red
transit alerts --city boston Green
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
│       ├── chicago.ts        # Chicago (CTA open XML alerts & 'L' system)
│       └── portland.ts       # Portland (TriMet MAX & Streetcar)
├── test/                     # Vitest comprehensive unit & MCP test suite
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
