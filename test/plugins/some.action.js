exports.plugins = {
    seven: {},
    proxy: {this: 'is object'},
};

exports.fn = ({plugins: {seven, proxy}}) => {
    return param => ({seven, proxy, param});
};
