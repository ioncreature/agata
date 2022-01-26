import { Broker } from '../src';

describe('Services start and stop', () => {
  test('Start simple service', async () => {
    let started = false;
    const broker = new Broker({
      services: {
        first: {
          start() {
            started = true;
          },
        },
      },
    });

    await broker.startService('first');
    expect(started).toBe(true);
    expect(broker.isServiceRunning('first')).toBe(true);
  });

  test('Start service once', async () => {
    let started = 0;
    const broker = new Broker({
      services: {
        first: {
          start() {
            started++;
          },
        },
      },
    });

    await broker.startService('first');
    expect(started).toBe(1);
    expect(broker.isServiceRunning('first')).toBe(true);
    await broker.startService('first');
    expect(started).toBe(1);
  });

  test('Service state is passed to start and stop', async () => {
    const broker = new Broker({
      services: {
        first: {
          start({ state }) {
            expect(state).toEqual({});
            state.hello = 'world';
          },
          stop({ state }) {
            expect(state).toEqual({ hello: 'world' });
          },
        },
      },
    });

    await broker.startService('first');
    await broker.stopService('first');
  });

  test('Singleton state is passed to start and stop', async () => {
    const broker = new Broker({
      singletons: {
        s1: {
          start({ state }) {
            expect(state).toEqual({});
            state.hello = 's1';
          },
          stop({ state }) {
            expect(state).toEqual({ hello: 's1' });
          },
        },
      },
      services: {
        first: {
          singletons: ['s1'],
          start() {},
        },
      },
    });

    await broker.startService('first');
    await broker.stopService('first');
  });

  it('should stop service with no singletons', async () => {
    let i = 0;

    const broker = new Broker({
      services: {
        first: {
          start() {
            i = 100;
          },
          stop() {
            i = -1;
          },
        },
      },
    });

    await broker.startService('first');
    expect(i).toEqual(100);
    await broker.stopService('first');
    expect(i).toEqual(-1);
    await broker.startService('first');
    expect(i).toEqual(100);
    await broker.stopService('first');
    expect(i).toEqual(-1);
  });

  it('should stop service with singletons', async () => {
    let srv = 'init',
      sng = 'init';

    const broker = new Broker({
      singletons: {
        s1: {
          start() {
            sng = 'started';
          },
          stop() {
            sng = 'stopped';
          },
        },
      },
      services: {
        first: {
          singletons: ['s1'],
          start() {
            srv = 'started';
          },
          stop() {
            srv = 'stopped';
          },
        },
      },
    });
    await broker.startService('first');
    expect(srv).toBe('started');
    expect(sng).toBe('started');
    await broker.stopService('first');
    expect(srv).toBe('stopped');
    expect(sng).toBe('stopped');
    await broker.startService('first');
    expect(srv).toBe('started');
    expect(sng).toBe('started');
    await broker.stopService('first');
    expect(srv).toBe('stopped');
    expect(sng).toBe('stopped');
  });

  it('should stop service once even if .stopHandler() called more than once', async () => {
    let stops = 0;

    const broker = new Broker({
      singletons: {
        s1: {
          start() {},
          stop() {
            stops++;
          },
        },
      },
      services: {
        first: {
          singletons: ['s1'],
          start() {},
        },
      },
    });

    await broker.startService('first');
    await broker.stopService('first');
    expect(stops).toBe(1);
    await broker.stopService('first');
    expect(stops).toBe(1);
    await broker.startService('first');
    await broker.stopService('first');
    expect(stops).toBe(2);
  });

  it('should stop singletons which are not in use', async () => {
    const state = {
      s1: 'init',
      s2: 'init',
      s3: 'init',
      s4: 'init',
    };

    const broker = new Broker({
      singletons: {
        s1: {
          start() {
            state.s1 = 'started';
          },
          stop() {
            state.s1 = 'stopped';
          },
        },
        s2: {
          start() {
            state.s2 = 'started';
          },
          stop() {
            state.s2 = 'stopped';
          },
        },
        s3: {
          singletons: ['s4'],
          start() {
            state.s3 = 'started';
          },
          stop() {
            state.s3 = 'stopped';
          },
        },
        s4: {
          start() {
            state.s4 = 'started';
          },
          stop() {
            state.s4 = 'stopped';
          },
        },
      },
      services: {
        first: {
          singletons: ['s1', 's3'],
          start() {},
          stop() {},
        },
        second: {
          singletons: ['s2', 's4'],
          start() {},
          stop() {},
        },
      },
    });

    await broker.startService('first');
    await broker.startService('second');
    expect(state).toEqual({ s1: 'started', s2: 'started', s3: 'started', s4: 'started' });

    await broker.stopService('first');
    expect(state).toEqual({ s1: 'stopped', s2: 'started', s3: 'stopped', s4: 'started' });

    await broker.startService('first');
    expect(state).toEqual({ s1: 'started', s2: 'started', s3: 'started', s4: 'started' });

    await broker.stopService('second');
    expect(state).toEqual({ s1: 'started', s2: 'stopped', s3: 'started', s4: 'started' });

    await broker.startService('second');
    expect(state).toEqual({ s1: 'started', s2: 'started', s3: 'started', s4: 'started' });

    await broker.stopService('first');
    await broker.stopService('second');
    expect(state).toEqual({ s1: 'stopped', s2: 'stopped', s3: 'stopped', s4: 'stopped' });

    await broker.startService('first');
    await broker.startService('second');
    expect(state).toEqual({ s1: 'started', s2: 'started', s3: 'started', s4: 'started' });
    await broker.stopAll();
    expect(state).toEqual({ s1: 'stopped', s2: 'stopped', s3: 'stopped', s4: 'stopped' });
  });
});
