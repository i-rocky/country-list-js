module.exports = {
    mode: 'production',
    context: __dirname + '/src',
    entry: './index',
    output: {
        path: __dirname + '/dist',
        filename: 'country.min.js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015', ['env', {targets: {node: 'current'}}]],
                },
            },
        ],
    },
};
