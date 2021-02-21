import {EventEmitter} from 'events';
import {difference, isFunction, isObject, isString, merge, pick, set} from 'lodash';
import * as sort from 'toposort';
import {
    DEFAULT_ACTION_TEMPLATE,
    DEFAULT_ACTION_TEMPLATE_REMOVE,
    DEFAULT_PLUGIN_TEMPLATE,
    DEFAULT_PLUGIN_TEMPLATE_REMOVE,
    DEFAULT_SERVICE_TEMPLATE,
    DEFAULT_SERVICE_TEMPLATE_REMOVE,
    DEFAULT_SINGLETON_TEMPLATE,
    DEFAULT_SINGLETON_TEMPLATE_REMOVE,
    isStringArray,
    loadFiles,
} from './utils';
import {IService, Service, ServiceState} from './service';
import {ISingleton, Singleton, SingletonState} from './singleton';
import {Action, ActionsMap, IAction} from './action';
import {IPlugin, Plugin} from './plugin';

export interface IBroker {
    singletons?: Record<string, Singleton | ISingleton>;
    actions?: Record<string, Action | IAction>;
    plugins?: Record<string, Plugin | IPlugin>;
    services?: Record<string, Service | IService>;
    singletonsPath: string;
    actionsPath: string;
    pluginsPath: string;
    servicesPath: string;
}

/**
 * Dependencies broker
 */
export class Broker extends EventEmitter {
    private readonly singletons: Record<string, Singleton>;
    private readonly actions: Record<string, Action>;
    private readonly plugins: Record<string, Plugin>;
    private readonly services: Record<string, Service>;

    private readonly servicesPath: string;
    private readonly singletonsPath: string;
    private readonly actionsPath: string;
    private readonly pluginsPath: string;

