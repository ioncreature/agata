'use strict';

const
    {Broker} = require('../index');


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
        })).toThrow(/requires unknown singleton/);
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
