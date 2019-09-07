'use strict';

const
    {Broker, Action, Plugin, Service, Singleton} = require('../index');

describe('Broker Constructor', () => {

    test('Constructor without parameters should throw', () => {
        expect(() => Broker()).toThrow();
    });


    test('Constructor should throw with invalid parameters', () => {
        expect(() => Broker({actions: 1})).toThrow();
        expect(() => Broker({singletons: 1})).toThrow();
        expect(() => Broker({plugins: 1})).toThrow();
        expect(() => Broker({services: 1})).toThrow();

        expect(() => Broker({actions: {test: {}}})).toThrow();
        expect(() => Broker({actions: {test: {fn: 1}}})).toThrow();
        expect(() => Broker({singletons: {test: {}}})).toThrow();
        expect(() => Broker({singletons: {test: {fn: 1}}})).toThrow();

        expect(() => Broker({plugins: {test: {}}})).toThrow();
        expect(() => Broker({plugins: {test: {fn: 2}}})).toThrow();
        expect(() => Broker({services: {test: {}}})).toThrow();
        expect(() => Broker({services: {test: {fn: 2}}})).toThrow();
    });


    test('Constructor should create actions with valid parameters', () => {
        expect(() => Broker({})).not.toThrow();
        expect(() => Broker({actions: {}})).not.toThrow();
        expect(() => Broker({singletons: {}})).not.toThrow();
        expect(() => Broker({plugins: {}})).not.toThrow();
        expect(() => Broker({services: {}})).not.toThrow();
        expect(
            () => Broker({
                singletons: {
                    test1: {start() {}},
                    test2: Singleton({start() {}, singletons: ['test1']}),
                },
                plugins: {
                    xyz: {singletons: ['test1'], onActionLoad() {}},
                    xyz2: Plugin({onActionLoad() {}, singletons: ['test']}),
                },
                actions: {
                    test: {
                        fn() {},
                        plugins: {test: 1},
                        singletons: ['test1', 'test2'],
                        actions: ['ololo'],
                    },
                    test3: Action({fn() {}}),
                },
                services: {
                    one: {
                        actions: ['aaa'],
                        singletons: ['test1'],
                        handlers: {test: {fn() {}}},
                        start() {},
                        stop() {},
                    },
                    two: Service({start() {}}),
                },
            })
        ).not.toThrow();
    });
});


describe('Service start', () => {

    test('Start simple service', async() => {
        let started = false;
        const broker = Broker({
            services: {
                first: {
                    start() {
                        started = true;
                    },
                },
            },
        });

        await broker.startService('first');
        expect(started).toBe(true);
        expect(broker.isServiceRunning('first')).toBe(true);
    });


    test('Broker throws if service depends on unknown singleton', () => {
        expect(() => Broker({
            services: {
                first: {
                    singletons: ['s1'],
                    start() {},
                },
            },
        })).toThrow();

        expect(() => Broker({
            singletons: {
                s1: {start() {}},
            },
            services: {
                first: {
                    singletons: ['s2'],
                    start() {},
                },
            },
        })).toThrow();
    });


    test('Start service with one singleton', async() => {
        let serviceStarted = false,
            singletonStarted = false;

        const broker = Broker({
            singletons: {
                s1: {
                    start() {
                        singletonStarted = true;
                    },
                },
            },
            services: {
                first: {
                    singletons: ['s1'],
                    start() {
                        serviceStarted = true;
                    },
                },
            },
        });

        await broker.startService('first');
        expect(singletonStarted).toBe(true);
        expect(serviceStarted).toBe(true);
    });
});
