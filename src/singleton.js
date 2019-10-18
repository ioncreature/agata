'use strict';

const
    {isFunction} = require('lodash'),
    {isStringArray} = require('./utils');


class Singleton {

    static validateConfig({singletons, start, stop}) {
        if (!isFunction(start))
            throw new Error('Parameter "start" have to be a function');

        if (stop && !isFunction(stop))
            throw new Error('Parameter "stop" have to be a function');

        if (singletons && !isStringArray(singletons))
            throw new Error('Parameter "singletons" have to be an array of strings');
    }

    /**
     * @param {function} start
     * @param {function} [stop]
     * @param {Array<string>} [singletons]
     */
    constructor({singletons, start, stop}) {
        Singleton.validateConfig({singletons, start, stop});

        /** @type Array<string> */
        this.singletons = singletons || [];
        this.start = start;
        this.stop = stop;
        this.stateData = {};
    }


    /**
     * @returns {Array<string>}
     */
    getRequiredSingletons() {
        return [...this.singletons];
    }
}

module.exports = Singleton;
