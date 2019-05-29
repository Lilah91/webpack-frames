import React from "react";
import { render as draw } from "react-dom";
import { Provider } from "react-redux";
import { applyMiddleware, createStore } from "redux";
import {
	isArray, isObject, isString, isFunction,
	log, fmtde, split, dolock, unlock, trigger,
} from "./fns";

const STATE_MAP = {};
const MODEL_MAP = {};
const AFTER_INIT = [];
const BEFORE_INIT = [];
// async/sync action type
export const ASYNC = "ASYNC";
export const UPDATE = "UPDATE";
// middleware and reducer
export const thunk = store => next => action =>
	isFunction(action) ? action(store) : next(action);
export const print = store => next => action => {
	const { type = +new Date() } = action || {};
	const result = next(action);
	log.group("PrintAction", type);
	log.info("\tDispatchAction:\t", action);
	log.info("\tGetStoreState:\t", store.getState());
	log.groupEnd("PrintAction", type);
	return result;
};
export const update = (state, action) => {
	const { type, payload, path } = action || {};
	const keys = split(type);
	const [func] = keys.splice(-1, 1, ...split(path));
	if (func !== UPDATE || !keys.length) { return state; }
	const data = isObject(payload) ? payload
		: { [keys.splice(-1, 1)]: payload };
	keys.splice(0, 0, state);
	const last = keys.reduce((prev, now) => {
		if (!now) {
			return prev;
		} else if (!prev[now]) {
			prev[now] = {};
		} else if (isArray(prev[now])) {
			prev[now] = prev[now].slice();
		} else {
			prev[now] = { ...prev[now] };
		}
		return prev[now];
	});
	Object.assign(last, data);
	return ({ ...state });
};
// 模仿dva且自动加载model的封装实现
const reducer = (st, ac) => update(st || STATE_MAP, ac);
const middleware = store => next => action => {
	const { type, fn, prefix, lock } = action || {};
	const keys = split(type);
	if (keys.length === 2) {
		trigger(keys.join("/"), action);
		// 获取对应model的effect
		const [name, method] = keys;
		const { effects } = MODEL_MAP[name] || {};
		const { [method]: effect } = effects || {};
		if (isFunction(effect)) {
			return effect(action, store);
		}
	}
	if (type === ASYNC) {
		const error = []; // 中间件处理异步
		fn || error.push("ASYNC missing `fn`!");
		prefix || error.push("ASYNC missing `prefix`!");
		const err = error.join(" ");
		err && log.error(err, action);
		if (err || dolock(lock)) { return next(action); }
		store.dispatch({ type: `${prefix}_REQ`, action });
		const handle = payload => {
			unlock(lock);
			store.dispatch({
				type: `${prefix}_RES`,
				payload, action,
			});
		};
		return fmtde(fn).then(handle);
	}
	return next(action);
};
export const set = model => {
	const { name, state, before, after } = model || {};
	if (isString(name) && /\w/.test(name)) {
		STATE_MAP[name] = state;
		MODEL_MAP[name] = model;
		isFunction(before) ? BEFORE_INIT.push(before)
			: Object.values(before || {}).forEach(
				f => isFunction(f) && BEFORE_INIT.push(f));
		isFunction(after) ? AFTER_INIT.push(after)
			: Object.values(after || {}).forEach(
				f => isFunction(f) && AFTER_INIT.push(f));
	}
};
export const init = (...args) => {
	BEFORE_INIT.forEach(f => f(STATE_MAP));
	const store = createStore(reducer, STATE_MAP,
		applyMiddleware(middleware, ...args));
	AFTER_INIT.forEach(f => f(store));
	return store;
};
export const render = (App, store) => draw(
	<Provider store={store}><App /></Provider>,
	document.getElementById("app"));
/* http://cn.redux.js.org/docs/api redux中文api
const r = require.context("./", true,
	/\/(models\/.*|model)\.jsx?$/i);
r.keys().map(r).forEach(v =>
	Object.values(v).forEach(set));
render(App, init()); */