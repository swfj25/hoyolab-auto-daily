#!/usr/bin/env node

import crypto from 'node:crypto';

const PLATFORM = "3";
const VNAME = "1.0.0";
const ENDFIELD_GAME_ID = "3";
const endfieldUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';


const cookies = process.env.COOKIE.split('\n').map(s => s.trim())
const skportCookies = (process.env.SKPORT_COOKIE || '').split('\n').map(s => s.trim())
const games = process.env.GAMES.split('\n').map(s => s.trim())
const discordWebhook = process.env.DISCORD_WEBHOOK
const discordUser = process.env.DISCORD_USER
const msgDelimiter = ':'
const messages = []
const endpoints = {
  zzz: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign?act_id=e202406031448091',
  gi:  'https://sg-hk4e-api.hoyolab.com/event/sol/sign?act_id=e202102251931481',
  hsr: 'https://sg-public-api.hoyolab.com/event/luna/os/sign?act_id=e202303301540311',
  hi3: 'https://sg-public-api.hoyolab.com/event/mani/sign?act_id=e202110291205111',
  tot: 'https://sg-public-api.hoyolab.com/event/luna/os/sign?act_id=e202202281857121',
  endfield: 'https://zonai.skport.com/web/v1/game/endfield/attendance',
}

let hasErrors = false

async function run(cookie, skportCookie, games) {
  for (let game of games) {
    game = game.toLowerCase()

    log('debug', `\n----- CHECKING IN FOR ${game} -----`)

    if (!(game in endpoints)) {
      log('error', `Game ${game} is invalid. Available games are: zzz, gi, hsr, hi3, tot, and endfield`)
      continue
    }

    if (game === 'endfield') {
      await runEndfield(skportCookie, game)
      continue
    }

    // begin check in
    const endpoint = endpoints[game]
    const url = new URL(endpoint)
    const actId = url.searchParams.get('act_id')

    url.searchParams.set('lang', 'ja-jp')

    const body = JSON.stringify({
      lang: 'ja-jp',
      act_id: actId
    })

    // headers from valid browser request
    const headers = new Headers()

    headers.set('accept', 'application/json, text/plain, */*')
    headers.set('accept-encoding', 'gzip, deflate, br, zstd')
    headers.set('accept-language', 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7')
    headers.set('connection', 'keep-alive')

    headers.set('origin', 'https://act.hoyolab.com')
    headers.set('referrer', 'https://act.hoyolab.com')
    headers.set('content-type', 'application.json;charset=UTF-8')
    headers.set('cookie', cookie)

    headers.set('sec-ch-ua', '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"')
    headers.set('sec-ch-ua-mobile', '?0')
    headers.set('sec-ch-ua-platform', '"Linux"')
    headers.set('sec-fetch-dest', 'empty')
    headers.set('sec-fech-mode', 'cors')
    headers.set('sec-fetch-site', 'same-site')
    headers.set('sec-gpc', '1')

    headers.set("x-rpc-signgame", game)

    headers.set('user-agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')

    const res = await fetch(url, { method: 'POST', headers, body })
    const json = await res.json()
    const code = String(json.retcode)
    const successCodes = {
      '0': 'Successfully checked in!',
      '-5003': 'Already checked in for today',
    }

    // success responses
    if (code in successCodes) {
      log('info', game, `${successCodes[code]}`)
      continue
    }

    // error responses
    const errorCodes = {
      '-100': 'Error not logged in. Your cookie is invalid, try setting up again',
      '-10002': 'Error not found. You haven\'t played this game'
    }

    log('debug', game, `Headers`, Object.fromEntries(res.headers))
    log('debug', game, `Response`, json)

    if (code in errorCodes) {
      log('error', game, `${errorCodes[code]}`)
      continue
    }

    log('error', game, `Error undocumented, report to Issues page if this persists`)
  }
}

// custom log function to store messages
function log(type, ...data) {

  // log to real console
  console[type](...data)

  // ignore debug and toggle hasErrors
  switch (type) {
    case 'debug': return
    case 'error': hasErrors = true
  }

  // check if it's a game specific message, and set it as uppercase for clarity, and add delimiter
  if(data[0] in endpoints) {
    data[0] = data[0].toUpperCase() + msgDelimiter
  }

  // serialize data and add to messages
  const string = data
    .map(value => {
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2).replace(/^"|"$/, '')
      }

      return value
    })
    .join(' ')

  messages.push({ type, string })
}

