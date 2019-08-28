'use strict';

const
    {Action, Handler} = require('../index');

describe('Action constructor', () => {
    test('Constructor should throw without parameters', () => {
        expect(() => Action()).toThrow();
        expect(() => Handler()).toThrow();
    });
});
