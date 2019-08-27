'use strict';

const
    {isFunction, isObject} = require('lodash'),
    {isStringArray} = require('./utils'),
    Handler = require('./handler');


class Service {
    /**
     * @param {function} start
     * @param {function} [stop]
     * @param {Array<string>} [singletons]
     * @param {Array<string>} [actions]
     * @param {Object} [handlers] object containing service handlers
     * @param {string} [handlersPath] path to look for handlers, scanning is recursive
     */
    constructor({start, stop, singletons, actions, handlers, handlersPath}) {
        this.actions = [];
        this.singletons = [];
        this.handlers = {};

        if (!isFunction(start))
            throw new Error('Parameter "start" have to be a function');

        this.start = start;

        if (stop) {
            if (!isFunction(stop))
                throw new Error('Parameter "stop" have to be a function');

            this.stop = stop;
        }

        if (singletons) {
            if (!isStringArray(singletons))
                throw new Error('Parameter "singletons" have to be an array of strings');

            this.singletons = singletons;
        }

        if (actions) {
            if (!isStringArray(actions))
                throw new Error('Parameter "actions" have to be an array of strings');

            this.actions = actions;
        }

        if (handlers) {
            if (!isObject(handlers))
                throw new Error('Parameter "handlers" have to be an object');

            Object.values(handlers).forEach(handler => Handler.validateConfig(handler));

            this.handlers = handlers;
        }

        if (handlersPath) {
            // todo: add handlers from given path (probably broker have to do it)
        }

    }
}

module.exports = Service;
