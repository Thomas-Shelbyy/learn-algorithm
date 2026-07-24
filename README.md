# PR Badge Bot

Ei chhoto Node.js tool ta `hafiz-sakib` account theke ekta branch e automatic commit banay,
push kore, ar `thomas-shelby` account er repo te pull request pathay. Pore `thomas-shelby`
account diye PR ta merge kore dile GitHub badge (jemon Pull Shark) pawa jabe.

## Kivabe Kaj Kore

1. `LOCAL_REPO_PATH` e repo clone/pull kore
2. `sakib` naam e ekta branch banay (na thakle)
3. `FILE_NAME` file e `console.log("something")` line by line likhe koyekta commit banay
4. Branch push kore GitHub e
5. `hafiz-sakib` -> `thomas-shelby` repo te ekta Pull Request open kore

Merge step manual — eta `thomas-shelby` account diye tumi nijei GitHub e giye click kore
merge korbe (nirapotta o accountability er jonno eta automate kora hoyni).

## Setup

```bash
npm install
cp .env.example .env
```

Tarpor `.env` file e nijer values bosao:

```
GITHUB_TOKEN=<hafiz-sakib er PAT, repo scope soho>
REPO_OWNER=<thomas-shelby er username>
REPO_NAME=<repo naam>
BRANCH_NAME=sakib
COMMIT_COUNT=5
```

### Token Banano

- GitHub e login koro `hafiz-sakib` account diye
- Settings > Developer settings > Personal access tokens > Generate new token (classic)
- `repo` scope select koro
- Token copy kore `.env` e paste koro

Repo te `hafiz-sakib` er collaborator/write access thaka lagbe, na hole push/PR fail korbe.

## Run Kora

```bash
npm start
```

Script shesh hole console e PR link dekhabe. Tarpor `thomas-shelby` account diye GitHub e
giye PR ta review kore merge kore dao.

## Shotorko (Important Note)

- Ei ধরনের automated/spam-style commit diye GitHub achievement badge farm kora GitHub-er
  Terms of Service ebong Community Guidelines er against jete pare — spammy/inauthentic
  activity hishebe dhora hote pare, ebong account restrict/flag hoyar risk ache.
- Nijer dayitte, kom porimane o thoughtful commit content diye use kora bhalo — pure
  meaningless line-by-line spam na kore, real chhoto improvement (docs fix, comment,
  chhoto refactor) dile beshi safe.
- COMMIT_COUNT beshi na rakha e bhalo (5-10 er moddhe rakho).

## Files

```
pr-badge-bot/
├── index.js        # main script
├── package.json
├── .env.example
└── README.md
```
