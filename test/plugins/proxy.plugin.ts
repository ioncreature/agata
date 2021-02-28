import {Plugin} from '../../src';

export default new Plugin({
    start() {
        return params => params;
    },
});
