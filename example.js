'use strict';

/* eslint-disable */

const Agata = require('agata'); // {Broker, Service, Action, Handler, Plugin}

// broker
const broker = Agata.Broker({
    singletonsPath: '',
    actionsPath: '',
    pluginsPath: '',
    servicesPath: '',
});

broker
    .startService('friends')
    .catch(e => {
        console.log(e);
        process.exit(1);
    });


// services dir
// <.>/service/friends/index.js
module.exports = Agata.Service({
    handlersPath: './handlers', // local for service

    singletons: ['postgres', 'statistics', 'log'],
    actions: ['user.getFriends'],
    handlers: [],

    async start({actions, plugins, singletons, handlers}) {},
    async stop() {},
});


// mixins dir
// <.>/singleton/postgres
module.exports = Agata.Singleton({
    singletons: ['log'],

    async start({singletons: {log}}) {
        let i = 0;
        return {
            increase() {
                i++;
                log(`It is ${i} now`);
                return i;
            },
        };
    },
    async stop() {},
});


// actions dir
// <.>/actions/user/getFriends.js
module.exports = Agata.Action({
    singletons: ['postgres'],
    actions: ['user.getById'],
    plugins: {
        httpContract: {
            method: 'GET',
            host: 'example.com',
            url: '/api/user/{id}',
        },
    },

    async fn({singletons: {postgres}, actions: {user: {}}, plugins}) {
        return async userId => {
            const user = await actions.user.getById(userId);
            return await postgres.User.getFriends(user);
        };
    },
});


// scripts
const serviceBroker = require('../src/broker');
serviceBroker
    .startScript({
        singletons: [],
        actions: [],
        async start({singletons, actions}) {},
    })
    .then(() => console.log('script done'))
    .catch(e => console.error('script error', e));

