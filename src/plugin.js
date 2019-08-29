'use strict';

const
    {isFunction} = require('lodash'),
    {isStringArray} = require('./utils');

class Plugin {

    static validateConfig({singletons, onActionLoad}) {
        if (!isFunction(onActionLoad))
            throw new Error('Parameter "onActionLoad" have to be a function');

        if (singletons && !isStringArray(singletons))
            throw new Error('Parameter "singletons" have to be an array of strings');
    }


    constructor({singletons, onActionLoad}) {
        Plugin.validateConfig({singletons, onActionLoad});
        this.singletons = singletons;
        this.onActionLoad = onActionLoad;
    }

}

module.exports = Plugin;
