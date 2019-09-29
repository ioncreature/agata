'use strict';

const
    {
        isFunction,
        isObject,
        intersection,
    } = require('lodash'),
    {
        isStringArray,
        loadFiles,
        DEFAULT_ACTION_TEMPLATE,
        DEFAULT_ACTION_TEMPLATE_REMOVE,
    } = require('./utils'),
    Action = require('./action');


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

            Object.values(localActions).forEach(a => a instanceof Action || Action.validateConfig(a));
        }
    }


    /**
     * @param {function} start
     * @param {function} [stop]
     * @param {Array<string>} [singletons]
     * @param {Array<string>} [actions]
     * @param {Object} [localActions] object containing service actions.
     * @param {string} [localActionsPath] path to look for local actions, scanning is recursive
     * @param {string} [localActionsTemplate=DEFAULT_ACTION_TEMPLATE] glob to load local actions
     */
    constructor({
        start,
        stop,
        singletons,
        actions,
        localActions,
        localActionsPath,
        localActionsTemplate = DEFAULT_ACTION_TEMPLATE,
    }) {
        Service.validateConfig({start, stop, singletons, actions, localActions, localActionsPath});

        this.dependencies = {
            singletons: [],
            actions: [],
        };
        this.actions = actions || [];
        this.singletons = singletons || [];
        this.localActions = {};
        this.startHandler = start;
        this.stopHandler = stop;

        if (localActions)
            Object.entries(localActions).forEach(([name, action]) => {
                this.localActions[name] = action instanceof Action ? action : new Action(action);
            });

        if (localActionsPath) {
            const files = loadFiles({
                path: localActionsPath,
                template: localActionsTemplate,
                remove: DEFAULT_ACTION_TEMPLATE_REMOVE,
            });

            files.forEach(([name, file]) => {
                if (this.localActions[name] || this.actions[name])
                    throw new Error(`Action with name "${name}" already exists`);

                this.localActions[name] = file instanceof Action ? file : new Action(file);
            });
        }
    }

    /**
     * @returns {Array<string>}
     */
    getRequiredActions() {
        return [...this.actions];
    }


    /**
     * @returns {Array<string>}
     */
    getRequiredLocalActions() {
        return Object.keys(this.localActions);
    }


    /**
     * @param {string} name
     * @returns {boolean}
     */
    isActionRequired(name) {
        return this.actions.includes(name) || !!this.localActions[name];
    }


    getRequiredSingletons() {
        return [...this.singletons];
    }
}

module.exports = Service;
