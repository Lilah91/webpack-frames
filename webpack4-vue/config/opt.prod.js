const webpack = require("webpack");
const cwPlugin = require("clean-webpack-plugin");
const { CleanWebpackPlugin = cwPlugin } = cwPlugin;
const { scssStyleLoader, lessStyleLoader, cssStyleLoader,
	cssModuleLoader, styleLoader } = require("./loader");
const { WK, verh } = require("./basic");
const mod = `css/[name]${verh("content")}.css`;
const optProd = { devtool: false, module: {}, plugins: [] };
if (WK === 1) { // devtool: "source-map",
	const ExtraTWP = require("extract-text-webpack-plugin");
	const loader = new ExtraTWP(mod, { allChunks: true });
	optProd.module.loaders = [{
		test: /_\.css(\?.*)?$/i,
		loader: loader.extract(
			cssModuleLoader,
			"postcss-loader"
		),
	}, {
		test: /[^_]\.css(\?.*)?$/i,
		loader: loader.extract(
			cssStyleLoader,
			"postcss-loader"
		),
	}, {
		// webpack1 比较特殊, 不需要 style-loader, 加了反而报错, less scss 在生产环境的编译配置很特殊
		// https://github.com/webpack-contrib/extract-text-webpack-plugin/blob/webpack-1/README.md
		test: /_\.less(\?.*)?$/i,
		loader: loader.extract([
			cssModuleLoader,
			"postcss-loader",
			lessStyleLoader,
		]),
	}, {
		test: /[^_]\.less(\?.*)?$/i,
		loader: loader.extract([
			cssStyleLoader,
			"postcss-loader",
			lessStyleLoader,
		]),
	}, {
		test: /_\.scss(\?.*)?$/i,
		loader: loader.extract([
			cssModuleLoader,
			"postcss-loader",
			scssStyleLoader,
		]),
	}, {
		test: /[^_]\.scss(\?.*)?$/i,
		loader: loader.extract([
			cssStyleLoader,
			"postcss-loader",
			scssStyleLoader,
		]),
	}];
	optProd.plugins = [
		new CleanWebpackPlugin(),
		// new webpack.optimize.ModuleConcatenationPlugin(),
		new webpack.optimize.OccurrenceOrderPlugin(),
		// new webpack.HashedModuleIdsPlugin(),
		// new webpack.NoEmitOnErrorsPlugin(),
		loader,
	];
} else if (WK === 3) {
	const ExtraTWP = require("extract-text-webpack-plugin");
	optProd.module.rules = [{
		test: /\.css(\?.*)?$/i,
		oneOf: [{
			resourceQuery: /\bmodule\b/i,
			use: ExtraTWP.extract({
				fallback: styleLoader,
				use: [
					cssModuleLoader,
					"postcss-loader",
				],
			}),
		}, {
			use: ExtraTWP.extract({
				fallback: styleLoader,
				use: [
					cssStyleLoader,
					"postcss-loader",
				],
			}),
		}],
	}, {
		test: /\.less(\?.*)?$/i,
		oneOf: [{
			resourceQuery: /\bmodule\b/i,
			use: ExtraTWP.extract({
				fallback: styleLoader,
				use: [
					cssModuleLoader,
					"postcss-loader",
					lessStyleLoader,
				],
			}),
		}, {
			use: ExtraTWP.extract({
				fallback: styleLoader,
				use: [
					cssStyleLoader,
					"postcss-loader",
					lessStyleLoader,
				],
			}),
		}],
	}, {
		test: /\.scss(\?.*)?$/i,
		oneOf: [{
			resourceQuery: /\bmodule\b/i,
			use: ExtraTWP.extract({
				fallback: styleLoader,
				use: [
					cssModuleLoader,
					"postcss-loader",
					scssStyleLoader,
				],
			}),
		}, {
			use: ExtraTWP.extract({
				fallback: styleLoader,
				use: [
					cssStyleLoader,
					"postcss-loader",
					scssStyleLoader,
				],
			}),
		}],
	}];
	optProd.plugins = [
		new CleanWebpackPlugin(),
		new webpack.optimize.ModuleConcatenationPlugin(),
		new webpack.optimize.OccurrenceOrderPlugin(),
		new webpack.HashedModuleIdsPlugin(),
		new webpack.NoEmitOnErrorsPlugin(),
		new ExtraTWP({
			allChunks: true,
			filename: mod,
		}),
	];
} else {
	const MiniExtract = require("mini-css-extract-plugin");
	optProd.plugins = [
		new CleanWebpackPlugin(),
		// new webpack.optimize.ModuleConcatenationPlugin(),
		// new webpack.optimize.OccurrenceOrderPlugin(),
		new webpack.HashedModuleIdsPlugin(),
		// new webpack.NoEmitOnErrorsPlugin(),
		new MiniExtract({
			allChunks: true,
			filename: mod,
			chunkFilename: mod,
		}),
	];
}
module.exports = optProd;