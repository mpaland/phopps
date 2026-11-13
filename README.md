# phopps — PHOne aPPS

phopps is a small server that delivers **XML services to Cisco and Snom IP phones**. When the phone's
*Directories*, *Messages*, *Services*, *Information*, *Help* button or idle screen fetches a URL,
phopps answers with Cisco/Snom XML objects (menus, text, images, directories, …).

Included applets:

| Applet             | What it shows                                                                    |
|--------------------|----------------------------------------------------------------------------------|
| `menu`             | A menu of further applets or URLs (nested menus are possible)                    |
| `launcher-cisco`   | Same as `menu`, intended for the Cisco *Help* / app launcher                     |
| `text`             | A fixed text or the text content of a web page                                   |
| `image`            | An image from a URL, converted to the display size and colour depth              |
| `weather`          | Satellite weather map (clouds, rain radar, temperatures) for a GPS position      |
| `phonebook`        | A directory from LDAP or a Cisco/Snom directory XML file                         |
| `voicemail`        | Visual voicemail for Asterisk: browse, listen to and delete messages             |
| `background-cisco` | Sets the background image of a Cisco phone (usually as cron job)                 |
| `background-snom`  | Shows a converted background image full screen on Snom phones                    |


## Requirements

- **Node.js 22.12 or newer**
- `sharp` is installed with prebuilt binaries by `npm install` (Windows, Linux, macOS). On Linux the
  weather labels need a sans-serif font (e.g. `apt install fonts-dejavu-core`).
- For `voicemail`: phopps must run on the Asterisk host (or have the voicemail and outgoing spool
  directories mounted with write access).


## Installation and start

```bash
npm install
npm run build
npm start
```

phopps listens on the port from `config/config.json` (default `1080`) on all interfaces and logs
every request as JSON. phopps reads its configuration from `./config` and serves static files from
`./public`, so start it in the project directory.

| Command             | Purpose                                         |
|---------------------|-------------------------------------------------|
| `npm run dev`       | Development mode, restarts on source changes    |
| `npm test`          | Run the test suite (vitest)                     |
| `npm run lint`      | ESLint                                          |
| `npm run typecheck` | TypeScript check of sources and tests           |
| `npm run build`     | Compile to `dist/`                              |

Stop the server with Ctrl+C (SIGINT/SIGTERM shut it down cleanly).


## Configuration

All configuration files are in `config/` and are JSON **with comments** allowed (`//` and `/* */`).
Template files are re-read automatically when they change; `config.json` is read at start.

### config/config.json — server and phones

```jsonc
{
  // IP/hostname of this server, optional, used for cron/push URLs (default: first own IPv4 address)
  "host": "192.168.2.125",

  // listen port
  "port": 1080,

  "device": [
    {
      "name"    : "SEP002699F01CFA",   // device name, Cisco: 'SEP' + MAC address
      "ip"      : "192.168.2.161",     // needed for push (cron jobs)
      "model"   : "7975",              // phone model, see 'Supported models'
      "username": "Marco",             // credentials for /authenticate and push
      "password": "1234",
      "template": "phone_marco"        // template file config/phone_marco.json
    },
    {
      "name"    : "default",           // used when a request has no device name
      "model"   : "SPA525",
      "template": "phone_marco"
    }
  ]
}
```

### Templates — what a phone shows

A template defines one applet per phone service. Every applet entry has the same shape:

```jsonc
{
  "applet": "menu",          // applet name, see the applet table
  "name"  : "My entry",      // name shown in menus (optional)
  "opt"   : { ... }          // applet options
}
```

Top level keys of a template:

| Key           | Route                          | Typical phone button          |
|---------------|--------------------------------|-------------------------------|
| `directory`   | `/directory?name=<device>`     | Directories (use `menu`)      |
| `messages`    | `/messages?name=<device>`      | Messages                      |
| `services`    | `/services?name=<device>`      | Services                      |
| `information` | `/information?name=<device>`   | Information / *i* button      |
| `help`        | `/help?name=<device>`          | Help / app launcher           |
| `idle`        | `/idle?name=<device>`          | Idle screen                   |
| `cron`        | —                              | Timed jobs pushed to the phone |