// must be function to return early
async function discordWebhookSend() {
  log('debug', '\n----- DISCORD WEBHOOK -----')

  if (!discordWebhook.toLowerCase().trim().startsWith('https://discord.com/api/webhooks/')) {
    log('error', 'DISCORD_WEBHOOK is not a Discord webhook URL. Must start with `https://discord.com/api/webhooks/`')
    return
  }
  let discordMsg = ""
  if (discordUser) {
      discordMsg = `<@${discordUser}>\n`
  }
  discordMsg += messages.map(msg => `(${msg.type.toUpperCase()}) ${msg.string}`).join('\n')

  const res = await fetch(discordWebhook, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      content: discordMsg
    })
  })

  if (res.status === 204) {
    log('info', 'Successfully sent message to Discord webhook!')
    return
  }

  log('error', 'Error sending message to Discord webhook, please check URL and permissions')
}

if (!cookies || !cookies.length) {
  throw new Error('COOKIE environment variable not set!')
}

if (!games || !games.length) {
  throw new Error('GAMES environment variable not set!')
}

// a blank GAMES line reuses the previous account's games list
let previousGames = []
const resolvedGames = games.map(line => {
  previousGames = line ? line.split(' ') : previousGames
  return previousGames
})

const needsSkportCookie = resolvedGames.some(list => list.map(g => g.toLowerCase()).includes('endfield'))

if (needsSkportCookie && !process.env.SKPORT_COOKIE) {
  throw new Error('SKPORT_COOKIE environment variable not set! (required for endfield)')
}

// SKPORT_COOKIE only needs one line per account that actually uses endfield,
// in order, since GitHub Secrets strips leading/trailing blank lines and
// breaks any scheme relying on placeholder blank lines to keep indices aligned
let skportCookieCursor = 0

for (const index in cookies) {
  log('info', `-- CHECKING IN FOR ACCOUNT ${Number(index) + 1} --`)
  const accountGames = resolvedGames[index]
  const usesSkport = accountGames.map(g => g.toLowerCase()).includes('endfield')
  const skportCookie = usesSkport ? skportCookies[skportCookieCursor++] : undefined
  await run(cookies[index], skportCookie, accountGames)
}

if (discordWebhook && URL.canParse(discordWebhook)) {
  await discordWebhookSend()
}

if (hasErrors) {
  console.log('')
  throw new Error('Error(s) occured.')
}

async function runEndfield(cookie, game) {
  const cred = extractCred(cookie || '');
  if (!cred) {
    log('error', game, "Failed to find SK_OAUTH_CRED_KEY in SKPORT_COOKIE. Please update your cookie, see README.");
    return;
  }

  const signJson = await getSignToken(cred);
  const signToken = (signJson.code === 0 && signJson.data && signJson.data.token) ? signJson.data.token : null;
  if (!signToken) {
    log('error', game, "Failed to get Sign Token (Check SK_OAUTH_CRED_KEY). Response: " + JSON.stringify(signJson));
    return;
  }

  const gameRole = await getPlayerBinding(cred, signToken);
  if (!gameRole) {
    // getPlayerBinding already logged the specific reason it couldn't
    // resolve a role. Sending attendance without sk-game-role only yields
    // the confusing "19001 无法获取当前角色位置" error, so bail out here.
    return;
  }

  const response = await sendAttendanceRequest(cred, signToken, gameRole);

  const code = response.code;
  const msg = response.message || "";

  if (code === 0) {
    const rewards = parseRewards(response.data);
    const dayCount = response.data.signInCount || "?";
    log('info', game, `Successfully checked in! Days Signed: ${dayCount}, Rewards: ${rewards}`);
  } else if (code === 1001 || code === 10001 || msg.toLowerCase().includes("already")) {
    log('info', game, `Already checked in for today`);
  } else if (code === 10002) {
    log('error', game, `SK_OAUTH_CRED_KEY is expired. Please update your cookie.`);
  } else {
    log('error', game, `API Error: ${code} - ${msg} - Response: ` + JSON.stringify(response));
  }
}

