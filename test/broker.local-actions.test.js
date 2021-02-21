const {Broker} = require('../index');

describe('Service local actions', () => {
    it('should throw if local actions requires unknown action', () => {
        expect(() =>
            Broker({
                services: {
                    first: {
                        localActions: {
                            get5: {
                                actions: ['a'],
                                fn() {
                                    return () => 5;
                                },
                            },
                        },
                        start() {},
                    },
                },
            }),
        ).toThrow(/requires unknown action/);
    });

    it('should start service with local actions', async () => {
        const broker = Broker({
            services: {
                first: {
                    localActions: {
                        get5: {
                            fn() {
                                return () => 5;
                            },
                        },
                    },
                    start({localActions: {get5}}) {
                        expect(get5()).toEqual(5);
                    },
                },
            },
        });

        await broker.startService('first');
    });

    it('should start service with local actions with dependencies', async () => {
        const broker = Broker({
            actions: {
                a1: {
                    fn() {
                        return () => 3;
                    },
                },
                'b.b1': {
                    actions: ['a1'],
                    fn({actions: {a1}}) {
                        return () => a1() + 2;
                    },
                },
            },
            singletons: {
                s1: {
                    start() {
                        return {v: 7};
                    },
                },
            },
            services: {
                first: {
                    localActions: {
                        get5: {
                            actions: ['b.b1'],
                            singletons: ['s1'],
                            fn({actions: {b}, singletons: {s1}}) {
                                expect(b.b1()).toBe(5);
                                expect(s1).toEqual({v: 7});
                                return () => b.b1();
                            },
                        },
                    },
                    singletons: ['s1'],
                    start({localActions: {get5}}) {
                        expect(get5()).toEqual(5);
                    },
                },
            },
        });

        await broker.startService('first');
    });
});
