import {cloneDeep, isFunction, isObject} from 'lodash';
import {isStringArray} from './utils';

export type ActionsRecord = Record<string, Action>;

export type ActionsMap = Record<string, Action | ActionsRecord>;

export interface IActionDependencies {
    actions?: ActionsMap;
    singletons?: any;
    plugins?: any;
}

export interface IAction {
    fn: (IActionDependencies?) => any;
    singletons?: string[];
    actions?: string[];
    plugins?: Record<string, any>;
}

/**
 * Action is business logic unit with described dependencies - other actions, singletons, and plugins
 * Action is shared across all services
 */
export class Action {
    static validateConfig({singletons, actions, plugins, fn}: Partial<IAction>) {
        if (!isFunction(fn)) {
            throw new Error('Action parameter "fn" have to be a function');
        }
        if (singletons && !isStringArray(singletons)) {
            throw new Error('Action parameter "singletons" have to be an array of strings');
        }
        if (actions && !isStringArray(actions)) {
            throw new Error('Action parameter "actions" have to be an array of strings');
        }
        if (plugins && !isObject(plugins)) {
            throw new Error('Action parameter "plugins" have to be an object');
        }
    }

    private readonly singletons: string[];
    private readonly actions: string[];
    private readonly plugins: Record<string, any>;
    fn: Function;
    initializedFn: Function;

    constructor({singletons, actions, plugins, fn}: IAction) {
        Action.validateConfig({singletons, actions, plugins, fn});

        this.singletons = singletons || [];
        this.actions = actions || [];
        this.plugins = plugins || {};
        this.fn = fn;
    }

    getRequiredActions() {
        return [...this.actions];
    }

    getRequiredSingletons() {
        return [...this.singletons];
    }

    getRequiredPlugins() {
        return Object.keys(this.plugins);
    }

    getPluginParams(name) {
        return this.plugins[name] && cloneDeep(this.plugins[name]);
    }

    getAllPluginParams() {
        return cloneDeep(this.plugins);
    }
}
