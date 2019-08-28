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
    singletons: [],

    async start({singletons}) {},
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

    async fn({singletons: {postgres}, actions, plugins}) {
        return async userId => {
            const user = await actions.user.getById(userId);
            return await postgres.User.getFriends(user);
        };
    },
});


// handlers dir
// <.>/service/<name>/handler/getFriends.js
module.exports = Agata.Handler({
    singletons: ['postgres'],
    actions: ['user.getFriends'],

    // imagine this is http handler
    async fn({singletons, actions}) {
        return (res, req, next) => {
            const id = req.params.id;
            actions.user
                .getFriends(id)
                .then(req.json)
                .catch(next);
        };
    },
});

// scripts
const broker = require('../src/broker');
broker
    .startScript({
        singletons: [],
        actions: [],
        async start({singletons, actions}) {},
    })
    .then(() => console.log('script done'))
    .catch(e => console.error('script error', e));

