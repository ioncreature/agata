export const plugins = {
    seven: {},
    proxy: {this: 'is object'},
};

export function fn({plugins: {seven, proxy}}) {
    return param => ({seven, proxy, param});
}
