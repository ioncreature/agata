'use strict';

const
    {isFunction, isObject} = require('lodash'),
    {isStringArray} = require('./utils'),
    Handler = require('./handler');


class Service {

    static validateConfig(config) {
        if (!isObject(config))
            throw new Error('Service config have to be an object');

        if (!isFunction(config.start))
            throw new Error('Parameter "start" have to be a function');

        if (config.stop && !isFunction(config.stop))
            throw new Error('Parameter "stop" have to be a function');

        if (config.singletons && !isStringArray(config.singletons))
            throw new Error('Parameter "singletons" have to be an array of strings');

        if (config.actions && !isStringArray(config.actions))
            throw new Error('Parameter "actions" have to be an array of strings');

        if (config.handlers) {
            if (!isObject(config.handlers))
                throw new Error('Parameter "handlers" have to be an object');

            Object.values(config.handlers).forEach(h => h instanceof Handler || Handler.validateConfig(h));
        }
    }


    /**
     * @param {function} start
     * @param {function} [stop]
     * @param {Array<string>} [singletons]
     * @param {Array<string>} [actions]
     * @param {Object} [handlers] object containing service handlers
     * @param {string} [handlersPath] path to look for handlers, scanning is recursive
     */
    constructor({start, stop, singletons, actions, handlers, handlersPath}) {
        Service.validateConfig({start, stop, singletons, actions, handlers, handlersPath});

        this.actions = actions || [];
        this.singletons = singletons || [];
        this.handlers = handlers || {};
        this.start = start;
        this.stop = stop;

        if (handlersPath) {
            // todo: add handlers from given path (probably broker have to do it)
        }
    }
}

module.exports = Service;
