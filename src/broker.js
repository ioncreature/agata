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
    {
        loadFiles,
        isStringArray,
        DEFAULT_SERVICE_TEMPLATE,
        DEFAULT_SERVICE_TEMPLATE_REMOVE,
        DEFAULT_ACTION_TEMPLATE,
        DEFAULT_ACTION_TEMPLATE_REMOVE,
        DEFAULT_SINGLETON_TEMPLATE,
        DEFAULT_SINGLETON_TEMPLATE_REMOVE,
        DEFAULT_PLUGIN_TEMPLATE,
        DEFAULT_PLUGIN_TEMPLATE_REMOVE,
        SERVICE_CREATED,
        SERVICE_LOADED,
        SERVICE_RUNNING,
        SERVICE_STOPPED,
    } = require('./utils'),
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
    constructor({
        singletons,
        actions,
        plugins,
        services,
        singletonsPath,
        actionsPath,
        pluginsPath,
        servicesPath,
    }) {
        this.singletons = {};
        this.actions = {};
        this.plugins = {};
        this.services = {};

        this.servicesPath = servicesPath;
        this.singletonsPath = singletonsPath;
        this.actionsPath = actionsPath;
        this.pluginsPath = pluginsPath;

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

        // load services from fs
        if (this.servicesPath) {
            const files = loadFiles({
                path: this.servicesPath,
                template: DEFAULT_SERVICE_TEMPLATE,
                remove: DEFAULT_SERVICE_TEMPLATE_REMOVE,
            });

            files.forEach(([name, file]) => {
                if (this.services[name])
                    throw new Error(`Service with name "${name}" already exists`);

                this.services[name] = file instanceof Service ? file : new Service(file);
            });
        }

        Object.entries(this.services).forEach(([name, srv]) => {
            Object.entries(srv.localActions).forEach(([actionName, action]) => {
                this.actions[localActionName(name, actionName)] = action;
            });
        });

        // load singletons from fs
        if (this.singletonsPath) {
            const files = loadFiles({
                path: this.singletonsPath,
                template: DEFAULT_SINGLETON_TEMPLATE,
                remove: DEFAULT_SINGLETON_TEMPLATE_REMOVE,
            });

            files.forEach(([name, file]) => {
                if (this.singletons[name])
                    throw new Error(`Singleton with name "${name}" already exists`);

                this.singletons[name] = file instanceof Singleton ? file : new Singleton(file);
            });
        }

        // load plugins from fs
        if (this.pluginsPath) {
            const files = loadFiles({
                path: this.pluginsPath,
                template: DEFAULT_PLUGIN_TEMPLATE,
                remove: DEFAULT_PLUGIN_TEMPLATE_REMOVE,
            });

            files.forEach(([name, file]) => {
                if (this.plugins[name])
                    throw new Error(`Plugin with name "${name}" already exists`);

                this.plugins[name] = file instanceof Plugin ? file : new Plugin(file);
            });
        }

        // load actions from fs
        if (this.actionsPath) {
            const files = loadFiles({
                path: this.actionsPath,
                template: DEFAULT_ACTION_TEMPLATE,
                remove: DEFAULT_ACTION_TEMPLATE_REMOVE,
            });

            files.forEach(([name, file]) => {
                if (this.actions[name])
                    throw new Error(`Action with name "${name}" already exists`);

                this.actions[name] = file instanceof Action ? file : new Action(file);
            });
        }

        Object.entries(this.services).forEach(([name, srv]) => {
            srv.state = SERVICE_CREATED;
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

            action.getRequiredActions().forEach(a => {
                if (!this.actions[a])
                    throw new Error(`Action "${name}" requires unknown action "${a}"`);
            });

            action.getRequiredPlugins().forEach(p => {
                if (!this.plugins[p])
                    throw new Error(`Action "${name}" tries to configure unknown plugin "${p}"`);
            });
        });


        Object.entries(this.plugins).forEach(([name, plugin]) => {
            plugin.getRequiredSingletons().forEach(s => {
                if (!this.singletons[s])
                    throw new Error(`Plugin "${name}" requires unknown singleton "${s}"`);
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

        this.loadService(name);

        const
            singletons = await this.startSingletons(service.dependencies.singletons),
            plugins = await this.startPlugins(service.dependencies.plugins),
            actions = await this.startActions(service.dependencies.actions),
            localActions = await this.startActions(service.dependencies.localActions);

        await service.startHandler({
            singletons: pick(singletons, service.getRequiredSingletons()),
            actions: pick(actions, service.getRequiredActions()),
            plugins,
            localActions,
            state: service.stateData,
        });

        service.state = SERVICE_RUNNING;
    }


    loadService(name) {
        const service = this.getServiceByName(name);

        if (this.isServiceLoaded(name))
            return;

        service.dependencies.singletons = this.sortSingletons(service.getRequiredSingletons());
        service.dependencies.localActions = service.getRequiredLocalActions().map(a => localActionName(name, a));
        service.dependencies.actions = this.sortActions(
            name,
            [...service.getRequiredActions(), ...service.dependencies.localActions],
            service.dependencies.singletons,
        );
        service.dependencies.plugins = this.pickPlugins({
            actions: service.dependencies.actions,
            singletons: service.dependencies.singletons,
        });

        service.state = SERVICE_LOADED;
    }


    async stopService(name) {
        if (!this.isServiceRunning(name))
            return;

        const service = this.getServiceByName(name);
        if (service.stopHandler)
            await service.stopHandler({state: service.stateData});

        const runningServices = this.getRunningServices().filter(n => n !== name);

        const startedSingletons = runningServices.reduce((res, s) => {
            const srv = this.getServiceByName(s);
            srv.dependencies.singletons.forEach(singleton => res.add(singleton));
            return res;
        }, new Set);
        const singletonsToStop = service.dependencies.singletons.filter(s => !startedSingletons.has(s));

        for (const singleton of singletonsToStop) {
            const s = this.singletons[singleton];
            if (s.stop)
                await s.stop({state: s.stateData});
            s.started = false;
        }

        service.state = SERVICE_STOPPED;
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
        return this.getServiceByName(name).state === SERVICE_RUNNING;
    }


    isServiceLoaded(name) {
        return this.getServiceByName(name).state !== SERVICE_CREATED;
    }


    /**
     * @returns {Array<string>}
     */
    getRunningServices() {
        return Object.keys(this.services).filter(name => this.isServiceRunning(name));
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
                singleton.instance = await singleton.start({singletons, state: singleton.stateData});
            }

            result[name] = singleton.instance;
        }

        return result;
    }


    sortActions(serviceName, requiredActions, singletons) {
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
                throw new Error(
                    `Action "${name}" in service "${serviceName}" requires not included singleton(s): ` +
                    `"${notIncluded.join('", "')}". Please add them to service definition`,
                );

            action.getRequiredActions().forEach(a => graph.push([name, a]));
        });

        return sort(graph)
            .reverse()
            .slice(0, -1);

        function getDependencies(name, dependedBy = []) {
            allActions.add(name);

            actions[name].getRequiredActions().forEach(n => {
                if (dependedBy.includes(name))
                    throw new Error(
                        `Found actions circular dependency in service ${serviceName}: ` +
                        `${[...dependedBy, name, n].join(' -> ')}`,
                    );

                getDependencies(n, [...dependedBy, name]);
            });
        }
    }


    async startActions(names) {
        const result = {};

        for (const name of names) {
            const action = this.actions[name];

            action.initializedFn = await this.initAction(name); // todo: race condition here :(

            const realName = name.includes('#') ? name.split('#')[1] : name;
            set(result, realName, action.initializedFn);
        }

        return result;
    }


    async initAction(name) {
        const action = this.actions[name];

        if (action.initializedFn)
            return action.initializedFn;

        const actions = {};
        action.getRequiredActions().forEach(actionName => {
            set(actions, actionName, this.actions[actionName].initializedFn);
        });

        const singletons = {};
        action.getRequiredSingletons().forEach(singletonName => {
            set(singletons, singletonName, this.singletons[singletonName].instance);
        });

        const plugins = {};
        await Promise.all(action.getRequiredPlugins().map(async pluginName => {
            const plugin = this.plugins[pluginName];
            plugins[pluginName] = await plugin.instance(action.getPluginParams(pluginName));
        }));

        const fn = await action.fn({actions, singletons, plugins});

        if (!isFunction(fn))
            throw new Error(`Action "${name}" did not return function`);

        return fn;
    }


    async startPlugins(names) {
        const plugins = {};

        await Promise.all(names.map(async name => {
            const plugin = this.plugins[name];

            if (!plugin.instance) {
                const singletons = plugin.getRequiredSingletons().reduce((res, singletonName) => {
                    res[singletonName] = this.singletons[singletonName].instance;
                    return res;
                }, {});

                plugin.instance = await plugin.start({singletons});
            }

            plugins[name] = plugin.instance;
        }));

        return plugins;
    }


    pickPlugins({actions, singletons, plugins = []}) {
        const names = [...plugins];

        actions.forEach(actionName => {
            const action = this.actions[actionName];
            action.getRequiredPlugins().forEach(pluginName => {
                if (!names.includes(pluginName))
                    names.push(pluginName);
            });
        });

        names.forEach(pluginName => {
            const plugin = this.plugins[pluginName];

            const notIncluded = difference(plugin.getRequiredSingletons(), singletons);
            if (notIncluded.length)
                throw new Error(
                    `Plugin "${pluginName}" requires not included singleton(s): "${notIncluded.join('", "')}". ` +
                    'Please add them to service definition or don\'t use this plugin',
                );
        });

        return names;
    }


    getDependencies() {
        const result = {
            services: {},
            singletons: {},
            actions: {},
            plugins: {},
        };

        const services = Object.keys(this.services);
        services.forEach(name => this.loadService(name));

        services.forEach(name => {
            const service = this.services[name];
            result.services[name] = {
                singletons: [...service.dependencies.singletons],
                actions: [...service.dependencies.actions],
                localActions: [...service.dependencies.localActions],
                plugins: [...service.dependencies.plugins],
            };
        });

        Object.entries(this.singletons).forEach(([name, singleton]) => {
            result.singletons[name] = {
                dependencies: {
                    singletons: singleton.getRequiredSingletons(),
                },
                dependents: {
                    actions: [],
                    singletons: [],
                    plugins: [],
                    services: [],
                },
            };
        });

        Object.entries(this.actions).forEach(([name, action]) => {
            result.actions[name] = {
                dependencies: {
                    singletons: action.getRequiredSingletons(),
                    actions: action.getRequiredActions(),
                    plugins: action.getAllPluginParams(),
                },
                dependents: {
                    actions: [],
                    services: [],
                },
            };
        });

        Object.entries(this.plugins).forEach(([name, plugin]) => {
            result.plugins[name] = {
                dependencies: {
                    singletons: plugin.getRequiredSingletons(),
                },
                dependents: {
                    actions: [],
                },
            };
        });

        // collect dependents
        Object.entries(this.services).forEach(([name, service]) => {
            service.getRequiredSingletons().forEach(s => result.singletons[s].dependents.services.push(name));
            service.getRequiredActions().forEach(a => result.actions[a].dependents.services.push(name));
            service
                .getRequiredLocalActions()
                .forEach(a => result.actions[localActionName(name, a)].dependents.services.push(name));
        });
        Object.entries(this.singletons).forEach(([name, singleton]) => {
            singleton.getRequiredSingletons().forEach(s => result.singletons[s].dependents.singletons.push(name));
        });
        Object.entries(this.plugins).forEach(([name, plugin]) => {
            plugin.getRequiredSingletons().forEach(s => result.singletons[s].dependents.plugins.push(name));
        });
        Object.entries(this.actions).forEach(([name, action]) => {
            action.getRequiredActions().forEach(a => result.actions[a].dependents.actions.push(name));
            action.getRequiredSingletons().forEach(s => result.singletons[s].dependents.actions.push(name));
            action.getRequiredPlugins().forEach(p => result.plugins[p].dependents.actions.push(name));
        });

        return result;
    }

    /**
     * Returns loaded and started dependencies
     * @param {Array<string>} [singletons]
     * @param {Array<string>} [actions]
     * @param {Object} [plugins]
     * @returns {Promise<{singletons, actions}>}
     */
    async start({singletons, actions, plugins}) {
        const pluginsList = Object.keys(plugins || {});
        if (singletons) {
            if (!isStringArray(singletons))
                throw new Error('Parameter "singletons" have to be an array of strings');

            const unknownSingletons = singletons.filter(s => !this.singletons[s]);
            if (unknownSingletons.length)
                throw new Error(`Unknown singletons: ${unknownSingletons.join(', ')}`);
        }

        if (actions) {
            if (!isStringArray(actions))
                throw new Error('Parameter "actions" have to be an array of strings');

            const unknownActions = actions.filter(a => !this.actions[a]);
            if (unknownActions.length)
                throw new Error(`Unknown actions: ${unknownActions.join(', ')}`);
        }

        if (plugins) {
            if (!isObject(plugins))
                throw new Error('Parameter "plugins" have to be an object');

            const unknownPlugins = pluginsList.filter(a => !this.plugins[a]);
            if (unknownPlugins.length)
                throw new Error(`Unknown plugins: ${unknownPlugins.join(', ')}`);
        }

        const
            sortedSingletons = this.sortSingletons(singletons || []),
            sortedActions = this.sortActions('SCRIPT', actions || [], sortedSingletons),
            pluginsNames = this.pickPlugins({
                actions: sortedActions,
                singletons: sortedSingletons,
                plugins: pluginsList,
            });

        const singletonsInstances = await this.startSingletons(sortedSingletons);
        const pluginsInstances = await this.startPlugins(pluginsNames);
        const actionsInstances = await this.startActions(sortedActions);

        const initializedPlugins = {};

        await Promise.all(pluginsList.map(async pluginName => {
            initializedPlugins[pluginName] = await pluginsInstances[pluginName](plugins[pluginName]);
        }));

        return {
            singletons: pick(singletonsInstances, singletons),
            actions: pick(actionsInstances, actions),
            plugins: initializedPlugins,
        };
    }


    /**
     * Returns new action mocked by provided entities.
     * If it requires not provided entities they will be loaded
     * @param {string} name
     * @param {Object} [actions]
     * @param {Object} [singletons]
     * @param {Object} [plugins]
     * @returns {Promise<Function>}
     */
    async mockAction(name, {actions, singletons, plugins}) {
        if (!name)
            throw new Error('Invalid action name');

        const action = this.actions[name];

        if (!action)
            throw new Error(`Unknown action "${name}"`);

        if (actions && !isObject(actions))
            throw new Error('Invalid "actions" parameter');

        if (singletons && !isObject(singletons))
            throw new Error('Invalid "singletons" parameter');

        if (plugins && !isObject(plugins))
            throw new Error('Invalid "plugins" parameter');

        const loadedDeps = await this.start({
            actions: difference(action.getRequiredActions(), Object.keys(actions || {})),
            singletons: difference(action.getRequiredSingletons(), Object.keys(singletons || {})),
            plugins: difference(action.getRequiredPlugins(), Object.keys(plugins || {})).reduce((res, plugin) => {
                res[plugin] = action.getPluginParams(plugin);
                return res;
            }, {}),
        });

        const deps = {
            actions: {...loadedDeps.actions, ...actions},
            singletons: {...loadedDeps.singletons, ...singletons},
            plugins: {...loadedDeps.plugins, ...plugins},
        };

        return action.fn(deps);
    }

}


module.exports = Broker;


function localActionName(service, action) {
    return `${service}#${action}`;
}
