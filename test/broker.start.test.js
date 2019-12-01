'use strict';

const
    {Broker} = require('../index');


describe('Broker#run()', () => {

    it.each([
        [{singletons: 1}],
        [{singletons: 'a'}],
        [{actions: 1}],
        [{singletons: [], actions: 1}],
        [{singletons: 1, actions: []}],
    ])(
        'should throw on invalid params, path: %p',
        async params => {
            const broker = Broker({});
            await expect(broker.start(params)).rejects.toThrow('Parameter');
        },
    );


    it('should load without dependencies', async() => {
        const broker = Broker({});
        expect(await broker.start({})).toEqual({actions: {}, singletons: {}});
    });


    it('should throw on unknown singletons', async() => {
        const broker = Broker({});

        await expect(broker.start({singletons: ['oops']}, () => 11)).rejects.toThrow('Unknown singleton');
    });


    it('should throw on unknown actions', async() => {
        const broker = Broker({});

        await expect(broker.start({actions: ['oops']}, () => 5)).rejects.toThrow('Unknown action');
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

        expect(await broker.start({singletons: ['one']})).toEqual({actions: {}, singletons: {one: {ok: 7}}});
    });


    it('should load action and run', async() => {
        const broker = Broker({
            actions: {
                doIt: {
                    fn: () => () => ({ok: 3}),
                },
            },
        });

        const dependencies = await broker.start({actions: ['doIt']});
        expect(dependencies.actions.doIt()).toEqual({ok: 3});
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

        const dependencies1 = await broker.start({singletons: ['one'], actions: ['doIt']});
        expect(dependencies1.singletons).toEqual({one: 5});
        expect(dependencies1.actions.doIt()).toEqual(1);

        const dependencies2 = await broker.start({singletons: ['two'], actions: ['doThat']});
        expect(dependencies2.singletons).toEqual({two: 7});
        expect(dependencies2.actions.doThat()).toEqual(3);
    });

});
