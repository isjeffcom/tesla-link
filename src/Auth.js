/**
 * Tesla remote control authorization
 * @reference https://tesla-api.timdorr.com/api-basics/authentication
 * @auther jeffwu
 */
const shajs = require('sha.js');
const superagent = require('superagent');
const fs = require('fs');
const cheerio = require('cheerio');
const { createFolder } = require('./utils')

// Create Folder for save data and debugging
createFolder('../result')
createFolder('../debug')

// Read config
// Fixed client id and client secret from: https://pastebin.com/pS7Z6yyP
const CONFIG = JSON.parse(fs.readFileSync('../config.json', { encoding: 'utf-8' }));
const TESLA_CLIENT_ID = CONFIG.TESLA_CLIENT_ID;
const TESLA_CLIENT_SECRET = CONFIG.TESLA_CLIENT_SECRET;


// Define APIs
const API_BASE = CONFIG.BASE;
const API_AUTH = '/oauth2/v3/authorize';
const API_AUTH_REDIRECT = 'https://auth.tesla.com/void/callback';
const API_TOKEN = '/oauth2/v3/token';
const API_CONTROL_TOKEN = 'https://owner-api.teslamotors.com/oauth/token';

// File Path
const AUTH_FILE_PATH = '../result/login_auth.json';
const CONTROL_TOKEN_FILE_PATH = '../result/control_token.json'

/**
 * Auth struct
 */
class Auth {
  constructor () {
    this.BASE = API_BASE;
    this.STATE = randomString(4);
    this.AUTHED = false;
    this.AUTH_RES = {
      access_token: null,
      refresh_token: null,
      id_token: null,
      expires_in: null,
      state: null,
    }
    this.ACCESS_TOKEN = null;
    this.REFRESH_TOKEN = null;

    // Generate code for exchange
    this.CODE_VERIFIER = randomString(86); // Random 86-character alphanumeric string
    this.CODE_CHALLENGE = new shajs.sha256().update(this.CODE_VERIFIER).digest('hex') // SHA256 digest hex Encode
  }

