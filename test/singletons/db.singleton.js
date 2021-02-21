exports.singletons = ['config'];

exports.start = ({singletons: {config}}) => {
    return {
        getThree() {
            return config.one * 3;
        },
    };
};
