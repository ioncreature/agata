export const singletons = ['config'];

export function start({singletons: {config}}) {
    return {
        getThree() {
            return config.one * 3;
        },
    };
}