// SKPORT_COOKIE may be a full cookie header string (copied from dev tools)
// or just the raw SK_OAUTH_CRED_KEY value itself
function extractCred(cookie) {
  const match = cookie.match(/SK_OAUTH_CRED_KEY=([^;]+)/);
  let raw = (match ? match[1] : cookie).trim();

  // Developer Tools may copy the value in URL-encoded format
  try { raw = decodeURIComponent(raw); } catch (e) {}

  return raw || null;
}

// SKPORT rejects/mis-handles requests that lack the web origin/referer, which
// makes the binding lookup silently fail. Always send them so the API can
// resolve the account and its game role.
function buildEndfieldHeaders(cred, timestamp, extra = {}) {
  return {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json",
    "origin": "https://game.skport.com",
    "referer": "https://game.skport.com/",
    "cred": cred,
    "platform": PLATFORM,
    "sk-language": "en",
    "timestamp": timestamp,
    "vname": VNAME,
    "user-agent": endfieldUserAgent,
    ...extra,
  };
}

async function getSignToken(cred) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const headers = buildEndfieldHeaders(cred, timestamp);
  const response = await fetch("https://zonai.skport.com/web/v1/auth/refresh", {
    method: 'GET',
    headers: headers
  });
  return await response.json();
}

async function getPlayerBinding(cred, signToken) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = "/api/v1/game/player/binding";
  const signature = computeSign(path, "", timestamp, signToken);
  const headers = buildEndfieldHeaders(cred, timestamp, { sign: signature });
  const response = await fetch("https://zonai.skport.com" + path, {
    method: 'GET',
    headers: headers
  });
  const json = await response.json();

  // Printed to the Actions log (debug is not stored in Discord messages) so
  // the raw binding response is visible if role resolution ever fails again.
  log('debug', 'endfield', 'Binding response:', json);

  if (json.code !== 0 || !json.data || !json.data.list) {
    log('error', 'endfield', `Failed to get player binding: ${json.code} - ${json.message || ''}`);
    return null;
  }

  const endfieldApp = json.data.list.find(app => app.appCode === "endfield");
  if (!endfieldApp || !endfieldApp.bindingList || !endfieldApp.bindingList.length) {
    log('error', 'endfield', 'No Endfield account is bound to this SKPORT login.');
    return null;
  }

  for (const binding of endfieldApp.bindingList) {
    const roles = binding.roles || (binding.defaultRole ? [binding.defaultRole] : []);
    for (const role of roles) {
      if (role && role.roleId && role.serverId) {
        return `${ENDFIELD_GAME_ID}_${role.roleId}_${role.serverId}`;
      }
    }
  }

  log('error', 'endfield', 'Endfield binding found but it has no playable role.');
  return null;
}

async function sendAttendanceRequest(cred, signToken, gameRole) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = "/web/v1/game/endfield/attendance";
  const signature = computeSign(path, "", timestamp, signToken);
  const headers = buildEndfieldHeaders(cred, timestamp, { sign: signature, "sk-game-role": gameRole });
  const response = await fetch("https://zonai.skport.com" + path, {
      method: 'POST',
      headers: headers
  });
  return await response.json();
}

function computeSign(path, body, timestamp, signToken) {
  const headerObj = { "platform": PLATFORM, "timestamp": timestamp, "dId": "", "vName": VNAME };
  const headersJson = JSON.stringify(headerObj);
  const signString = path + body + timestamp + headersJson;
  const hmacHex = crypto.createHmac('sha256', signToken).update(signString).digest('hex');
  const md5Hex = crypto.createHash('md5').update(hmacHex).digest('hex');
  return md5Hex;
}

function parseRewards(data) {
  if (!data) return "Unknown";
  if (data.reward) return `${data.reward.name} x${data.reward.count}`;
  if (data.awardIds && data.resourceInfoMap) {
      let list = [];
      for (let i = 0; i < data.awardIds.length; i++) {
          const id = data.awardIds[i].id;
          if (data.resourceInfoMap[id]) {
              const item = data.resourceInfoMap[id];
              list.push(`${item.name} x${item.count}`);
          }
      }
      return list.join(", ");
  }
  return "No rewards data found";
}
