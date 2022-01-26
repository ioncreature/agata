import { intersection, isFunction, isObject } from 'lodash';
import {
  DEFAULT_ACTION_TEMPLATE,
  DEFAULT_ACTION_TEMPLATE_REMOVE,
  isStringArray,
  loadFiles,
} from './utils';
import { Action, IAction } from './action';

export enum ServiceState {
  created = 'created',
  loaded = 'loaded',
  running = 'running',
  stopped = 'stopped',
}

export interface IServiceDependencies {
  singletons?: any;
  actions?: any;
  localActions?: any;
}

export interface IService {
  start: Function;
  stop?: Function;
  singletons?: string[];
  actions?: string[];
  localActions?: Record<string, IAction | Action>;
  localActionsPath?: string;
  localActionsTemplate?: string;
}

export class Service {
  static validateConfig({ start, stop, singletons, actions, localActions }: Partial<IService>) {
    if (!isFunction(start)) {
      throw new Error('Service parameter "start" have to be a function');
    }

    if (stop && !isFunction(stop)) {
      throw new Error('Service parameter "stop" have to be a function');
    }

    if (singletons && !isStringArray(singletons)) {
      throw new Error('Service parameter "singletons" have to be an array of strings');
    }

    if (actions && !isStringArray(actions)) {
      throw new Error('Service parameter "actions" have to be an array of strings');
    }

    if (localActions) {
      if (!isObject(localActions)) {
        throw new Error('Service parameter "localActions" have to be an object');
      }

      if (actions) {
        const namesIntersection = intersection(actions, Object.keys(localActions));
        if (namesIntersection.length)
          throw new Error(
            `There are names intersection between actions and local actions: ${namesIntersection}`,
          );
      }

      Object.values(localActions).forEach(
        a => a instanceof Action || Action.validateConfig(a as IAction),
      );
    }
  }

  actions: string[];
  localActions: object;
  singletons: string[];
  state: string;
  startHandler: Function;
  stopHandler: Function;
  dependencies: {
    singletons: string[];
    actions: string[];
    plugins: string[];
    localActions: string[];
  };
  stateData: object;

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
  }: IService) {
    Service.validateConfig({ start, stop, singletons, actions, localActions });

    this.dependencies = {
      singletons: [],
      actions: [],
      plugins: [],
      localActions: [],
    };
    this.actions = actions || [];
    this.singletons = singletons || [];
    this.localActions = {};
    this.startHandler = start;
    this.stopHandler = stop;
    this.stateData = {};

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

  getRequiredActions(): string[] {
    return [...this.actions];
  }

  getRequiredLocalActions(): string[] {
    return Object.keys(this.localActions);
  }

  isActionRequired(name: string): boolean {
    return this.actions.includes(name) || !!this.localActions[name];
  }

  getRequiredSingletons(): string[] {
    return [...this.singletons];
  }
}