    constructor({
        singletons,
        actions,
        plugins,
        services,
        singletonsPath,
        actionsPath,
        pluginsPath,
        servicesPath,
    }: IBroker) {
        super();

        this.singletons = {};
        this.actions = {};
        this.plugins = {};
        this.services = {};

        this.servicesPath = servicesPath;
        this.singletonsPath = singletonsPath;
        this.actionsPath = actionsPath;
        this.pluginsPath = pluginsPath;

        if (singletons) {
            if (!isObject(singletons)) {
                throw new Error('Parameter "singletons" have to be an object');
            }

            Object.values(singletons).forEach(s => s instanceof Singleton || Singleton.validateConfig(s));
            this.singletons = Object.entries(singletons).reduce((res, [name, s]) => {
                res[name] = s instanceof Singleton ? s : new Singleton(s);
                return res;
            }, {});
        }

        if (actions) {
            if (!isObject(actions)) {
                throw new Error('Parameter "actions" have to be an object');
            }

            Object.values(actions).forEach(a => a instanceof Action || Action.validateConfig(a));
            this.actions = Object.entries(actions).reduce((res, [name, a]) => {
                res[name] = a instanceof Action ? a : new Action(a);
                return res;
            }, {});
        }

        if (plugins) {
            if (!isObject(plugins)) {
                throw new Error('Parameter "plugins" have to be an object');
            }

            Object.values(plugins).forEach(p => p instanceof Plugin || Plugin.validateConfig(p));
            this.plugins = Object.entries(plugins).reduce((res, [name, p]) => {
                res[name] = p instanceof Plugin ? p : new Plugin(p);
                return res;
            }, {});
        }

        if (services) {
            if (!isObject(services)) {
                throw new Error('Parameter "services" have to be an object');
            }

            Object.values(services).forEach(s => s instanceof Service || Service.validateConfig(s));
            this.services = Object.entries(services).reduce((res, [name, s]) => {
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
                if (this.services[name]) {
                    throw new Error(`Service with name "${name}" already exists`);
                }

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
                if (this.singletons[name]) throw new Error(`Singleton with name "${name}" already exists`);

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
                if (this.plugins[name]) throw new Error(`Plugin with name "${name}" already exists`);

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
                if (this.actions[name]) throw new Error(`Action with name "${name}" already exists`);

                this.actions[name] = file instanceof Action ? file : new Action(file);
            });
        }

        Object.entries(this.services).forEach(([name, srv]) => {
            srv.state = ServiceState.created;
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
                if (!this.singletons[s]) throw new Error(`Singleton "${name}" requires unknown singleton "${s}"`);
            });
        });

        Object.entries(this.actions).forEach(([name, action]) => {
            action.getRequiredSingletons().forEach(s => {
                if (!this.singletons[s]) throw new Error(`Action "${name}" requires unknown singleton "${s}"`);
            });

            action.getRequiredActions().forEach(a => {
                if (!this.actions[a]) throw new Error(`Action "${name}" requires unknown action "${a}"`);
            });

            action.getRequiredPlugins().forEach(p => {
                if (!this.plugins[p]) throw new Error(`Action "${name}" tries to configure unknown plugin "${p}"`);
            });
        });

        Object.entries(this.plugins).forEach(([name, plugin]) => {
            plugin.getRequiredSingletons().forEach(s => {
                if (!this.singletons[s]) throw new Error(`Plugin "${name}" requires unknown singleton "${s}"`);
            });
        });
    }

    async startService(name): Promise<void> {
        const service = this.getServiceByName(name);

        if (this.isServiceRunning(name)) {
            return;
        }

        this.emit('service-starting', name);
        this.loadService(name);

        const singletons = await this.startSingletons(service.dependencies.singletons),
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
        this.emit('service-started', name);

        service.state = ServiceState.running;
    }

    loadService(name) {
        const service = this.getServiceByName(name);

        if (this.isServiceLoaded(name)) {
            return;
        }

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

        service.state = ServiceState.loaded;
    }

    async stopService(name) {
        if (!this.isServiceRunning(name)) return;

        this.emit('service-stopping', name);
        const service = this.getServiceByName(name);
        if (service.stopHandler) await service.stopHandler({state: service.stateData});
        this.emit('service-stopped', name);

        const runningServices = this.getRunningServices().filter(n => n !== name);

        const startedSingletons = runningServices.reduce((res, s) => {
            const srv = this.getServiceByName(s);
            srv.dependencies.singletons.forEach(singleton => res.add(singleton));
            return res;
        }, new Set());
        const singletonsToStop = service.dependencies.singletons.filter(s => !startedSingletons.has(s));

        for (const singleton of singletonsToStop) {
            const s = this.singletons[singleton];
            if (s.isLoading()) throw new Error(`Singleton "${singleton}" cannot be stopped because it is starting`);
            this.emit('singleton-stopping', singleton);
            if (s.stop && s.isLoaded()) {
                s.state = SingletonState.unloading;
                await s.stop({state: s.stateData});
            }
            s.state = SingletonState.initial;
            this.emit('singleton-stopped', singleton);
        }

        service.state = ServiceState.stopped;
    }

    async stopAll() {
        const runningServices = this.getRunningServices();
        await Promise.all(
            runningServices.map(async name => {
                const service = this.getServiceByName(name);
                this.emit('service-stopping', name);
                if (service.stopHandler) {
                    await service.stopHandler({state: service.stateData});
                }
                this.emit('service-stopped', name);
            }),
        );
        const sortedSingletons = this.sortSingletons(Object.keys(this.singletons)).reverse();

        for (const singletonName of sortedSingletons) {
            const singleton = this.singletons[singletonName];
            this.emit('singleton-stopping', singletonName);
            if (singleton.stop && (singleton.isLoaded() || singleton.isLoading())) {
                await singleton.promise;
                singleton.state = SingletonState.unloading;
                await singleton.stop({state: singleton.stateData});
            }
            this.emit('singleton-stopped', singletonName);
            singleton.state = SingletonState.initial;
        }
    }

    getServiceByName(name: string): Service {
        if (!isString(name)) {
            throw new Error('Parameter "name" have to be a string');
        }

        const srv = this.services[name];

        if (!srv) {
            throw new Error(`Service with name "${name}" not found`);
        }

        return srv;
    }

    isServiceRunning(name: string) {
        return this.getServiceByName(name).state === ServiceState.running;
    }

    isServiceLoaded(name: string) {
        return this.getServiceByName(name).state !== ServiceState.created;
    }

    getRunningServices(): string[] {
        return Object.keys(this.services).filter(name => this.isServiceRunning(name));
    }

    sortSingletons(requiredSingletons: string[]): string[] {
        const singletons = this.singletons,
            serviceNode = Symbol('service-singleton'),
            graph = requiredSingletons.map(i => [serviceNode, i]),
            allSingletons = new Set(requiredSingletons);

        requiredSingletons.forEach(name => getDependencies(name));

        allSingletons.forEach(name => {
            singletons[name].getRequiredSingletons().forEach(n => graph.push([name, n]));
        });

        return sort(graph).reverse().slice(0, -1);

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

            if (singleton.isInit()) {
                singleton.state = SingletonState.loading;
                this.emit('singleton-starting', name);
                const singletons = singleton.getRequiredSingletons().reduce((res, n) => {
                    set(res, n, this.singletons[n].instance);
                    return res;
                }, {});
                singleton.promise = singleton.start({singletons, state: singleton.stateData});
                singleton.instance = await singleton.promise;
                singleton.state = SingletonState.loaded;
                this.emit('singleton-started', name);
            } else if (singleton.isLoading()) {
                await singleton.promise;
            } else if (singleton.isUnloading()) {
                throw new Error(`Cannot start singleton "${name}" because it is stopping now`);
            }

            set(result, name, singleton.instance);
        }

        return result;
    }

    sortActions(serviceName: string, requiredActions: string[], singletons: string[]): string[] {
        const actions = this.actions,
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

        return sort(graph).reverse().slice(0, -1);

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

    async startActions(names: string[]): Promise<ActionsMap> {
        const result = {};

        for (const name of names) {
            const action = this.actions[name];

            action.initializedFn = await this.initAction(name); // todo: fix race condition here :(

            const realName = name.includes('#') ? name.split('#')[1] : name;
            set(result, realName, action.initializedFn);
        }

        return result;
    }

    async initAction(name) {
        const action = this.actions[name];

        if (action.initializedFn) {
            return action.initializedFn;
        }

        this.emit('action-starting', name);
        const actions = {};
        action.getRequiredActions().forEach(actionName => {
            set(actions, actionName, this.actions[actionName].initializedFn);
        });

        const singletons = {};
        action.getRequiredSingletons().forEach(singletonName => {
            set(singletons, singletonName, this.singletons[singletonName].instance);
        });

        const plugins = {};
        await Promise.all(
            action.getRequiredPlugins().map(async pluginName => {
                const plugin = this.plugins[pluginName];
                set(plugins, pluginName, await plugin.instance(action.getPluginParams(pluginName)));
            }),
        );

        const fn = await action.fn({actions, singletons, plugins});

        if (!isFunction(fn)) {
            throw new Error(`Action "${name}" did not return function`);
        }

        this.emit('action-started', name);

        return fn;
    }

    async startPlugins(names) {
        const plugins = {};

        await Promise.all(
            names.map(async name => {
                const plugin = this.plugins[name];

                if (!plugin.instance) {
                    // todo: fix race condition here :(
                    const singletons = plugin.getRequiredSingletons().reduce((res, singletonName) => {
                        res[singletonName] = this.singletons[singletonName].instance;
                        return res;
                    }, {});

                    this.emit('plugin-starting', name);
                    plugin.instance = await plugin.start({singletons});

                    if (typeof plugin.instance !== 'function'){
                        throw new Error('Plugins "start" method has to return a function');
                    }
                    this.emit('plugin-started', name);
                }

                set(plugins, name, plugin.instance);
            }),
        );

        return plugins;
    }

    pickPlugins({actions, singletons, plugins = []}) {
        const names = [...plugins];

        actions.forEach(actionName => {
            const action = this.actions[actionName];
            action.getRequiredPlugins().forEach(pluginName => {
                if (!names.includes(pluginName)) names.push(pluginName);
            });
        });

        names.forEach(pluginName => {
            const plugin = this.plugins[pluginName];

            const notIncluded = difference(plugin.getRequiredSingletons(), singletons);
            if (notIncluded.length)
                throw new Error(
                    `Plugin "${pluginName}" requires not included singleton(s): "${notIncluded.join('", "')}". ` +
                        'Please add them to service definition or do not use this plugin',
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
     * @returns {Promise<{singletons, actions, plugins}>}
     */
    async start({singletons, actions, plugins}) {
        const pluginsList = Object.keys(plugins || {});
        if (singletons) {
            if (!isStringArray(singletons)) throw new Error('Parameter "singletons" have to be an array of strings');

            const unknownSingletons = singletons.filter(s => !this.singletons[s]);
            if (unknownSingletons.length) throw new Error(`Unknown singletons: ${unknownSingletons.join(', ')}`);
        }

        if (actions) {
            if (!isStringArray(actions)) throw new Error('Parameter "actions" have to be an array of strings');

            const unknownActions = actions.filter(a => !this.actions[a]);
            if (unknownActions.length) throw new Error(`Unknown actions: ${unknownActions.join(', ')}`);
        }

        if (plugins) {
            if (!isObject(plugins)) throw new Error('Parameter "plugins" have to be an object');

            const unknownPlugins = pluginsList.filter(a => !this.plugins[a]);
            if (unknownPlugins.length) throw new Error(`Unknown plugins: ${unknownPlugins.join(', ')}`);
        }

        const sortedSingletons = this.sortSingletons(singletons || []),
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

        await Promise.all(
            pluginsList.map(async pluginName => {
                initializedPlugins[pluginName] = await pluginsInstances[pluginName](plugins[pluginName]);
            }),
        );

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
     * @param {Object<string, Function>} [actions] map of full name to Action function
     * @param {Object<string, Any>} [singletons] map of full name to Singleton value
     * @param {Object<string, Function>} [plugins] map of full name to Plugin value
     * @returns {Promise<Function>}
     */
    async mockAction(
        name: string,
        {
            actions,
            singletons,
            plugins,
        }: {
            actions?: Record<string, Action | IAction>;
            singletons: Record<string, Singleton | ISingleton>;
            plugins: Record<string, Plugin | IPlugin>;
        },
    ): Promise<Function> {
        if (!name) {
            throw new Error('Invalid action name');
        }

        const action = this.actions[name];

        if (!action) {
            throw new Error(`Unknown action "${name}"`);
        }

        if (actions && !isObject(actions)) {
            throw new Error('Invalid "actions" parameter');
        }

        if (singletons && !isObject(singletons)) {
            throw new Error('Invalid "singletons" parameter');
        }

        if (plugins && !isObject(plugins)) {
            throw new Error('Invalid "plugins" parameter');
        }

        const loadedDeps = await this.start({
            actions: difference(action.getRequiredActions(), Object.keys(actions || {})),
            singletons: difference(action.getRequiredSingletons(), Object.keys(singletons || {})),
            plugins: difference(action.getRequiredPlugins(), Object.keys(plugins || {})).reduce((res, plugin) => {
                res[plugin] = action.getPluginParams(plugin);
                return res;
            }, {}),
        });

        const deps = {
            actions: merge({}, loadedDeps.actions, actions),
            singletons: merge({}, loadedDeps.singletons, singletons),
            plugins: merge({}, loadedDeps.plugins, plugins),
        };

        return action.fn(deps);
    }
}

function localActionName(service: string, action: string): string {
    return `${service}#${action}`;
}