Minimal example `config/phone_example.json`:

```jsonc
{
  "directory": {
    "applet": "menu",
    "opt": {
      "title": "Main menu",
      "item": [
        { "name": "Weather",   "applet": "weather", "opt": { "title": "Hannover", "lat": 52.3759, "lon": 9.7320, "zoom": 6 } },
        { "name": "Company",   "applet": "phonebook", "opt": { "title": "Company", "source": "xml", "file": "/srv/phonebook.xml" } },
        { "name": "Info text", "applet": "text", "opt": { "title": "Hello", "text": "Welcome!" } },
        { "name": "A web page", "url": "http://intranet/phone.xml" }
      ]
    }
  },
  "messages": {
    "applet": "voicemail",
    "name"  : "Voicemail",
    "opt": {
      "incoming_dir"    : "/var/spool/asterisk/voicemail/default/41",
      "outgoing_dir"    : "/var/spool/asterisk/outgoing",
      "outgoing_channel": "PJSIP/41"
    }
  },
  "cron": []
}
```

Menu items reference their sub applets by path, e.g. the first item above is reached as
`/applet/weather?name=<device>&path=directory.opt.item[0]`. phopps builds these URLs itself; you only
need them for testing or to link an applet directly.

The optional `locale` query parameter (e.g. `&locale=de`) selects German texts in the voicemail applet.

### Cron jobs

`cron` is a list of applets rendered on a schedule and **pushed** to the phone (Cisco `/CGI/Execute`,
needs `ip`, `username` and `password` of the device):

```jsonc
"cron": [
  {
    "applet": "background-cisco",
    "opt"   : { "dir": "/srv/pictures", "order": "random", "convert": "fill" },
    // second minute hour day-of-month month day-of-week
    "time"  : "0 */10 * * * *"
  }
]
```


## Applets

### menu / launcher-cisco

| Option   | Description                                                                     |
|----------|---------------------------------------------------------------------------------|
| `title`  | Menu title                                                                      |
| `prompt` | Prompt line                                                                     |
| `item`   | List of applet entries, or `{ "name", "url" }` for a direct URL                 |

If an item has no `name`, its `opt.title` or the applet name is shown.

### text

| Option   | Description                                                             |
|----------|-------------------------------------------------------------------------|
| `text`   | Text to show                                                            |
| `url`    | Alternatively a web page; its text content is shown, title from `<title>` |
| `title`, `prompt` | Title and prompt                                               |

### image

| Option       | Description                                                                          |
|--------------|--------------------------------------------------------------------------------------|
| `url`        | Image URL, may contain macros (see below)                                            |
| `mode`       | `normal` (image area) or `wide` (full display)                                       |
| `convert`    | `direct` (phone loads the URL itself), `original`, `fit`, `fill`, `stretch`, `center` |
| `crop`       | `{ "x", "y", "width", "height" }` crop before converting                             |
| `dither`     | Reduce colours to the display depth                                                  |
| `timeoffset` | Seconds added to the time used by the macros                                         |
| `x`, `y`, `title`, `prompt` | Position and texts                                                    |

URL macros: `$NOW(format)` local time, `$GMT(format)` UTC time (date-fns format such as `yyyy/MM/dd HHmm`;
`md`, `mq`, `mh` round the minutes to 10, 15 or 30), `$RND(n)` an n-digit random number.

### weather

Satellite weather map for a GPS position: EUMETSAT Meteosat clouds, DWD rain radar, current
temperatures from open-meteo.com, borders, a position marker and the image time. No API keys needed.

```jsonc
{
  "applet": "weather",
  "name"  : "Weather Hannover",
  "opt"   : {
    "title" : "Hannover",
    "lat"   : 52.3759, "lon": 9.7320,   // map center (required)
    "zoom"  : 6,                        // 3 (continent) .. 10 (city), default 7
    "places": [                         // temperature labels, default: the center
      { "name": "Hannover", "lat": 52.3759, "lon": 9.7320 },
      { "name": "Bremen",   "lat": 53.0793, "lon": 8.8017 }
    ]
  }
}
```

