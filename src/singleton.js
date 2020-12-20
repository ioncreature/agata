'use strict';

const {isFunction} = require('lodash');
const {isStringArray} = require('./utils');

class Singleton {
    static validateConfig({singletons, start, stop}) {
        if (!isFunction(start)) throw new Error('Singleton parameter "start" have to be a function');

        if (stop && !isFunction(stop)) throw new Error('Singleton parameter "stop" have to be a function');

        if (singletons && !isStringArray(singletons))
            throw new Error('Singleton parameter "singletons" have to be an array of strings');
    }

    static STATE = {
        initial: 'initial',
        loading: 'loading',
        loaded: 'loaded',
        unloading: 'unloading',
    };

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
        this.state = Singleton.STATE.initial;
    }

    /**
     * @returns {Array<string>}
     */
    getRequiredSingletons() {
        return [...this.singletons];
    }

    /**
     * @returns {boolean}
     */
    isInit() {
        return this.state === Singleton.STATE.initial;
    }

    isLoading() {
        return this.state === Singleton.STATE.loading;
    }

    isLoaded() {
        return this.state === Singleton.STATE.loaded;
    }

    isUnloading() {
        return this.state === Singleton.STATE.unloading;
    }
}

module.exports = Singleton;
