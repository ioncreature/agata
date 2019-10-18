'use strict';

const
    {Broker} = require('../index');


describe('Broker#getDependencies()', () => {

    it('should return only one service in dependency tree', () => {
        const broker = Broker({
            services: {
                first: {start() {}},
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
        const broker = Broker({
            singletons: {
                singleton1: {start() {}},
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


    it('should return complex dependency tree', async() => {
        const broker = Broker({
            singletons: {
                config: {
                    start() {},
                },
                redis: {
                    singletons: ['config'],
                    start() {},
                },
                subscriber: {
                    singletons: ['redis'],
                    start() {},
                },
                publisher: {
                    singletons: ['redis'],
                    start() {},
                },
                cache: {
                    singletons: ['redis'],
                    start() {},
                },
                postgres: {
                    singletons: ['config', 'cache'],
                    start() {},
                },
            },
            actions: {
                'users.getById': {
                    singletons: ['postgres'],
                    fn: () => () => {},
                },
                'goods.getById': {
                    singletons: ['postgres'],
                    fn: () => () => {},
                },
                'goods.getByCategory': {
                    singletons: ['postgres'],
                    fn: () => () => {},
                },
                'goods.getCategories': {
                    singletons: ['postgres'],
                    fn: () => () => {},
                },
                'order.create': {
                    singletons: ['postgres'],
                    fn: () => () => {},
                },
            },
            services: {
                auth: {
                    singletons: ['postgres'],
                    localActions: {
                        authorizeUser: {
                            singletons: ['postgres'],
                            actions: ['user.getById'],
                            fn: () => () => {},
                        },
                    },
                    start() {},
                },
                catalog: {
                    singletons: ['postgres', 'subscriber', 'cache'],
                    localActions: {
                        createOrder: {
                            fn: () => () => {},
                        },
                    },
                    start({singletons: {subscriber}, localActions: {createOrder}}) {
                        subscriber.on('create-order', createOrder);
                    },
                    stop() {},
                },
                telegramBot: {
                    singletons: ['postgres', 'publisher'],
                    localActions: {
                        verify: {
                            actions: ['users.getById'],
                            fn: () => () => {},
                        },
                        createOrder: {
                            plugins: {
                                publisher: {
                                    channel: 'create-order',
                                    params: {
                                        userId: 'string',
                                        goods: ['string'],
                                    },
                                },
                            },
                            actions: ['users.getById'],
                            fn: () => () => {},
                        },
                    },
                    start() {},
                },
            },
        });

        expect(broker.getDependencies()).toEqual({

        });
    });

});
