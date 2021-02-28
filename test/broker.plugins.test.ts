import {Plugin, Broker} from '../src';

describe('Plugins for actions', () => {
    it('should throw if plugin requires unknown singleton', async () => {
        expect(
            () =>
                new Broker({
                    plugins: {
                        p1: {
                            singletons: ['s0'],
                            start() {
                                return () => {};
                            },
                        },
                    },
                    actions: {
                        a1: {
                            plugins: {
                                p1: {ok: 1},
                            },
                            fn() {},
                        },
                    },
                    services: {
                        first: {
                            actions: ['a1'],
                            start() {},
                        },
                    },
                }),
        ).toThrow(/requires unknown singleton/);
    });

    it('should throw if actions required unknown plugin', async () => {
        expect(
            () =>
                new Broker({
                    actions: {
                        a1: {
                            plugins: {
                                p1: {ok: 1},
                            },
                            fn() {},
                        },
                    },
                    services: {
                        first: {
                            actions: ['a1'],
                            start() {},
                        },
                    },
                }),
        ).toThrow(/tries to configure unknown plugin/);
    });

    it('should throw if plugin requires not included singleton', async () => {
        const broker = new Broker({
            singletons: {
                s0: {
                    start() {
                        return {ok: 5};
                    },
                },
            },
            plugins: {
                p1: {
                    singletons: ['s0'],
                    start() {
                        return () => {};
                    },
                },
            },
            actions: {
                a1: {
                    plugins: {
                        p1: {ok: 1},
                    },
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

        await expect(broker.startService('first')).rejects.toThrow(/requires not included singleton/);
    });

    it('should init plugin for local action', async () => {
        const broker = new Broker({
            plugins: {
                p1: {
                    singletons: ['s1'],
                    start({singletons: {s1}}) {
                        return params => ({params, s1});
                    },
                },
                p2: new Plugin({
                    start() {
                        return params => ({params});
                    },
                }),
            },
            singletons: {
                s1: {
                    start() {
                        return {ok: 1};
                    },
                },
            },
            actions: {
                makeGood: {
                    plugins: {
                        p1: {key: 'value'},
                        p2: {value: 'key'},
                    },
                    fn({plugins: {p1, p2}}) {
                        return () => ({p1, p2});
                    },
                },
                makeBad: {
                    plugins: {
                        p1: {key: 'value2'},
                    },
                    fn({plugins: {p1}}) {
                        return () => ({p1});
                    },
                },
            },
            services: {
                first: {
                    singletons: ['s1'],
                    actions: ['makeGood', 'makeBad'],
                    start({actions: {makeGood, makeBad}}) {
                        expect(makeGood()).toEqual({
                            p1: {
                                params: {key: 'value'},
                                s1: {ok: 1},
                            },
                            p2: {
                                params: {value: 'key'},
                            },
                        });
                        expect(makeBad()).toEqual({
                            p1: {
                                params: {key: 'value2'},
                                s1: {ok: 1},
                            },
                        });
                    },
                },
            },
        });

        await broker.startService('first');
        await broker.stopService('first');
        await broker.startService('first');
    });
});