  async login (email = null, password = null) {

    // Check for basic information
    if (!email || email.length <= 0 || !password || password.length <= 0) {
      console.error("No Email or password")
      return;
    }
    // Step 1: Obtain the login page
    // construct parameter
    const authParam = {
      client_id: 'ownerapi',
      code_challenge: this.CODE_CHALLENGE,
      code_challenge_method: 'S256',
      redirect_uri: API_AUTH_REDIRECT,
      response_type: 'code',
      scope: 'openid email offline_access',
      state: this.STATE,
      prompt: 'login',
      login_hint: email
    }

    // promise with then/catch
    const reqUrl = constParam(this.BASE + API_AUTH, authParam);

    console.log(`======== NEW REQUEST STARTED: ${reqUrl}========`);
    console.log(`======== WITH FORM:`);
    console.log(`${JSON.stringify(authParam)}`);
    console.log(`CONTINUE ======== `);
    superagent
      .get(reqUrl)
      .set('sec-fetch-site', 'none')
      .set('sec-fetch-mode', 'navigate')
      .set('sec-fetch-user', '?1')
      .set('sec-fetch-dest', 'document')
      .redirects(0)
      .end((error, response) => {
        if (response.statusCode === 303) {
          console.log(`1.1. Redirect required: ${response.statusCode}`);

          const redir = response.headers.location;
          const newBase = redir.split('/oauth2');

          this.BASE = newBase[0];
          CONFIG.BASE = this.BASE;

          // Update config file
          fs.writeFileSync('../config.json', JSON.stringify(CONFIG));

          console.log(`1.2. New base URL: ${this.BASE}`);
          
          this.login();
          return;
        }

        if (response.statusCode === 200) {
          console.log(`2.1. No redirect to follow`);
          console.log(`2.2. Obtain cookies`);
          const cookies = response.headers['set-cookie'].join();

          console.log(`2.3. Parse HTML to obtain hidden input value`);
          
          const html = response.text;
          const $ = cheerio.load(html);

          // Get SSO-SORM values
          const _csrf = $('input[name=_csrf]').attr('value');
          const _phase = $('input[name=_phase]').attr('value');
          const _process = $('input[name=_process]').attr('value');
          const transaction_id = $('input[name=transaction_id]').attr('value');
          
          const authSSOForm = {
            _csrf,
            _phase,
            _process,
            transaction_id,
            cancel: '',
            identity: email,
            credential: password
          }
          
          console.log(`2.4. Auth request started: `);

          const nextUrl = constParam(this.BASE + API_AUTH, {
            client_id: 'ownerapi',
            code_challenge: this.CODE_CHALLENGE,
            code_challenge_method: 'S256',
            redirect_uri: API_AUTH_REDIRECT,
            response_type: 'code',
            scope: 'openid email offline_access',
            state: this.STATE,
          });
          console.log(`2.4. Auth request URL: ${nextUrl}`);
          console.log(`2.4. Auth request Body: ${JSON.stringify(authSSOForm)}`);

          superagent
            .post(nextUrl)
            .type('form')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .set('Cookie', cookies)
            .set('sec-fetch-site', 'none')
            .set('sec-fetch-mode', 'navigate')
            .set('sec-fetch-user', '?1')
            .set('sec-fetch-dest', 'document')
            .send(authSSOForm)
            .redirects(0)
            .end((error, authRes) => {
              // WIRTE FILE FOR DEBUG
              // fs.writeFileSync('./html/step2.html', authRes.text);
              if (authRes.statusCode === 302) {
                console.log(`2.5. Auth request response with 302 code, new redirect location obtained: ${authRes.headers.location}`)
                const nextRedir = authRes.headers.location;
                const authParamsReady = nextRedir.split('?')[1];
                const authParams = new URLSearchParams(authParamsReady);
                const authCode = authParams.get('code');

                console.log(`3.1. Starting exchange for bearer code by Auth code: ${authCode}`)
                // console.log(authRes.location);

                const exchangeBearerTokenForm = {
                  grant_type: "authorization_code",
                  client_id: "ownerapi",
                  code: authCode,
                  code_verifier: this.CODE_VERIFIER,
                  redirect_uri: API_AUTH_REDIRECT
                }

                console.log(`3.2. Make request to exchange bearer token by: ${nextUrl}`);
                console.log(`3.3. Exchange request Body: ${JSON.stringify(exchangeBearerTokenForm)}`);

                superagent
                  .post(this.BASE + API_TOKEN)
                  .type('json')
                  .set("Accept", "*/*")
                  .set('Content-Type', 'application/json')
                  .set("Connection", "keep-alive")
                  .send(exchangeBearerTokenForm)
                  .end((excErr, excRes) => {
                    if (excRes.statusCode === 200) {
                      const resStruct = JSON.parse(excRes.text);

                      // Write down for a clear view when hacking
                      this.AUTH_RES = {
                        access_token: resStruct.access_token,
                        refresh_token: resStruct.refresh_token,
                        id_token: resStruct.id_token,
                        expires_in: resStruct.expires_in,
                        state: resStruct.state,
                      };

                      console.log(`3.4. Bearer access token obtained: ${this.AUTH_RES.access_token}`);
                      const accessToken = this.AUTH_RES.access_token;

                      this.AUTHED = true;

                      console.log(`3.5. Status logged, auth information at ${AUTH_FILE_PATH}`);
                      fs.writeFileSync(AUTH_FILE_PATH, JSON.stringify(this.AUTH_RES));
                      
                      const controlTokenForm = {
                        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                        client_id: TESLA_CLIENT_ID,
                        client_secret: TESLA_CLIENT_SECRET
                      }

                      console.log(`4.1. Make request to exchange control token by: ${API_CONTROL_TOKEN}`);
                      console.log(`4.2. Exchange request Body: ${JSON.stringify(controlTokenForm)}`);

                      superagent
                        .post(API_CONTROL_TOKEN)
                        .auth(accessToken, {type: 'bearer'})
                        .send(controlTokenForm)
                        .end((cotErr, cotRes) => {
                          if(cotRes.statusCode === 200) {
                            console.log(`4.3. Auth successful`);
                          } else {
                            console.log(`4.3. Auth fail`);
                          }
                          fs.writeFileSync(CONTROL_TOKEN_FILE_PATH, cotRes.text);
                        })
                      
                    }
                  })
              } else {
                console.log(`2.5. Fail to obtain auth code with ${authRes.statusCode} response status`)
              }
              
            })
        }
        

        
    })
  }

  async logout (token) {

  }

