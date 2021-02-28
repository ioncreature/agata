import {Broker} from '../src';

describe('Service singletons', () => {
    test('Broker throws if service depends on unknown singleton', () => {
        expect(
            () =>
                new Broker({
                    services: {
                        first: {
                            singletons: ['s1'],
                            start() {},
                        },
                    },
                }),
        ).toThrow();

        expect(
            () =>
                new Broker({
                    singletons: {
                        s1: {start() {}},
                    },
                    services: {
                        first: {
                            singletons: ['s2'],
                            start() {},
                        },
                    },
                }),
        ).toThrow();
    });

    test('Broker throws if singleton depends on unknown singleton', () => {
        expect(
            () =>
                new Broker({
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
                }),
        ).toThrow();
    });

    test('Start service with one singleton', async () => {
        let serviceStarted = false,
            singletonStarted = false;

        const broker = new Broker({
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

    test('Start singletons once if few services starts in one process', async () => {
        let runs = 0;

        const broker = new Broker({
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

    test('Service throws if there is a cyclic dependency', () => {
        const broker = new Broker({
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

        expect(broker.startService('first')).rejects.toThrow(/singletons circular dependency/);
    });

    test('Start service with singletons depended on other singletons', async () => {
        const broker = new Broker({
            singletons: {
                's0.s0': {
                    start() {
                        return {ok: 0};
                    },
                },
                s1: {
                    singletons: ['s0.s0'],
                    start({
                        singletons: {
                            s0: {s0},
                        },
                    }) {
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
