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

    static validateConfig({start, stop, singletons, actions, localActions}) {
        if (!isFunction(start))
            throw new Error('Parameter "start" have to be a function');

        if (stop && !isFunction(stop))
            throw new Error('Parameter "stop" have to be a function');

        if (singletons && !isStringArray(singletons))
            throw new Error('Parameter "singletons" have to be an array of strings');

        if (actions && !isStringArray(actions))
            throw new Error('Parameter "actions" have to be an array of strings');

        if (localActions) {
            if (!isObject(localActions))
                throw new Error('Parameter "localActions" have to be an object');

            if (actions) {
                const namesIntersection = intersection(actions, Object.keys(localActions));
                if (namesIntersection.length)
                    throw new Error(`There are names intersects between actions and local actions: ${namesIntersection}`);
            }

            Object.values(localActions).forEach(h => h instanceof Action || Action.validateConfig(h));
        }
    }


    /**
     * @param {function} start
     * @param {function} [stop]
     * @param {Array<string>} [singletons]
     * @param {Array<string>} [actions]
     * @param {Object} [localActions] object containing service actions.
     * @param {string} [localActionsPath] path to look for local actions, scanning is recursive
     * @param {string} [localActionsTemplate=DEFAULT_TEMPLATE] glob to load local actions
     */
    constructor({
        start, stop, singletons, actions, localActions, localActionsPath, localActionsTemplate = DEFAULT_TEMPLATE,
    }) {
        Service.validateConfig({start, stop, singletons, actions, localActions, localActionsPath});

        this.dependencies = {
            singletons: [],
            actions: [],
        };
        this.actions = actions || [];
        this.singletons = singletons || [];
        this.localActions = localActions || {};
        this.startHandler = start;
        this.stopHandler = stop;

        this.requiredActions = [...this.actions, ...Object.keys(this.localActions).map(h => `#${h}`)];

        if (localActionsPath) {
            if (!isString(localActionsTemplate))
                throw new Error('Parameter "localActionsTemplate" have to be a string');

            this.localActionsPath = isAbsolute(localActionsPath)
                ? localActionsPath : resolve(localActionsPath); // is resolve() correct here?

            const paths = glob
                .sync(localActionsTemplate, {cwd: this.localActionsPath, nodir: true})
                .map(p => p.replace(/\.js$/, ''));

            paths.forEach(path => {
                const
                    i = require(join(this.localActionsPath, path)),
                    name = toCamelCase(path);

                if (this.localActions[name] || this.actions[name])
                    throw new Error(`Action with name "${name}" already exists`);

                this.localActions[name] = i instanceof Action ? i : new Action(i);

                this.requiredActions.push(`#${name}`);
            });
        }
    }


    getRequiredActions() {
        return [...this.requiredActions];
    }


    isActionRequired(name) {
        return !!this.requiredActions.includes(name);
    }


    getLocalActionsPath() {
        return this.localActionsPath;
    }


    getRequiredSingletons() {
        return [...this.singletons];
    }
}

module.exports = Service;
