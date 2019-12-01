'use strict';

const
    {Broker} = require('../index');


describe('Broker#mockAction()', () => {


    it.each([
        [undefined, undefined],
        [1, ''],
        ['123', undefined],
        ['123', {actions: 1}],
        ['123', {singletons: 1}],
        ['123', {plugins: 1}],
    ])(
        'should throw on invalid params, path: %p %p',
        async(name, params) => {
            const broker = Broker({});
            await expect(broker.mockAction(name, params)).rejects.toThrow();
        },
    );

    it('should throw if action is unknown', () => {
        const broker = Broker({});

        expect(() => broker.mockAction('a', {})).toThrow();
    });
});
