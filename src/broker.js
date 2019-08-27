'use strict';


const
    Service = require('./service'),
    {isObject, isString} = require('lodash');


const
    SINGLETONS_PATH = 'src/singleton',
    ACTIONS_PATH = 'src/action',
    PLUGINS_PATH = 'src/plugin',
    SERVICES_PATH = 'src/service';


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
    constructor({singletonsPath, actionsPath, pluginsPath, servicesPath, singletons, actions, plugins, services}) {
        this.singletonsPath = singletonsPath || SINGLETONS_PATH;
        this.actionsPath = actionsPath || ACTIONS_PATH;
        this.pluginsPath = pluginsPath || PLUGINS_PATH;
        this.servicesPath = servicesPath || SERVICES_PATH;

        if (singletons) {
            validateSingletons();
            this.singletons = singletons;
        }

        if (actions) {
            validateActions();
            this.actions = actions;
        }

        if (plugins) {
            validatePlugins(plugins);
            this.plugins = plugins;
        }

        if (services) {
            validateServices(services);
            this.services = services;
        }
    }


    /**
     * Starts microservice
     * @param {string|Service} service
     * @returns {Promise<void>}
     */
    async runService(service) {
        let srv;

        if (isString(service))
            srv = this.getServiceByName(service);
        else if (service instanceof Service)
            srv = service;
        else
            throw new Error('Parameter "service" have to be a string or instance of Service class');

        if (srv.isRunning())
            return;

        const registry = await prepareRegistry(service);

        await srv.start(registry);
    }


    /**
     * Stops service
     * @param {string|Service} service
     * @returns {Promise<void>}
     */
    async stopService(service) {}


    /**
     * @param {string|Service} script
     * @returns {Promise<void>}
     */
    async runScript(script) {}


    async stopAll() {}


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
}

module.exports = Broker;


function validateSingletons(singletons) {
    if (!isObject(singletons))
        throw new Error('Parameter "singletons" have to be an object');

    // todo: add validations
}


function validateActions(actions) {
    if (!isObject(actions))
        throw new Error('Parameter "actions" have to be an object');

    // todo: add validations
}


function validatePlugins(plugins) {
    if (!isObject(plugins))
        throw new Error('Parameter "plugins" have to be an object');

    // todo: add validations
}


function validateServices(services) {
    if (!isObject(services))
        throw new Error('Parameter "services" have to be an object');

    // todo: add validations
}
