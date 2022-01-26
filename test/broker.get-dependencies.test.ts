import { Broker } from '../src';

describe('Broker#getDependencies()', () => {
  it('should return only one service in dependency tree', () => {
    const broker = new Broker({
      services: {
        first: { start() {} },
      },
    });

    expect(broker.getDependencies()).toEqual({
      services: {
        first: {
          singletons: [],
          actions: [],
          localActions: [],
          plugins: [],
        },
      },
      actions: {},
      singletons: {},
      plugins: {},
    });
  });

  it('should return only service with singleton, action and plugin', () => {
    const broker = new Broker({
      singletons: {
        singleton1: { start() {} },
      },
      actions: {
        action1: {
          singletons: ['singleton1'],
          fn: () => () => {},
        },
      },
      services: {
        service1: {
          singletons: ['singleton1'],
          actions: ['action1'],
          start() {},
        },
      },
    });

    expect(broker.getDependencies()).toEqual({
      services: {
        service1: {
          singletons: ['singleton1'],
          actions: ['action1'],
          localActions: [],
          plugins: [],
        },
      },
      actions: {
        action1: {
          dependencies: {
            singletons: ['singleton1'],
            actions: [],
            plugins: {},
          },
          dependents: {
            actions: [],
            services: ['service1'],
          },
        },
      },
      singletons: {
        singleton1: {
          dependencies: {
            singletons: [],
          },
          dependents: {
            actions: ['action1'],
            singletons: [],
            plugins: [],
            services: ['service1'],
          },
        },
      },
      plugins: {},
    });
  });

  it('should return complex dependency tree', async () => {
    const broker = new Broker({
      singletons: {
        redis: {
          start() {},
        },
        cache: {
          singletons: ['redis'],
          start() {},
        },
        postgres: {
          singletons: ['cache'],
          start() {},
        },
      },
      plugins: {
        publisher: {
          // let's suppose that we are implementing communication between services with redis pubsub
          singletons: ['redis'],
          start() {
            return () => {};
          },
        },
        subscriber: {
          singletons: ['redis'],
          start() {
            return () => {};
          },
        },
      },
      actions: {
        'some.doA': {
          singletons: ['cache'],
          fn: () => () => {},
        },
        'some.doB': {
          actions: ['some.doA'],
          fn: () => () => {},
        },
        'some.doC': {
          singletons: ['postgres'],
          plugins: {
            subscriber: { channel: 'createC' },
          },
          actions: ['some.doB'],
          fn: () => () => {},
        },
        noop: {
          fn: () => () => {},
        },
      },
      services: {
        serviceA: {
          singletons: ['postgres'],
          actions: ['some.doC'],
          localActions: {
            localActionA: {
              singletons: ['cache'],
              actions: ['noop'],
              plugins: {
                subscriber: { channel: 'createC' },
              },
              fn: () => () => {},
            },
          },
          start() {},
          stop() {},
        },
        serviceB: {
          singletons: ['postgres', 'redis'],
          localActions: {
            localActionB: {
              plugins: {
                subscriber: { channel: 'createC' },
              },
              fn: () => () => {},
            },
            localActionC: {
              actions: ['some.doC'],
              plugins: {
                publisher: { channel: 'createC' },
              },
              fn: () => () => {},
            },
          },
          start() {},
        },
      },
    });

    const deps = broker.getDependencies();
    expect(deps.services.serviceB).toEqual({
      singletons: ['redis', 'cache', 'postgres'],
      plugins: ['subscriber', 'publisher'],
      actions: [
        'some.doA',
        'some.doB',
        'some.doC',
        'serviceB#localActionC',
        'serviceB#localActionB',
      ],
      localActions: ['serviceB#localActionB', 'serviceB#localActionC'],
    });

    expect(deps.plugins.subscriber).toEqual({
      dependencies: {
        singletons: ['redis'],
      },
      dependents: {
        actions: ['some.doC', 'serviceA#localActionA', 'serviceB#localActionB'],
      },
    });

    expect(deps.singletons.redis).toEqual({
      dependencies: {
        singletons: [],
      },
      dependents: {
        actions: [],
        plugins: ['publisher', 'subscriber'],
        services: ['serviceB'],
        singletons: ['cache'],
      },
    });

    expect(deps.actions['some.doC']).toEqual({
      dependencies: {
        actions: ['some.doB'],
        singletons: ['postgres'],
        plugins: {
          subscriber: { channel: 'createC' },
        },
      },
      dependents: {
        actions: ['serviceB#localActionC'],
        services: ['serviceA'],
      },
    });

    expect(deps.actions.noop).toEqual({
      dependencies: {
        actions: [],
        singletons: [],
        plugins: {},
      },
      dependents: {
        actions: ['serviceA#localActionA'],
        services: [],
      },
    });
  });
});
