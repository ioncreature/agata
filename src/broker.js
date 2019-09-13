'use strict';


const
    {
        difference,
        isFunction,
        isObject,
        isString,
        pick,
        set,
    } = require('lodash'),
    sort = require('toposort'),
    Service = require('./service'),
    Singleton = require('./singleton'),
    Action = require('./action'),
    Plugin = require('./plugin');


/**
 * Dependencies broker
 */
class Broker {

    /**
     * @param {string} [singletonsPath]
     * @param {string} [actionsPath]
     * @param {string} [pluginsPath]
     * @param {string} [servicesPath]
     * @param {Object} [singletons]
     * @param {Object} [actions]
     * @param {Object} [plugins]
     * @param {Object} [services]
     */
    constructor({singletons, actions, plugins, services, singletonsPath, actionsPath, pluginsPath, servicesPath}) {
        this.singletons = {};
        this.actions = {};
        this.plugins = {};
        this.services = {};

        this.singletonsPath = singletonsPath;
        this.actionsPath = actionsPath;
        this.pluginsPath = pluginsPath;
        this.servicesPath = servicesPath;

        if (singletons) {
            if (!isObject(singletons))
                throw new Error('Parameter "singletons" have to be an object');

            Object.values(singletons).forEach(s => s instanceof Singleton || Singleton.validateConfig(s));
            this.singletons = Object
                .entries(singletons)
                .reduce((res, [name, s]) => {
                    res[name] = s instanceof Singleton ? s : new Singleton(s);
                    return res;
                }, {});
        }

        if (actions) {
            if (!isObject(actions))
                throw new Error('Parameter "actions" have to be an object');

            Object.values(actions).forEach(a => a instanceof Action || Action.validateConfig(a));
            this.actions = Object
                .entries(actions)
                .reduce((res, [name, a]) => {
                    res[name] = a instanceof Action ? a : new Action(a);
                    return res;
                }, {});
        }

        if (plugins) {
            if (!isObject(plugins))
                throw new Error('Parameter "plugins" have to be an object');

            Object.values(plugins).forEach(a => a instanceof Plugin || Plugin.validateConfig(a));
            this.plugins = Object
                .entries(plugins)
                .reduce((res, [name, p]) => {
                    res[name] = p instanceof Plugin ? p : new Plugin(p);
                    return res;
                }, {});
        }

        if (services) {
            if (!isObject(services))
                throw new Error('Parameter "services" have to be an object');

            Object.values(services).forEach(s => s instanceof Service || Service.validateConfig(s));
            this.services = Object
                .entries(services)
                .reduce((res, [name, s]) => {
                    res[name] = s instanceof Service ? s : new Service(s);
                    return res;
                }, {});
        }

        // load everything from fs if it is provided
        // if (this.singletonsPath) {}
        // if (this.actionsPath) {}
        // if (this.pluginsPath) {}
        // if (this.servicesPath) {}

        // check for dependencies
        Object.entries(this.services).forEach(([name, srv]) => {
            srv.getRequiredSingletons().forEach(singleton => {
                if (!this.singletons[singleton])
                    throw new Error(`Service "${name}" requires unknown singleton "${singleton}"`);
            });

            srv.getRequiredActions().forEach(action => {
                if (!action.startsWith('#') && !this.actions[action])
                    throw new Error(`Service "${name}" requires unknown action "${action}"`);
            });
        });

        Object.entries(this.singletons).forEach(([name, singleton]) => {
            singleton.getRequiredSingletons().forEach(s => {
                if (!this.singletons[s])
                    throw new Error(`Singleton "${name}" requires unknown singleton "${s}"`);
            });
        });

        Object.entries(this.actions).forEach(([name, action]) => {
            action.getRequiredSingletons().forEach(s => {
                if (!this.singletons[s])
                    throw new Error(`Action "${name}" requires unknown singleton "${s}"`);
            });
        });
    }


