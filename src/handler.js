'use strict';

const
    {isObject, isFunction} = require('lodash'),
    {isStringArray} = require('./utils');


class Handler {
    static validateConfig(handler) {
        if (handler instanceof Handler)
            return;

        if (!isObject(handler))
            throw new Error('Handler parameters have to be an object');

        if (!isFunction(handler.fn))
            throw new Error('Handler function is required');

        if (handler.singletons && !isStringArray(handler.singletons))
            throw new Error('Parameter "singletons" have to be an array of strings');

        if (handler.actions && !isStringArray(handler.actions))
            throw new Error('Parameter "actions" have to be an array of strings');
    }
}

module.exports = Handler;
