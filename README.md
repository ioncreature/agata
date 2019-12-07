# Agata - The microservice framework
Hybrid* dependency injection framework for server-side applications
 
[![Build Status](https://travis-ci.org/ioncreature/agata.svg?branch=master)](https://travis-ci.org/ioncreature/agata)
[![Coverage Status](https://coveralls.io/repos/github/ioncreature/agata/badge.svg?branch=master)](https://coveralls.io/github/ioncreature/agata?branch=master)

`Hybrid` here means that it got best parts both from microservices and monoliths

There was few main points to create this framework

### Precise dependency tracking
Every dependency described declaratively and gathered before service start

So it is possible to build dependency trees, check what does service use, 
automatically build documentation, and etc.

### Get any business logic locally instead of calling other microservice   
The idea here is not to make redundant communications between microservices.

### Test every piece of code
Everything could be easily tested - actions, singletons, plugins and whole services.
Having DI makes mocking easy


## Terminology

`Action` is any function which executes some business logic. They are shared, so any actions or service could use it. 
It can depends on other actions, singletons and plugins.

`Singleton` is any object which you need to share. 
It can depends only on other singletons.

`Plugin` is a parametrized singleton. Plugins parameters are shown on Broker#getDependencies() call.
Plugins can depends on singletons only.

`Service` is a service :)
It can depends on actions and singletons, also it could have it local action.

`Broker` is an object which rules them.


## Examples

For complex example which uses most of framework features take a look at [example-with-agata](https://github.com/ioncreature/example-with-agata) 


### Service without dependencies
```javascript
const {Broker} = require('agata');

const broker = Broker({
    services: {
        serviceOne: {
            start({state}) {
                console.log('Service started');
                state.interval = setInterval(() => console.log('Hello!'), 1000);
            },
            stop({state}) {
                clearInterval(state.interval);
                console.log('Bye!');
            },
        },
    },
});

broker
    .startService('serviceOne')
    .then(() => {
        setTimeout(() => broker.stopService('serviceOne'), 3000);    
    });
```


### No services, only actions

In this example we load action `makeItGreatAgain` with all its dependencies and run it.

```javascript
const {Broker} = require('agata');

const broker = Broker({
    singletons: {
        postgres: {
            async start({state}) {
                state.connection = await createPostgresConnection();
                return state.connection;
            },
            async stop({state}) {
                await state.connection.stop();
            },  
        },
    },
    actions: {
        makeItGreat: {
            singletons: ['postgres'],
            fn({singletons: {postgres}}) {
                return async value => {
                    postgres.addSome(value);
                };
            },
        },
        makeItGreatAgain: {
            actions: ['makeItGreat'],
            fn({actions: {makeItGreat}}) {
                return async () => makeItGreat(1e100);
            },
        },
    },
});

const makeItGreatAgain = await broker.start({actions: ['makeItGreatAgain']});
makeItGreatAgain()
    .then(() => console.log('done'))
    .catch(e => console.log('not this time', e));
```


## Test actions

Broker can mock any actions dependency - other action, plugins and singletons. 
So it is possible to run action fully or partially mocked 

```javascript
// some-action.js
exports.actions = ['doThis', 'doThat'];
exports.plugins = {httpRequest: {url: 'https://google.com'}};
exports.singletons = ['redis', 'statistics'];

exports.fn = ({actions: {doThis}, plugins: {httpRequest}, singletons: {statistics}}) => {
    return async parameter => {
        statistics.inc();
        return doThis(await httpRequest());
    };
};

//some-action.test.js
const mockedAction = await broker.mockAction('doThis', {
    actions: {doThis: () => 1},
    plugins: {httpRequest() {}},
    singletons: {statistics: {inc() {}}},
});

// we mocked every dependency, so now action is under full control and totally useless :)
expect(mockedAction()).toEqual(1);
```
It is possible to mock some of dependencies, in such case not mocked dependencies are loaded


## Service Lifecycle

- Load 
  - broker
  - service
  - singletons
  - plugins
  - actions
- Start
  - singletons
  - plugins
  - actions
  - service
- Stop
  - singletons
  - service
