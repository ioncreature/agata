'use strict';

const
    {isFunction, isObject} = require('lodash'),
    {isStringArray} = require('./utils');


/**
 * Action is business logic unit with described dependencies - other actions, singletons, and plugins
 * Action is shared across all services
 */
class Action {
    static validateConfig(config) {
        if (!isObject(config))
            throw new Error('Action config have to be an object');

        if (!isFunction(config.fn))
            throw new Error('Parameter "fn" have to be a function');

        if (config.singletons && !isStringArray(config.singletons))
            throw new Error('Parameter "singletons" have to be an array of strings');

        if (config.actions && !isStringArray(config.actions))
            throw new Error('Parameter "actions" have to be an array of strings');

        if (config.plugins && !isObject(config.plugins))
            throw new Error('Parameter "plugins" have to be an object');
    }

    /**
     * @param {function} fn
     * @param {Array<string>} [singletons]
     * @param {Array<string>} [actions]
     * @param {Object} [plugins]
     */
    constructor({singletons, actions, plugins, fn}) {
        Action.validateConfig({singletons, actions, plugins, fn});

        this.singletons = singletons || [];
        this.actions = actions || [];
        this.plugins = plugins || {};
        this.fn = fn;
    }
}

module.exports = Action;
