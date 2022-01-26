import { Singleton } from '../../src';

export default new Singleton({
  start() {
    return { one: 1 };
  },
});
