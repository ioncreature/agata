import { Action } from '../../src';

export default new Action({
  actions: ['getOne'],

  fn({ actions: { getOne } }) {
    return () => getOne() + getOne();
  },
});
