'use strict';

const
    {
        isFunction,
        isObject,
        isString,
        camelCase,
    } = require('lodash'),
    glob = require('glob'),
    {isAbsolute, resolve} = require('path'),
    {isStringArray, toCamelCase} = require('./utils'),
    Action = require('./action');


const
    DEFAULT_TEMPLATE = '**/*.handler.js',
    IDLE = 'idle',
    STARTING = 'starting',
    RUNNING = 'running',
    STOPPING = 'stopping';


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

            Object.values(handlers).forEach(h => h instanceof Action || Action.validateConfig(h));
        }
    }


    /**
     * @param {function} start
     * @param {function} [stop]
     * @param {Array<string>} [singletons]
     * @param {Array<string>} [actions]
     * @param {Object} [handlers] object containing service handlers. Handlers are local to given service actions
     * @param {string} [handlersPath] path to look for handlers, scanning is recursive
     * @param {string} [handlersTemplate=DEFAULT_TEMPLATE] glob to load handlers
     */
    constructor({start, stop, singletons, actions, handlers, handlersPath, handlersTemplate = DEFAULT_TEMPLATE}) {
        Service.validateConfig({start, stop, singletons, actions, handlers, handlersPath});

        this.dependencies = {
            singletons: [],
            actions: [],
            handlers: [],
        };
        this.actions = actions || [];
        this.singletons = singletons || [];
        this.handlers = handlers || {};
        this.startHandler = start;
        this.stopHandler = stop;

        if (handlersPath) {
            if (!isString(handlersTemplate))
                throw new Error('Parameter "handlersTemplate" have to be a string');

            const
                cwd = isAbsolute(handlersPath) ? handlersPath : resolve(handlersPath), // is resolve() correct here?
                paths = glob
                    .sync(handlersTemplate, {cwd, nodir: true})
                    .map(p => camelCase(p.replace(/\.handler\.js$/, '').replace(/\.js$/, '')));

            paths.forEach((res, path) => {
                const
                    i = require(resolve(cwd, path)),
                    name = toCamelCase(path);

                if (this.handlers[name])
                    throw new Error(`Handler with name "${name}" already exists`);

                this.handlers[name] = i instanceof Action ? i : new Action(i);
            });
        }

        this.state = IDLE;
    }


    isRunning() {
        return this.state === RUNNING;
    }
}

module.exports = Service;
