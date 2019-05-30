const glob = require('glob');
const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const WebpackAssetsManifest = require('webpack-assets-manifest')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const PnpWebpackPlugin = require('pnp-webpack-plugin')
const { VueLoaderPlugin } = require("vue-loader")

const packs = path.join(__dirname, '..', '..', 'app', 'javascript', 'packs');
const targets = glob.sync(path.join(packs, '**/*.{js,jsx,ts,tsx}'))

const nodeEnv = process.env.NODE_ENV || 'development';

const inDevServer = process.argv.find(v => v.includes('webpack-dev-server'))
const isHMR = inDevServer && (devServer && devServer.hmr)

const styleLoader = {
  loader: 'style-loader',
  options: {
    hmr: isHMR,
    sourceMap: true
  }
}

const getStyleRule = (test, modules = false, preprocessors = []) => {
  const use = [
    {
      loader: 'css-loader',
      options: {
        sourceMap: true,
        importLoaders: 2,
        localIdentName: '[name]__[local]___[hash:base64:5]',
        modules
      }
    },
    {
      loader: 'postcss-loader',
      options: {
        config: { path: path.resolve('app/javascript') },
        sourceMap: true,
      }
    },
    ...preprocessors
  ]

  const options = modules ? { include: /\.module\.[a-z]+$/ } : { exclude: /\.module\.[a-z]+$/ }

  if (nodeEnv === 'production') {
    use.unshift(MiniCssExtractPlugin.loader)
  } else {
    use.unshift(styleLoader)
  }

  // sideEffects - See https://github.com/webpack/webpack/issues/6571
  return {
    ...{ test, use, sideEffects: !modules },
    ...options,
  }
}

const entry = targets.reduce((acc, target) => {
  const bundle = path.relative(packs, target)
  const ext = path.extname(bundle)
  return {
    ...acc,
    ...{ [bundle.replace(ext, '')]: './app/javascript/packs/' + bundle },
  }
}, {})

module.exports = {
  mode: nodeEnv === "development" ? 'development' : 'production',
  entry,
  output: {
    filename: '[name]-[chunkhash].js',
    chunkFilename: '[name]-[chunkhash].chunk.js',
    hotUpdateChunkFilename: '[id]-[hash].hot-update.js',
    path: path.join(__dirname, '..', '..', 'public', 'packs'),
    publicPath: '/packs/',
    pathinfo: true
  },
  resolve: {
    extensions: [".vue", ".mjs", ".js", ".sass", ".scss", ".css", ".module.sass", ".module.scss", ".module.css", ".png", ".svg", ".gif", ".jpeg", ".jpg"],
    plugins: [PnpWebpackPlugin],
    modules: [
      path.resolve('app/javascript'),
      'node_modules',
    ]
  },
  cache: true,
  devtool: 'cheap-module-source-map',
  devServer: {"https":false,"host":"localhost","port":3035,"public":"localhost:3035","hmr":false,"inline":true,"overlay":true,"compress":true,"disable_host_check":true,"use_local_ip":false,"quiet":false,"headers":{"Access-Control-Allow-Origin":"*"},"watch_options":{"ignored":"**/node_modules/**"}},
  module: {
    strictExportPresence: true,
    rules: [
      { parser: { requireEnsure: false } },
      {
        test: new RegExp(/.jpg|.jpeg|.png|.gif|.tiff|.ico|.svg|.eot|.otf|.ttf|.woff|.woff2/, 'i'),
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[path][name]-[hash].[ext]',
              context: path.join('app/javascript')
            }
          }
        ]
      },
      {
        test: /\.(js|jsx|mjs)?(\.erb)?$/,
        include: path.resolve('app/javascript'),
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: path.join('tmp/cache/webpacker', 'babel-loader-node-modules'),
              cacheCompression: nodeEnv === 'production',
              compact: nodeEnv === 'production'
            }
          }
        ]
      },
      {
        test: /\.(js|mjs)$/,
        exclude: /@babel(?:\/|\\{1,2})runtime/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              presets: [['@babel/preset-env', { modules: false }]],
              cacheDirectory: path.join('tmp/cache/webpacker', 'babel-loader-node-modules'),
              cacheCompression: nodeEnv === 'production',
              compact: false,
              sourceMaps: false
            }
          }
        ]
      },
      getStyleRule(/\.(css)$/i),
      getStyleRule(/\.(css)$/i, true),
      getStyleRule(/\.(scss|sass)$/i, true, [
        {
          loader: 'style-loader!sass-loader',
          options: { sourceMap: true }
        }
      ]),
      require('./loaders/vue'),
    ],
  },
  resolveLoader: {
    modules: ['node_modules'],
    plugins: [PnpWebpackPlugin.moduleLoader(module)]
  },
  plugins: [
    new webpack.EnvironmentPlugin(JSON.parse(JSON.stringify(process.env))),
    new CaseSensitivePathsPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name]-[contenthash:8].css',
      chunkFilename: '[name]-[contenthash:8].chunk.css'
    }),
    new WebpackAssetsManifest({
      integrity: false,
      entrypoints: true,
      writeToDisk: true,
      publicPath: true
    }),
    new VueLoaderPlugin()
  ],
  node: {
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty'
  },
}
