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


describe('#getServiceByName(name)', () => {

    it('should throw if name invalid', () => {
        const broker = Broker({});
        expect(() => broker.getServiceByName()).toThrow();
        expect(() => broker.getServiceByName(1)).toThrow();
    });


    it('should throw if there is no service with given name', () => {
        const broker = Broker({});
        expect(() => broker.getServiceByName('alala')).toThrow();
    });


    it('should return service if name is existing', () => {
        const
            service = Service({start() {}}),
            broker = Broker({services: {service}});

        expect(broker.getServiceByName('service')).toEqual(service);
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


    test('Start service once', async() => {
        let started = 0;
        const broker = Broker({
            services: {
                first: {
                    start() {
                        started++;
                    },
                },
            },
        });

        await broker.startService('first');
        expect(started).toBe(1);
        expect(broker.isServiceRunning('first')).toBe(true);
        await broker.startService('first');
        expect(started).toBe(1);
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


    test('Start service with singletons depended on other singletons', async() => {
        const broker = Broker({
            singletons: {
                s0: {
                    start() {
                        return {ok: 0};
                    },
                },
                s1: {
                    start() {
                        return {ok: 1};
                    },
                },
                s2: {
                    singletons: ['s0', 's1'],
                    start({singletons: {s0, s1}}) {
                        expect(s0).toEqual({ok: 0});
                        expect(s1).toEqual({ok: 1});
                        return {ok: 2};
                    },
                },
                s3: {
                    singletons: ['s1', 's2'],
                    start({singletons: {s0, s1, s2}}) {
                        expect(s0).toEqual(undefined);
                        expect(s1).toEqual({ok: 1});
                        expect(s2).toEqual({ok: 2});
                        return {ok: 3};
                    },
                },
            },
            services: {
                first: {
                    singletons: ['s3'],
                    start({singletons: {s0, s1, s2, s3}}) {
                        expect(s0).toBe(undefined);
                        expect(s1).toBe(undefined);
                        expect(s2).toBe(undefined);
                        expect(s3).toEqual({ok: 3});
                    },
                },
            },
        });

        await broker.startService('first');
    });
});
