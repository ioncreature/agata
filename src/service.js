'use strict';

const
    {
        isFunction,
        isObject,
        isString,
        intersection,
    } = require('lodash'),
    glob = require('glob'),
    {isAbsolute, resolve, join} = require('path'),
    {isStringArray, toCamelCase} = require('./utils'),
    Action = require('./action');


const
    DEFAULT_TEMPLATE = '**/*.handler.js';


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

            if (actions) {
                const namesIntersection = intersection(actions, Object.keys(handlers));
                if (namesIntersection.length)
                    throw new Error(`There are names intersects between actions and handlers: ${namesIntersection}`);
            }

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
        };
        this.actions = actions || [];
        this.singletons = singletons || [];
        this.handlers = handlers || {};
        this.startHandler = start;
        this.stopHandler = stop;

        this.requiredActions = [...this.actions, ...Object.keys(this.handlers)];

        if (handlersPath) {
            if (!isString(handlersTemplate))
                throw new Error('Parameter "handlersTemplate" have to be a string');

            this.handlersPath = isAbsolute(handlersPath) ? handlersPath : resolve(handlersPath); // is resolve() correct here?
            const paths = glob
                .sync(handlersTemplate, {cwd: this.handlersPath, nodir: true})
                .map(p => p.replace(/\.js$/, ''));

            paths.forEach(path => {
                const
                    i = require(join(this.handlersPath, path)),
                    name = toCamelCase(path);

                if (this.handlers[name] || this.actions[name])
                    throw new Error(`Action with name "${name}" already exists`);

                this.handlers[name] = i instanceof Action ? i : new Action(i);

                this.requiredActions.push(name);
            });
        }
    }


    getRequiredActions() {
        return [...this.requiredActions];
    }


    isActionRequired(name) {
        return !!this.requiredActions.includes(name);
    }


    getHandlersPath() {
        return this.handlersPath;
    }


    getRequiredSingletons() {
        return [...this.singletons];
    }
}

module.exports = Service;
