import { Broker } from '../src';

describe('Broker#run()', () => {
  it('should load without dependencies', async () => {
    const broker = new Broker({});

    expect(await broker.start({})).toEqual({ actions: {}, singletons: {}, plugins: {} });
  });

  it('should throw on unknown singletons', async () => {
    const broker = new Broker({});

    await expect(broker.start({ singletons: ['oops'] })).rejects.toThrow('Unknown singleton');
  });

  it('should throw on unknown actions', async () => {
    const broker = new Broker({});

    await expect(broker.start({ actions: ['oops'] })).rejects.toThrow('Unknown action');
  });

  it('should throw on unknown plugins', async () => {
    const broker = new Broker({});

    await expect(broker.start({ plugins: { oops: 1 } })).rejects.toThrow('Unknown plugin');
  });

  it('should load singleton', async () => {
    const broker = new Broker({
      singletons: {
        one: {
          start() {
            return { ok: 7 };
          },
        },
      },
    });

    expect(await broker.start({ singletons: ['one'] })).toEqual({
      actions: {},
      singletons: { one: { ok: 7 } },
      plugins: {},
    });
  });

  it('should load plugin', async () => {
    const broker = new Broker({
      plugins: {
        one: {
          start() {
            return p => ({ ok: p });
          },
        },
      },
    });

    expect(await broker.start({ plugins: { one: 10 } })).toEqual({
      actions: {},
      singletons: {},
      plugins: { one: { ok: 10 } },
    });
  });

  it('should load action and run', async () => {
    const broker = new Broker({
      actions: {
        doIt: {
          fn: () => () => ({ ok: 3 }),
        },
        'andPlease.doThat': {
          fn: () => () => ({ ok: 5 }),
        },
      },
    });

    const dependencies = await broker.start({ actions: ['doIt', 'andPlease.doThat'] });
    expect(dependencies.actions.doIt()).toEqual({ ok: 3 });
    expect(dependencies.actions.andPlease.doThat()).toEqual({ ok: 3 });
  });

  it('should load actions and singletons and run them twice', async () => {
    const broker = new Broker({
      plugins: {
        some: {
          singletons: ['one'],
          start({ singletons: { one } }) {
            return p => one + p;
          },
        },
      },
      actions: {
        doIt: {
          fn: () => () => 1,
        },
        doThat: {
          singletons: ['two'],
          actions: ['doIt'],
          plugins: {
            some: 9,
          },
          fn:
            ({ plugins: { some } }) =>
            () =>
              some + 3,
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

    const dependencies1 = await broker.start({ singletons: ['one'], actions: ['doIt'] });
    expect(dependencies1.singletons).toEqual({ one: 5 });
    expect(dependencies1.actions.doIt()).toEqual(1);

    const dependencies2 = await broker.start({
      singletons: ['two'],
      actions: ['doThat'],
      plugins: { some: 10 },
    });
    expect(dependencies2.singletons).toEqual({ two: 7 });
    expect(dependencies2.plugins.some).toEqual(15);
    expect(dependencies2.actions.doThat()).toEqual(17);
  });
});