Further options: `mode`, `marker`, `temperature`, `timestamp`, `dither`, `sources` (own WMS layers).
See [src/applet/weather/readme.md](src/applet/weather/readme.md). The rain radar covers Germany and
its surroundings; clouds and temperatures work for Europe and Africa.

### phonebook

| Option                     | Description                                                         |
|----------------------------|---------------------------------------------------------------------|
| `source`                   | `ldap` or `xml`                                                     |
| `url`                      | LDAP: `ldap://host:389`; XML: URL of a directory XML file           |
| `file`                     | XML: local file instead of `url`                                    |
| `binddn`, `password`       | LDAP bind credentials (optional)                                    |
| `basedn`                   | LDAP search base, default: the `dc=` parts of `binddn`              |
| `filter`                   | LDAP filter, default `(telephoneNumber=*)`                          |
| `name_attr`, `phone_attr`  | LDAP attributes, default `cn` and `telephoneNumber`                 |
| `title`, `prompt`          | Texts                                                               |

At most 32 entries are shown.

### voicemail

Visual voicemail for Asterisk (`app_voicemail` file storage):

1. Folder list with message counts (*New messages*, *Old messages*)
2. Message list with date, caller and length; Cisco colour phones show new/old icons and have
   **Play**, **Details** and **Delete** softkeys
3. Details with **Play**, **Delete**, **Call** (calls back), **Next**, **Back**
4. **Play**: Asterisk calls the phone and plays the message when you pick up; new messages move to *Old*
5. **Delete**: asks for confirmation, removes all files of the message and renumbers the folder
   gap free, so Asterisk's own voicemail menu keeps working

| Option             | Description                                                                         |
|--------------------|-------------------------------------------------------------------------------------|
| `incoming_dir`     | Mailbox directory, e.g. `/var/spool/asterisk/voicemail/default/41`                  |
| `outgoing_dir`     | Asterisk call file spool, e.g. `/var/spool/asterisk/outgoing`                       |
| `outgoing_channel` | Channel that rings the phone, e.g. `PJSIP/41` or `Local/41@from-internal`           |
| `tmp_dir`          | Temp dir **on the same filesystem** as `outgoing_dir`, default `<outgoing_dir>/../tmp` |
| `callerid`         | Caller ID of the playback call, default `"Voicemail" <vm>`                          |
| `mailbox`          | Folders to show, default `["INBOX", "Old"]`                                         |
| `mark_read`        | Move played messages from INBOX to Old, default `true`                              |
| `dial_prefix`      | Prefix for the call back softkey, e.g. `0` for an outside line                      |
| `labels`           | Override screen texts, e.g. `{ "INBOX": "Neu" }`                                    |

Asterisk prerequisites: the `pbx_spool` module is loaded, phopps can read/write the mailbox directory
and write the outgoing spool directory (run phopps as the `asterisk` user or adjust group rights).
phopps uses the same `.lock` files as Asterisk while it renames messages.

### background-cisco / background-snom

| Option       | Description                                                                         |
|--------------|-------------------------------------------------------------------------------------|
| `url`        | Image URL (macros as for `image`)                                                   |
| `dir`        | Alternatively a directory or glob pattern of pictures, e.g. `/srv/pictures/**/*`    |
| `order`      | For `dir`: `random`, `ascend` or `descend`                                          |
| `convert`, `crop`, `dither` | As for `image`                                                       |
| `enhance`    | Normalise the contrast                                                              |

Cisco phones need `<phonePersonalization>1</phonePersonalization>` in their configuration. Snom
phones cannot change their wallpaper via XML, so `background-snom` shows the picture full screen.


## Phone setup

### Cisco (SIP firmware, configuration file `SEP<MAC>.cnf.xml`)

Point the service URLs of each phone to phopps and add the device name:

