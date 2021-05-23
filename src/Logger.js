/**
 * Tesla Link data logger
 * @reference https://tesla-api.timdorr.com/api-basics/authentication
 * @auther jeffwu
*/

const fs = require('fs');
const superagent = require('superagent');
const { loginCheck } = require("./utils");

// Import basic config
const MAIN_CONF = JSON.parse(fs.readFileSync('../config.json', { encoding: 'utf-8' }));

const INTERVAL_TIME = 1 * 60 * 1000; // PRE 1 MINUTE
const TIMEOUT = 5000;

// const API_DATA = "/api/1/vehicles/{id}/vehicle_data"

class Logger {
  constructor(token = null, vid = null) {
    if(!loginCheck) return { status: false, msg: 'need login', data: null };

    const CONTROL_CONF = JSON.parse(fs.readFileSync('../result/control_token.json', { encoding: 'utf-8' }));
    this.TOKEN = CONTROL_CONF.access_token;

    this.API_DATA = `/api/1/vehicles/${vid}/vehicle_data`;

    this.loggerInterval = null;
  }

  start() {
    this.log();
    this.loggerInterval = setInterval(() => {
      this.log();
    }, INTERVAL_TIME);
  }


  end() {
    clearInterval(this.loggerInterval);
  }

  /**
   * Test if vehicle is awake
   * 
   */
  log() {
    console.log('Log - Start');
    superagent
    .get(MAIN_CONF.CONTROL_BASE + this.API_DATA)
    .auth(this.TOKEN, {type: 'bearer'})
    .timeout({
      response: TIMEOUT,
      deadline: TIMEOUT + 1500
    })
    .then(res => {
      // console.log(res.text);
        // console.log(res.text);
        const now = current();
        fs.writeFile(`../vlog/logs/${now}.json`, res.text, () => {
          // do nothing
          console.log('Log - Done: ' + now)
        });
      }, err => {
        // if time out, do nothing
        if (err.timeout){
          console.log('Log - Timeout');
          // do nothing
        } else {
          const now = current();
          fs.writeFile(`../vlog/errs/${now}.log`, JSON.stringify(err), () => {
            // do nothing
          });
        }
    });
  }
}
const logger = new Logger(null, '<id>');
logger.start();

function current() {
  const d = new Date();
  return d.getFullYear() + addZero(d.getMonth() + 1) + addZero(d.getDate()) + addZero(d.getHours()) + addZero(d.getMinutes())
}

function addZero(num) {
  return num < 10 ? '0' + num : num;
}