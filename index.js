'use strict';

const
    Broker = require('./src/broker'),
    Service = require('./src/service'),
    Singleton = require('./src/singleton'),
    Plugin = require('./src/plugin'),
    Handler = require('./src/handler'),
    Script = require('./src/script'),
    Action = require('./src/action');


exports.Broker = config => new Broker(config);
exports.Service = config => new Service(config);
exports.Singleton = config => new Singleton(config);
exports.Plugin = config => new Plugin(config);
exports.Action = config => new Action(config);
exports.Handler = config => new Handler(config);
exports.Script = config => new Script(config);
