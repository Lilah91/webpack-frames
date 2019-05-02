import React from "react";
import { render as draw } from "react-dom";
import { Provider } from "react-redux";
import { applyMiddleware, createStore } from "redux";
import { isArray, isFunction, split, log } from "./fns";

const STATE_MAP = {};
const MODEL_MAP = {};
const AFTER_INIT = [];
const BEFORE_INIT = [];
const ASYNC_LOCK_MAP = {};
const ASYNC_CALL_TYPE = "@@SKY_ASYNC";
const UPDATE_CALL_TYPE = "@@SKY_UPDATE";
const ACTION_MEETS = { promises: {}, resolves: {} };
// async lock method
const initLock = key => {
	if (key != null && String(key)) {
		if (ASYNC_LOCK_MAP[key]) { return true; }
		ASYNC_LOCK_MAP[key] = true;
	}
};
const undoLock = key => {
	if (key != null && String(key)) {
		ASYNC_LOCK_MAP[key] = false;
	}
};
// meet action method
export const meet = type => {
	const { promises, resolves } = ACTION_MEETS;
	if (!promises[type] || !resolves[type]) {
		promises[type] = new Promise(
			resolve => (resolves[type] = resolve)
		);
	}
	return promises[type] || Promise.resolve({});
};
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
	const data = payload && typeof payload === "object"
		? payload : { [keys.splice(-1, 1)]: payload };
	if (func !== UPDATE_CALL_TYPE) {
		return state;
	}
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
	const { type, fn, prefix, meta, lock } = action || {};
	const keys = split(type);
	if (keys.length === 2) {
		const keyword = keys.join("/");
		const {
			promises: { [keyword]: ps },
			resolves: { [keyword]: rs },
		} = ACTION_MEETS;
		ps && isFunction(rs) && rs(action);
		// 清除旧的meet等待action的resolve方法
		delete ACTION_MEETS.resolves[keyword];
		// 获取对应model的effect
		const { effects } = MODEL_MAP[keys[0]] || {};
		const { [keys.slice(-1)]: effect } = effects || {};
		if (isFunction(effect)) {
			return effect(action, store);
		}
	}
	if (type === ASYNC_CALL_TYPE) {
		// 中间件处理异步
		const error = [];
		fn || error.push("ASYNC missing `fn`");
		prefix || error.push("ASYNC missing `prefix`");
		error.length && log.error(error, action);
		if (error.length || initLock(lock)) {
			return next(action);
		}
		store.dispatch({
			type: `${prefix}_REQUEST`,
			fn, prefix, meta, lock,
		});
		const handle = payload => {
			undoLock(lock);
			return store.dispatch({
				type: `${prefix}_RESPONSE`,
				payload, fn, prefix, meta, lock,
			});
		};
		return Promise.resolve(isFunction(fn) ? fn() : fn)
			.then(d => handle([d, null]))
			.catch(e => handle([null, e]));
	}
	return next(action);
};
export const set = model => {
	const { name, state, before, after } = model || {};
	if (name === "" + name && /\w/.test(name)) {
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
export const async = (v, sync) => Object.assign({}, v,
	{ type: sync ? UPDATE_CALL_TYPE : ASYNC_CALL_TYPE });
/* http://cn.redux.js.org/docs/api redux中文api
const r = require.context("./", true,
	/\/(models\/.*|model)\.jsx?$/i);
r.keys().map(r).forEach(v =>
	Object.values(v).forEach(set));
render(App, init()); */