'use strict';

const
    {isFunction} = require('lodash'),
    {isStringArray} = require('./utils');

class Plugin {

    static validateConfig({singletons, start}) {
        if (!isFunction(start))
            throw new Error('Plugin parameter "start" have to be a function');

        if (singletons && !isStringArray(singletons))
            throw new Error('Parameter "singletons" have to be an array of strings');
    }


    constructor({singletons, start}) {
        Plugin.validateConfig({singletons, start});
        this.singletons = singletons || [];
        this.start = start;
    }

    getRequiredSingletons() {
        return [...this.singletons];
    }

}

module.exports = Plugin;
