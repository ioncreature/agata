'use strict';

const
    {Plugin, Broker} = require('../index');


describe('Plugins for actions', () => {

    it('should throw if plugin requires unknown singleton', async() => {
        expect(() => Broker({
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
        })).toThrow(/requires unknown singleton/);
    });


    it('should init plugin for local action', async() => {
        const broker = Broker({
            plugins: {
                p1: {
                    singletons: ['s1'],
                    start({singletons: {s1}}) {
                        return params => ({params, s1});
                    },
                },
                p2: Plugin({
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
            },
            services: {
                first: {
                    singletons: ['s1'],
                    actions: ['makeGood'],
                    start({actions: {makeGood}}) {
                        expect(makeGood()).toEqual({
                            p1: {
                                params: {key: 'value'},
                                s1: {ok: 1},
                            },
                            p2: {
                                params: {value: 'key'},
                            },
                        });
                    },
                },
            },
        });

        await broker.startService('first');
    });

});
