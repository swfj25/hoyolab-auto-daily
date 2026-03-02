#!/usr/bin/env node

import crypto from 'node:crypto';

const APP_CODE = "6eb76d4e13aa36e6";
const PLATFORM = "3";
const VNAME = "1.0.0";
const ENDFIELD_GAME_ID = "3";

const cookies = process.env.COOKIE.split('\n').map(s => s.trim())
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
let latestGames = []

async function run(cookie, games) {
  if (!games) {
    games = latestGames
  } else {
    games = games.split(' ')
    latestGames = games
  }

  for (let game of games) {
    game = game.toLowerCase()

    log('debug', `\n----- CHECKING IN FOR ${game} -----`)

    if (!(game in endpoints)) {
      log('error', `Game ${game} is invalid. Available games are: zzz, gi, hsr, hi3, tot, and endfield`)
      continue
    }

    if (game === 'endfield') {
      await runEndfield(cookie, game)
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

for (const index in cookies) {
  log('info', `-- CHECKING IN FOR ACCOUNT ${Number(index) + 1} --`)
  await run(cookies[index], games[index])
}

if (discordWebhook && URL.canParse(discordWebhook)) {
  await discordWebhookSend()
}

if (hasErrors) {
  console.log('')
  throw new Error('Error(s) occured.')
}

async function runEndfield(cookie, game) {
  const oauthCode = await getOAuthCode(cookie);
  if (!oauthCode) {
    log('error', game, "Failed to get OAuth Code (Check ACCOUNT_TOKEN)");
    return;
  }

  const cred = await getCred(oauthCode);
  if (!cred) {
    log('error', game, "Failed to get Credential");
    return;
  }

  const signToken = await getSignToken(cred);
  if (!signToken) {
    log('error', game, "Failed to get Sign Token");
    return;
  }

  const gameRole = await getPlayerBinding(cred, signToken);
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
    log('error', game, `Account Token is expired. Please update the script.`);
  } else {
    log('error', game, `API Error: ${code} - ${msg}`);
  }
}

async function getOAuthCode(token) {
  const payload = { token: token, appCode: APP_CODE, type: 0 };
  const response = await fetch("https://as.gryphline.com/user/oauth2/v2/grant", {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  return (json.status === 0 && json.data && json.data.code) ? json.data.code : null;
}

async function getCred(oauthCode) {
  const payload = { kind: 1, code: oauthCode };
  const response = await fetch("https://zonai.skport.com/web/v1/user/auth/generate_cred_by_code", {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  return (json.code === 0 && json.data && json.data.cred) ? json.data.cred : null;
}

async function getSignToken(cred) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const headers = { "cred": cred, "platform": PLATFORM, "vname": VNAME, "timestamp": timestamp, "sk-language": "en" };
  const response = await fetch("https://zonai.skport.com/web/v1/auth/refresh", {
    method: 'GET',
    headers: headers
  });
  const json = await response.json();
  return (json.code === 0 && json.data && json.data.token) ? json.data.token : null;
}

async function getPlayerBinding(cred, signToken) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = "/api/v1/game/player/binding";
  const signature = computeSign(path, "", timestamp, signToken);
  const headers = { "cred": cred, "platform": PLATFORM, "vname": VNAME, "timestamp": timestamp, "sk-language": "en", "sign": signature };
  const response = await fetch("https://zonai.skport.com" + path, {
    method: 'GET',
    headers: headers
  });
  const json = await response.json();

  if (json.code === 0 && json.data && json.data.list) {
    const apps = json.data.list;
    for (let i = 0; i < apps.length; i++) {
        if (apps[i].appCode === "endfield" && apps[i].bindingList) {
            const binding = apps[i].bindingList[0];
            const role = binding.defaultRole || (binding.roles && binding.roles[0]);
            if (role) return `${ENDFIELD_GAME_ID}_${role.roleId}_${role.serverId}`;
        }
    }
  }
  return null;
}

async function sendAttendanceRequest(cred, signToken, gameRole) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = "/web/v1/game/endfield/attendance";
  const signature = computeSign(path, "", timestamp, signToken);
  const headers = {
      "cred": cred, "platform": PLATFORM, "vname": VNAME, "timestamp": timestamp,
      "sk-language": "en", "sign": signature, "Content-Type": "application/json"
  };
  if (gameRole) headers["sk-game-role"] = gameRole;
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
