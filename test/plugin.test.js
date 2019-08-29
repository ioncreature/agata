'use strict';

const
    {Plugin} = require('../index');

describe('Plugin constructor', () => {

    test('Constructor throw with invalid parameters', () => {
        expect(() => Plugin()).toThrow();
        expect(() => Plugin({})).toThrow();
        expect(() => Plugin({onActionLoad: 1})).toThrow();
        expect(() => Plugin({onActionLoad() {}, singletons: 1})).toThrow();
        expect(() => Plugin({onActionLoad() {}, singletons: ['test', 1]})).toThrow();
    });


    test('Constructor should create singleton if parameters are valid', () => {
        expect(() => Plugin({onActionLoad() {}})).not.toThrow();
        expect(() => Plugin({onActionLoad() {}, singletons: ['test', 'best']})).not.toThrow();
    });

});
