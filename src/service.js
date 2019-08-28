'use strict';

const
    {isFunction, isObject} = require('lodash'),
    {isStringArray} = require('./utils'),
    Handler = require('./handler');


class Service {

    static validateConfig({start, stop, singletons, actions, handlers}) {
        if (!isFunction(start))
            throw new Error('Parameter "start" have to be a function');

        if (stop && !isFunction(stop))
            throw new Error('Parameter "stop" have to be a function');

        if (singletons && !isStringArray(singletons))
            throw new Error('Parameter "singletons" have to be an array of strings');

        if (actions && !isStringArray(actions))
            throw new Error('Parameter "actions" have to be an array of strings');

        if (handlers) {
            if (!isObject(handlers))
                throw new Error('Parameter "handlers" have to be an object');

            Object.values(handlers).forEach(h => h instanceof Handler || Handler.validateConfig(h));
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
