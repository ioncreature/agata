'use strict';

const {isFunction, isObject, cloneDeep} = require('lodash'),
    {isStringArray} = require('./utils');

/**
 * Action is business logic unit with described dependencies - other actions, singletons, and plugins
 * Action is shared across all services
 */
class Action {
    static validateConfig({singletons, actions, plugins, fn}) {
        if (!isFunction(fn)) throw new Error('Action parameter "fn" have to be a function');

        if (singletons && !isStringArray(singletons))
            throw new Error('Action parameter "singletons" have to be an array of strings');

        if (actions && !isStringArray(actions))
            throw new Error('Action parameter "actions" have to be an array of strings');

        if (plugins && !isObject(plugins)) throw new Error('Action parameter "plugins" have to be an object');
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

    getRequiredActions() {
        return [...this.actions];
    }

    getRequiredSingletons() {
        return [...this.singletons];
    }

    getRequiredPlugins() {
        return Object.keys(this.plugins);
    }

    getPluginParams(name) {
        return this.plugins[name] && cloneDeep(this.plugins[name]);
    }

    getAllPluginParams() {
        return cloneDeep(this.plugins);
    }
}

module.exports = Action;
