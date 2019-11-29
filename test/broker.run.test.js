'use strict';

const
    {Broker} = require('../index');


describe('Broker#run()', () => {

    it.each([
        [undefined, undefined],
        [{}, undefined],
        [1, () => {}],
        [{}, 1],
        [{singletons: 1}, 1],
        [{actions: 1}, 1],
        [{singletons: {}, actions: 1}, 1],
        [{singletons: 1, actions: {}}, 1],
    ])(
        'should throw on invalid params, path: %p %p',
        async(params, handler) => {
            const broker = Broker({});

            await expect(broker.run(params, handler)).rejects.toThrow('Parameter');
        },
    );


    it('should run script without dependencies', async() => {
        const broker = Broker({});

        expect(await broker.run({}, () => 17)).toEqual(17);
    });


    it('should throw on unknown singletons', async() => {
        const broker = Broker({});

        await expect(broker.run({singletons: ['oops']}, () => 11)).rejects.toThrow('Unknown singleton');
    });


    it('should throw on unknown actions', async() => {
        const broker = Broker({});

        await expect(broker.run({actions: ['oops']}, () => 5)).rejects.toThrow('Unknown action');
    });


    it('should load singleton and run', async() => {
        const broker = Broker({
            singletons: {
                one: {
                    start() {
                        return {ok: 7};
                    },
                },
            },
        });

        expect(
            await broker.run({singletons: ['one']}, ({singletons: {one}}) => one),
        ).toEqual({ok: 7});
    });


    it('should load action and run', async() => {
        const broker = Broker({
            actions: {
                doIt: {
                    fn: () => () => ({ok: 3}),
                },
            },
        });

        expect(
            await broker.run({actions: ['doIt']}, ({actions: {doIt}}) => doIt()),
        ).toEqual({ok: 3});
    });


    it('should load actions and singletons and run them twice', async() => {
        const broker = Broker({
            actions: {
                doIt: {
                    fn: () => () => 1,
                },
                doThat: {
                    singletons: ['two'],
                    actions: ['doIt'],
                    fn: () => () => 3,
                },
            },
            singletons: {
                one: {
                    start: () => 5,
                },
                two: {
                    singletons: ['one'],
                    start: () => 7,
                },
            },
        });

        const res1 = await broker.run(
            {singletons: ['one'], actions: ['doIt']},
            ({singletons: {one}, actions: {doIt}}) => ({one, doIt: doIt()}),
        );
        expect(res1).toEqual({one: 5, doIt: 1});

        const res2 = await broker.run(
            {singletons: ['two'], actions: ['doThat']},
            ({singletons: {two}, actions: {doThat}}) => ({two, doThat: doThat()}),
        );
        expect(res2).toEqual({two: 7, doThat: 3});
    });

});
