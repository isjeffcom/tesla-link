const Koa = require('koa');
const Router = require('@koa/router');
const BodyParser = require('koa-bodyparser');
const fs = require('fs');
const superagent = require('superagent');
const { createFolder, loginCheck } = require('./utils')
const Auth = require('./Auth');

const app = new Koa()
const router = new Router()

// Create Folder for save data and debugging
createFolder('../result')
createFolder('../debug')

// Import basic config
const MAIN_CONF = JSON.parse(fs.readFileSync('../config.json', { encoding: 'utf-8' }));
const CONTROL_CONF = JSON.parse(fs.readFileSync('../result/control_token.json', { encoding: 'utf-8' }));

const LOGIN_STATE = loginCheck();
console.log(LOGIN_STATE);

app.use(BodyParser());

const API_VEHICLES = '/api/1/vehicles';

const CONTROL_TOKEN = CONTROL_CONF.access_token;

router.get('/', (ctx, next) => {
  // ctx.router available
  ctx.body = `Hello, Tesla`;
})

router.get('/vehicles', async (ctx, next) => {
  const res = await superagent
    .get(MAIN_CONF.CONTROL_BASE + API_VEHICLES)
    .auth(CONTROL_TOKEN, {type: 'bearer'})
    .set('Content-Type', 'application/json; charset=utf-8');

  ctx.body = res.text;
})

/**
 * Vehicle State
 * Support all Tesla Apis with vehicle id and api route
 * @param {Number} id - vehicle id
 * @param {String} route - api
 */
router.get('/state/:id/:route', async (ctx, next) => {
  const route = ctx.params.route === 'vehicle_data' ? ctx.params.route : `data_request/${ctx.params.route}`;
  const id = ctx.params.id;

  console.log('state');
  console.log(MAIN_CONF.CONTROL_BASE + `/api/1/vehicles/${id}/${route}`);
  
  const res = await superagent
    .get(MAIN_CONF.CONTROL_BASE + `/api/1/vehicles/${id}/${route}`)
    .auth(CONTROL_TOKEN, {type: 'bearer'})
    .set('Content-Type', 'application/json; charset=utf-8');

  ctx.body = res.text;
})

/**
 * Vehicle Commands
 * Support all Tesla Apis with vehicle id and api route
 * @param {Number} id - vehicle id
 * @param {String} route - api
 */
 router.get('/commands/:id/:route', async (ctx, next) => {
  const route = ctx.params.route === 'wake_up' ? ctx.params.route : `command/${ctx.params.route}`;
  const id = ctx.params.id;

  console.log('commands');
  console.log(MAIN_CONF.CONTROL_BASE + `/api/1/vehicles/${id}/${route}`);
  
  const res = await superagent
    .post(MAIN_CONF.CONTROL_BASE + `/api/1/vehicles/${id}/${route}`)
    .auth(CONTROL_TOKEN, {type: 'bearer'})
    .set('Content-Type', 'application/json; charset=utf-8');

  ctx.body = res.text;
})

app
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(3000)