  async test() {
    const form = {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      client_id: TESLA_CLIENT_ID,
      client_secret: TESLA_CLIENT_SECRET
    }
    superagent
      .post(API_CONTROL_TOKEN)
      .auth('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFQTXpfbDNvamZ1U3B1SWR2eW4tODBuZ0ZpSSJ9.eyJpc3MiOiJodHRwczovL2F1dGgudGVzbGEuY24vb2F1dGgyL3YzIiwiYXVkIjpbImh0dHBzOi8vb3duZXItYXBpLnRlc2xhbW90b3JzLmNvbS8iLCJodHRwczovL2F1dGgudGVzbGEuY24vb2F1dGgyL3YzL3VzZXJpbmZvIl0sImF6cCI6Im93bmVyYXBpIiwic3ViIjoiMmM1MTA3NmUtZmM5MC00YWM5LTg5M2EtZWQwOGI4NGY1YjA1Iiwic2NwIjpbIm9wZW5pZCIsImVtYWlsIiwib2ZmbGluZV9hY2Nlc3MiXSwiYW1yIjpbInB3ZCJdLCJleHAiOjE2MjEyNjE4MjksImlhdCI6MTYyMTI2MTUyOSwiYXV0aF90aW1lIjoxNjIxMjYxNTI4fQ.X2NqFOk4fYTFJj09OB8wbmokiv-U1dNGSTjW5BWDUmCr2xEHl80E13rYOOYjsxGyVi9yAy7Ug4BuFFHaJQ5D9d9viIqnfVuFIFXDRe6-tnYTp-gML6CApvv4RZft8peDip4NFzsIBv_K98sTqHtMtk0NlHhmjXT2FtWAkXsxYMwzk1bF8FmuygqkVSEDt3VDAutGerh_j1mVw2I_QttLIjshQEIKFuWbPkB68FHfgYR242wbeldBxgPWkehScqynvwU24HrP_KnSzBwT1OsGLjNcPxPS-qJaOyCWogeyMaJ2MV4RVEhQoObifJrmyjxME8vN1RnuP3yV99-nY4ZJZWuSUHb2fJnegDxrAF0PnPgviEi2Jt66UsggWMX0NONuJva1qIuQlFHlzMBwRWKOGRoPWvGh09LvaX8DQbJvoMYFpxguXUDc7tMYIQrmXoN4u_dVeSA7lY0TcyUj60CdB9c0tG_zICdz3kB-PTh0xr89UXzpszo9Y2LxelNRNeOOb2nbqSua3Axnwdr7fyFJzSS2H76S69bNqscpnfGcHSyC-nyDzM-QEuqmh79LzSY8TiqpE_TEZwG9EaMwdOPMVOF_ZduDT3KE-5BplNKbxRqVwi2ljtOlxx-mhw_qZmY-RNGLoBJQBbQVzORi9ULZysGPfTQ-M47JZ6HqEcoN3aI', {type: 'bearer'})
      .send(form)
      .end((cotErr, cotRes) => {
        console.log(cotRes.statusCode)
        // // if(cotErr) console.log(cotErr);
        // if(cotRes.statusCode === 200) {
        //   console.log(`4.3. Auth successful`);
        // } else {
        //   console.log(`4.3. Auth fail`);
        // }
        // if(cotErr) fs.writeFileSync('error1.json', JSON.stringify(cotErr));
        // fs.writeFileSync('error2.json', JSON.stringify(cotRes));
        fs.writeFileSync(CONTROL_TOKEN_FILE_PATH, cotRes.text);
      })
  }
}

const auth = new Auth()
const account = JSON.parse(fs.readFileSync("../account.json", {encoding: "utf-8"}));
auth.login(account.email, account.password)


function randomString (length = 86) {
  const result = []
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result.push(characters.charAt(Math.floor(Math.random() *
        charactersLength)))
  }
  return result.join('')
}

// Construct GET URL with paramaters
function constParam(api, obj) {
  let res = '';
  let i = 0;
  const len = Object.keys(obj).length;

  if (len === 0) return '';

  // eslint-disable-next-line no-restricted-syntax
  for (const key in obj) {
    if (i === 0) {
      res += `?${key}=${obj[key]}`;
    } else {
      res += `&${key}=${obj[key]}`;
    }

    i = i + 1;
  }

  return api + res;
}