    /**
     * Starts microservice
     * @param {string} name
     * @returns {Promise<void>}
     */
    async startService(name) {
        const service = this.getServiceByName(name);

        if (this.isServiceRunning(name))
            return;

        this.services[name].isRunning = true;

        const orderedSingletons = this.sortSingletons(service.getRequiredSingletons());
        const orderedActions = this.sortActions(service.getRequiredActions(), orderedSingletons);

        const singletons = await this.startSingletons(orderedSingletons);
        const actions = await this.startActions(orderedActions);

        await service.startHandler({
            singletons: pick(singletons, service.getRequiredSingletons()),
            actions: pick(actions, service.getRequiredActions()),
        });
    }


    /**
     * @param {string} name
     * @returns {Service}
     */
    getServiceByName(name) {
        if (!isString(name))
            throw new Error('Parameter "name" have to be a string');

        const srv = this.services[name];

        if (!srv)
            throw new Error(`Service with name "${name}" not found`);

        return srv;
    }


    /**
     * @param {string} name
     * @returns {boolean}
     */
    isServiceRunning(name) {
        return !!this.services[name].isRunning;
    }


    /**
     * @param {Array<string>} requiredSingletons
     * @throws
     * @returns {Array<string>}
     */
    sortSingletons(requiredSingletons) {
        const
            singletons = this.singletons,
            serviceNode = Symbol('service-singleton'),
            graph = requiredSingletons.map(i => [serviceNode, i]),
            allSingletons = new Set(requiredSingletons);

        requiredSingletons.forEach(name => getDependencies(name));

        allSingletons.forEach(name => {
            singletons[name].getRequiredSingletons().forEach(n => graph.push([name, n]));
        });

        return sort(graph)
            .reverse()
            .slice(0, -1);

        function getDependencies(name, dependedBy = []) {
            allSingletons.add(name);

            singletons[name].getRequiredSingletons().forEach(n => {
                if (dependedBy.includes(name))
                    throw new Error(`Found singletons circular dependency: ${[...dependedBy, name, n].join(' -> ')}`);

                getDependencies(n, [...dependedBy, name]);
            });
        }
    }


    async startSingletons(names) {
        const result = {};

        for (const name of names) {
            const singleton = this.singletons[name];

            if (!singleton.started) {
                const singletons = singleton.getRequiredSingletons().reduce((res, n) => {
                    res[n] = this.singletons[n].instance;
                    return res;
                }, {});
                singleton.started = true;
                singleton.instance = await singleton.start({singletons});
            }

            result[name] = singleton.instance;
        }

        return result;
    }


    sortActions(requiredActions, singletons) {
        const
            actions = this.actions,
            allActions = new Set(requiredActions),
            serviceNode = Symbol('service-action'),
            graph = requiredActions.map(i => [serviceNode, i]);

        requiredActions.forEach(name => getDependencies(name));

        allActions.forEach(name => {
            const action = actions[name];

            const notIncluded = difference(action.getRequiredSingletons(), singletons);
            if (notIncluded.length)
                throw new Error(`Action "${name}" requires not included singleton(s): "${notIncluded.join('", "')}"`);

            action.getRequiredActions().forEach(a => graph.push([name, a]));

        });

        return sort(graph)
            .reverse()
            .slice(0, -1);

        function getDependencies(name, dependedBy = []) {
            allActions.add(name);

            actions[name].getRequiredActions().forEach(n => {
                if (dependedBy.includes(name))
                    throw new Error(`Found actions circular dependency: ${[...dependedBy, name, n].join(' -> ')}`);

                getDependencies(n, [...dependedBy, name]);
            });
        }

    }


    async startActions(names) {
        const result = {};

        for (const name of names) {
            const action = this.actions[name];

            if (action.initializedFn)
                return;

            const actions = {};
            action.getRequiredActions().forEach(actionName => {
                set(actions, actionName, this.actions[actionName].initializedFn);
            });

            const singletons = {};
            action.getRequiredSingletons().forEach(singletonName => {
                set(singletons, singletonName, this.singletons[singletonName].instance);
            });

            action.initializedFn = await action.fn({actions, singletons});

            if (!isFunction(action.initializedFn))
                throw new Error(`Action "${name}" did not return function`);

            set(result, name, action.initializedFn);
        }

        return result;
    }

}


module.exports = Broker;
