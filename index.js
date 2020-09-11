'use strict';

const
    Broker = require('./src/broker'),
    Service = require('./src/service'),
    Singleton = require('./src/singleton'),
    Plugin = require('./src/plugin'),
    Action = require('./src/action');


/**
 * @param {Object} config
 * @return {Broker}
 */
exports.Broker = config => new Broker(config);

/**
 * @param {Object} config
 * @return {Service}
 */
exports.Service = config => new Service(config);

/**
 * @param {Object} config
 * @return {Singleton}
 */
exports.Singleton = config => new Singleton(config);

/**
 * @param {Object} config
 * @return {Plugin}
 */
exports.Plugin = config => new Plugin(config);

/**
 * @param {Object} config
 * @return {Action}
 */
exports.Action = config => new Action(config);
