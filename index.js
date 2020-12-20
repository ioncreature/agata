'use strict';

const Broker = require('./src/broker');
const Service = require('./src/service');
const Singleton = require('./src/singleton');
const Plugin = require('./src/plugin');
const Action = require('./src/action');

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
