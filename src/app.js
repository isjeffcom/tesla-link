const Koa = require('koa');
const Router = require('@koa/router');
const BodyParser = require('koa-bodyparser');
const fs = require('fs');
const superagent = require('superagent');
// const Auth = require('./Auth');

const app = new Koa()
const router = new Router()

app.use(BodyParser())

router.get('/', (ctx, next) => {
  // ctx.router available
  ctx.body = `Hello, Tesla`;
})

router.get('/vehicles', async (ctx, next) => {
  const base = "https://owner-api.teslamotors.com";
  const api = "/api/1/vehicles";
  const token = "<control token>";
  const res = await superagent
    .get(base + api)
    .auth(token, {type: 'bearer'})
    .set('Content-Type', 'application/json; charset=utf-8');

  ctx.body = res.text;
})

app
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(3000)
