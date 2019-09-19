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


    test('Constructor should create broker with valid parameters', () => {
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
                        actions: ['test3'],
                    },
                    test3: Action({fn() {}}),
                },
                services: {
                    one: {
                        actions: ['test'],
                        singletons: ['test1'],
                        handlers: {test5: {fn() {}}},
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


describe('Service singletons', () => {

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


    test('Broker throws if singleton depends on unknown singleton', () => {
        expect(() => Broker({
            singletons: {
                s1: {
                    singletons: ['fakeOne'],
                    start() {},
                },
            },
            services: {
                first: {
                    singletons: ['s1'],
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


    test('Start singletons once if few services starts in one process', async() => {
        let runs = 0;

        const broker = Broker({
            singletons: {
                s1: {
                    start() {
                        runs++;
                    },
                },
            },
            services: {
                srv1: {
                    singletons: ['s1'],
                    start() {},
                },
                srv2: {
                    singletons: ['s1'],
                    start() {},
                },
            },
        });

        await broker.startService('srv1');
        await broker.startService('srv2');
        expect(runs).toEqual(1);
    });


    test('Service throws if there a cyclic dependency', () => {
        const broker = Broker({
            singletons: {
                s0: {
                    singletons: ['s1'],
                    start() {},
                },
                s1: {
                    singletons: ['s0'],
                    start() {},
                },
            },
            services: {
                first: {
                    singletons: ['s1'],
                    start() {},
                },
            },
        });

        expect(broker.startService('first')).rejects.toThrow();
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
                    singletons: ['s0'],
                    start({singletons: {s0}}) {
                        expect(s0).toEqual({ok: 0});
                        return {ok: 1};
                    },
                },
                s2: {
                    singletons: ['s1'],
                    start({singletons: {s1}}) {
                        expect(s1).toEqual({ok: 1});
                        return {ok: 2};
                    },
                },
                s3: {
                    singletons: ['s2'],
                    start({singletons: {s2}}) {
                        expect(s2).toEqual({ok: 2});
                        return {ok: 3};
                    },
                },
                s4: {
                    singletons: ['s2', 's3'],
                    start({singletons: {s0, s1, s2, s3}}) {
                        expect(s0).toEqual(undefined);
                        expect(s1).toEqual(undefined);
                        expect(s2).toEqual({ok: 2});
                        expect(s3).toEqual({ok: 3});
                        return {ok: 4};
                    },
                },
            },
            services: {
                first: {
                    singletons: ['s4'],
                    start({singletons: {s0, s1, s2, s3, s4}}) {
                        expect(s0).toBe(undefined);
                        expect(s1).toBe(undefined);
                        expect(s2).toBe(undefined);
                        expect(s3).toBe(undefined);
                        expect(s4).toEqual({ok: 4});
                    },
                },
            },
        });

        await broker.startService('first');
    });
});


describe('Service actions', () => {

    it('should throw if action requires unknown singleton', async() => {
        expect(() => Broker({
            actions: {
                a1: {
                    singletons: ['s0'],
                    fn() {},
                },
            },
            services: {
                first: {
                    actions: ['a1'],
                    start() {},
                },
            },
        })).toThrow();
    });


    it('should throw if action requires not included singleton', async() => {
        const broker = Broker({
            singletons: {
                s0: {start() {}},
                s1: {start() {}},
            },
            actions: {
                a1: {
                    singletons: ['s0', 's1'],
                    fn() {},
                },
            },
            services: {
                first: {
                    actions: ['a1'],
                    start() {},
                },
            },
        });

        await expect(broker.startService('first')).rejects.toThrow();
    });


    it('throws on unknown actions', () => {
        expect(() => Broker({
            services: {
                first: {
                    actions: ['a1'],
                    start() {},
                },
            },
        })).toThrow();
    });


    it('should load service with one action', async() => {
        const broker = Broker({
            actions: {
                add: {
                    fn() {
                        return (a, b) => a + b;
                    },
                },
            },
            services: {
                first: {
                    actions: ['add'],
                    start({actions: {add}}) {
                        expect(add).toEqual(expect.any(Function));
                        expect(add(5, 7)).toEqual(12);
                    },
                },
            },
        });

        await broker.startService('first');
    });


    it('should throw if loaded action does not return function', async() => {
        const broker = Broker({
            actions: {
                oops: {
                    fn() {
                        return 'oops';
                    },
                },
            },
            services: {
                first: {
                    actions: ['oops'],
                    start() {},
                },
            },
        });

        await expect(broker.startService('first')).rejects.toThrow();
    });


    it('should throw if there is circular dependency in actions', async() => {
        const broker = Broker({
            actions: {
                a1: {
                    actions: ['a2'],
                    fn() {
                        return () => {};
                    },
                },
                a2: {
                    actions: ['a3'],
                    fn() {
                        return () => {};
                    },
                },
                a3: {
                    actions: ['a1'],
                    fn() {
                        return () => {};
                    },
                },
            },
            services: {
                first: {
                    actions: ['a1'],
                    start() {},
                },
            },
        });

        await expect(broker.startService('first')).rejects.toThrow();
    });


    it('should load actions and singletons', async() => {
        const broker = Broker({
            singletons: {
                s1: {
                    singletons: ['s2'],
                    start({singletons: {s2}}) {
                        expect(s2).toEqual({two: 2});
                        return {one: 1};
                    },
                },
                s2: {
                    start() {
                        return {two: 2};
                    },
                },
            },
            actions: {
                inc2: {
                    actions: ['inc'],
                    fn({actions: {inc}}) {
                        return a => inc(inc(a));
                    },
                },
                inc: {
                    singletons: ['s1'],
                    actions: ['add'],
                    fn({singletons: {s1}, actions: {add}}) {
                        return a => add(a, s1.one);
                    },
                },
                dec: {
                    actions: ['add'],
                    fn({actions: {add}}) {
                        return a => add(a, -1);
                    },
                },
                add: {
                    fn() {
                        return (a, b) => a + b;
                    },
                },
            },
            services: {
                first: {
                    singletons: ['s1'],
                    actions: ['inc2', 'dec'],
                    async start({actions: {inc, inc2, dec, add}, singletons: {s1, s2}}) {
                        expect(s1).toEqual({one: 1});
                        expect(inc2(3)).toBe(5);
                        expect(dec(5)).toBe(4);

                        expect(inc).toBe(undefined);
                        expect(add).toBe(undefined);
                        expect(s2).toBe(undefined);
                    },
                },
            },
        });

        await broker.startService('first');
    });


    it('should initialize action once even if there is more than one service in one process', async() => {
        const init = {inc: 0, add: 0};

        const broker = Broker({
            actions: {
                inc: {
                    actions: ['add'],
                    fn({actions: {add}}) {
                        init.inc++;
                        return a => add(a, 1);
                    },
                },
                add: {
                    fn() {
                        init.add++;
                        return (a, b) => a + b;
                    },
                },
            },
            services: {
                first: {
                    actions: ['inc'],
                    async start({actions: {inc, add}}) {
                        expect(inc(6)).toBe(7);
                        expect(add).toBe(undefined);
                    },
                },
                second: {
                    actions: ['add'],
                    async start({actions: {inc, add}}) {
                        expect(add(3, 4)).toBe(7);
                        expect(inc).toBe(undefined);
                    },
                },
            },
        });

        await broker.startService('first');
        await broker.startService('second');
        expect(init).toEqual({inc: 1, add: 1});
    });

});


describe('Service handlers', () => {

    it('should start service with handlers', async() => {
        const broker = Broker({
            services: {
                first: {
                    handlers: {
                        get5: {
                            fn() {
                                return () => 5;
                            },
                        },
                    },
                    start({handlers: {get5}}) {
                        expect(get5()).toEqual(5);
                    },
                },
            },
        });

        await broker.startService('first');
    });

});


describe('Stop service', () => {

    it('should stop service with no singletons', async() => {
        let i = 0;

        const broker = Broker({
            services: {
                first: {
                    start() {
                        i = 100;
                    },
                    stop() {
                        i = -1;
                    },
                },
            },
        });

        await broker.startService('first');
        expect(i).toEqual(100);
        await broker.stopService('first');
        expect(i).toEqual(-1);
        await broker.startService('first');
        expect(i).toEqual(100);
        await broker.stopService('first');
        expect(i).toEqual(-1);
    });


    it('should stop service with singletons', async() => {
        let
            srv = 'init',
            sng = 'init';

        const broker = Broker({
            singletons: {
                s1: {
                    start() {
                        sng = 'started';
                    },
                    stop() {
                        sng = 'stopped';
                    },
                },
            },
            services: {
                first: {
                    singletons: ['s1'],
                    start() {
                        srv = 'started';
                    },
                    stop() {
                        srv = 'stopped';
                    },
                },
            },
        });
        await broker.startService('first');
        expect(srv).toBe('started');
        expect(sng).toBe('started');
        await broker.stopService('first');
        expect(srv).toBe('stopped');
        expect(sng).toBe('stopped');
        await broker.startService('first');
        expect(srv).toBe('started');
        expect(sng).toBe('started');
        await broker.stopService('first');
        expect(srv).toBe('stopped');
        expect(sng).toBe('stopped');
    });


    it('should stop service once even if .stopHandler() called more than once', async() => {
        let stops = 0;

        const broker = Broker({
            singletons: {
                s1: {
                    start() {},
                    stop() {
                        stops++;
                    },
                },
            },
            services: {
                first: {
                    singletons: ['s1'],
                    start() {},
                },
            },
        });

        await broker.startService('first');
        await broker.stopService('first');
        expect(stops).toBe(1);
        await broker.stopService('first');
        expect(stops).toBe(1);
        await broker.startService('first');
        await broker.stopService('first');
        expect(stops).toBe(2);
    });

});