```xml
<directoryURL>http://192.168.2.125:1080/directory?name=SEP002699F01CFA</directoryURL>
<servicesURL>http://192.168.2.125:1080/services?name=SEP002699F01CFA</servicesURL>
<informationURL>http://192.168.2.125:1080/information?name=SEP002699F01CFA</informationURL>
<idleURL>http://192.168.2.125:1080/idle?name=SEP002699F01CFA</idleURL>
<authenticationURL>http://192.168.2.125:1080/authenticate?name=SEP002699F01CFA</authenticationURL>
<phonePersonalization>1</phonePersonalization>
```

With Cisco Unified CM configure the same URLs as IP phone services or in the device's
*External Data Locations*. The voicemail applet can be added as service
(`/messages?name=SEP002699F01CFA`) or as an entry of the directory menu. `/authenticate` returns
`AUTHORIZED` for the configured `username`/`password` and is needed for pushing (cron jobs).

### Snom (models 760/765)

Configure function keys or the built-in keys as action URLs, e.g. in the phone's settings:

```
dkey_directory: url http://192.168.2.125:1080/directory?name=snom760-office
dkey_retrieve:  url http://192.168.2.125:1080/messages?name=snom760-office
```

Add the phone to `config.json` with the same `name` and `"model": "760"` or `"765"`.

### Supported models

Cisco SPA525, 6921/6941/6945/6961, 7811/7821/7832/7841/7861, 7905–7975, 8811–8865, 8941/8945/8961,
9951/9971 and Snom 760/765. Unknown models are rendered with the Cisco 7975 display specification.


## Testing in a browser

Every phone URL can be opened in a browser or with curl to see the XML the phone gets:

```bash
curl "http://localhost:1080/directory?name=SEP002699F01CFA"
```

Converted images are written to `public/tmp/` and served at `/tmp/…`.


## Routes

| Route                                       | Purpose                                           |
|---------------------------------------------|---------------------------------------------------|
| `GET /<service>?name=<device>`              | Applet of a template service (see table above)   |
| `GET /applet/<applet>?name=<device>&path=…` | Applet at a template path (menu entries, softkeys) |
| `GET /authenticate?name=…&UserID=…&Password=…` | Cisco push authentication                     |
| `GET /tmp/…`, `/icons/…`, `/img/…`          | Static files from `public/`                       |


## Troubleshooting

- **404 on a service**: the device `name` is missing in `config.json`, the template has no entry for
  the service, or the applet path does not exist. The server log names the reason.
- **Voicemail plays nothing**: check the Asterisk log for the call file, the `outgoing_channel`
  (it must ring the phone) and the file permissions of the spool directories.
- **"Folder is locked"**: Asterisk is writing the mailbox; try again. Locks older than 60 s are removed.
- **"Weather not available"**: the WMS servers were not reachable; the log shows the failing layer.
- **Images or backgrounds do not change on the phone**: Cisco background changes need
  `phonePersonalization`; push needs the phone's `ip`, `username` and `password`.


## Development

```
src/
  server.ts            entry: starts Fastify and the cron jobs
  app.ts               Fastify application (routes, static files)
  routes/              service, applet, authenticate and index routes
  applet/              one directory per applet, registry.ts lists them
  lib/                 XML objects, voicemail, imaging, WMS, weather, cron, …
  provider/config.ts   configuration loader
test/                  vitest tests, test/voicemail/ is an Asterisk mailbox fixture
config/                server and phone configuration
public/                static files served to the phones
```

A new applet extends `Applet` (`src/applet/applet.ts`), implements `render(ctx)` returning
`this.xml(ctx, xml)` and is added to `src/applet/registry.ts`.

### Commits and releases

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), e.g.
`feat(weather): add zoom option`, `fix(voicemail): keep lock on rename`, `docs: …`, `chore: …`.
A `!` after the type or a `BREAKING CHANGE:` footer marks a breaking change.

[release-please](https://github.com/googleapis/release-please) runs on every push to `main`
(`.github/workflows/release-please.yml`) and keeps a release pull request up to date with the next
version and the `CHANGELOG.md` entries. Merging that pull request creates the git tag and the GitHub
release. `fix` bumps the patch, `feat` the minor and breaking changes the major version.

## License

MIT, © Marco Paland
