/*import axios from 'axios'
import * as Cookie from 'tough-cookie'
export {Cookie}
axios.defaults.withCredentials = true

import CryptoJS from 'crypto-js'
export var storePrefix = ""
export function IsElectron() {
	var userAgent = navigator.userAgent.toLowerCase();
	return (userAgent.indexOf(' electron/') > -1)
	return process.versions.hasOwnProperty('electron')
	return window && window.process && window.process.type
}

export function EndCap(c, str) {
	if (str.endsWith(c)) {
		console.log("ends with", str)
		return str
	}
	else{
		console.log("does not end with ", str)
		return str + c
	}
}
export function GetCookieForLogin(username, password){
	var config = {
		'url':getAPIURL("login"),
		'method':"post",
		'headers': {'X-Requested-With': 'XMLHttpRequest',
			'Content-Type':"application/json", 
		},
		'crossDomain': true, 
		'params':{username, password},
		'data': {},
		'withCredentials':true,
		maxRedirects:0
	};
	console.log("using url", storePrefix,config['url'])
	return new Promise((resolve, reject) => {
		console.log("launching login request")
		axios(config).then(function(response){
			console.log("finished login request", response)
			let cookie = response.headers['set-cookie']
			console.log("set cookie to ", cookie)
			//Shared.Utils.setCookie(cookie)
			resolve(cookie)
			}).catch(function(error){
				if (error['response'].status == 302){
					//this is normal
					resolve(error.response['headers']['set-cookie'])
					return;
				}
				reject( error );
				})
		})
}

export function MergeDicts(obj, src) {
	for (var key in src) {
		if (src.hasOwnProperty(key)) obj[key] = src[key];
	}
	return obj;
}

export function getNodeInTree(treeData, stepCounter){
	var foundNode
	const cb = (node) => {
		if (node['stepCounter'] == stepCounter){
			foundNode = node
			return false
		}
		return true
	}
	forAllNodesInTreeDepth(treeData, cb)
	return foundNode
}

export function getNodeAtIndex(treeData, index) {
	let count = 0 
	var nodeResult
	const cb = (node) => {
		if (count != index){
			count++
			return true
		}
		nodeResult = node
			return false
	}
	forAllNodesInTreeDepth(treeData, cb)
	return nodeResult
}

export function forAllNodesInTreeRoots(treeData,cb) {
	for (var nodeIndex = 0 ; nodeIndex < treeData.nodes.length; nodeIndex++) {
		//var children = treeData[nodeIndex]['children']
		let cont = cb(treeData.nodes[nodeIndex]) //always call parents first
		//var continueReturnFromChildren = true
		//if (cont && children) { //always call children, even if not continuing 
	//		continueReturnFromChildren = forAllNodesInTreeDepth(children, cb)
		//if (!cont || !continueReturnFromChildren)
		if (!cont ) {
			return false;
		}
	}
	return true
}

//cb takes node as arg, returns true to continue 
export function forAllNodesInTreeDepth(treeData,cb) {
	for (var nodeIndex = 0 ; nodeIndex < treeData['nodes'].length; nodeIndex++) {
		var children = treeData['nodes'][nodeIndex]['nodes']
		var cont = cb(treeData['nodes'][nodeIndex]) //always call parents first
		var continueReturnFromChildren = true
		if (cont && children.length) { //always call children, even if not continuing 
			continueReturnFromChildren = forAllNodesInTreeDepth(children, cb)
		}
		if (!cont || !continueReturnFromChildren)
			return false;
	}
	return true
}

export function getStringAtURL(link, completeFunc) {
	var config = {
		'url':link,
		'method':'get',
		'headers': {'X-Requested-With': 'XMLHttpRequest'},
		'crossDomain': true,
		'transformResponse': undefined, //always get string
		responseType: 'arraybuffer'
	};
	prepConfigWithCookie(config)

	return new Promise( function (resolve, reject) {
			//console.log("got link", link, config)
			axios(config).then(function(response){
				    var buffer = new Buffer(response.data, 'binary');
				        var textdata = buffer.toString(); // for string

					console.assert(typeof textdata == "string")
					resolve(textdata)
					}).catch(function(error){
						reject( error );
						})
				})
}

export function getProxyURL(url) {
	//regex to strip all protocols from beginning of url 
	var newURL = url;//url.replace(/(^\w+:|^)\/\//, '');
	//console.log("got new url", url, newURL)
	
	if (IsElectron()) {
		//console.log("in electron, using different url")
		return url
	}
	else{
		//console.log("not in electron, using different url")
		return ("/proxy/" + newURL)
	}
}

export function getHash(str) {
	console.assert(typeof str == "string", str)
	return CryptoJS.SHA256(str).toString()
}

export function getBasenameOfURL(url){
	return url.substring(url.lastIndexOf('/')+1)
}

export function getAPIURL(path){
	return storePrefix + "/api/" + path

}
function prepConfigWithCookie(config) {
	if (cookie) {
		//console.log("using cookie!", cookie)
		config['headers']['Cookie'] = `${cookie}`
	}
}
export function apiGet(path, queryParams) {
	var config = {
		'url':getAPIURL(path),
		'method':'get',
		'headers': {'X-Requested-With': 'XMLHttpRequest'},
		'crossDomain': true,
		'params':queryParams
	};
	prepConfigWithCookie(config)
	return new Promise(function (resolve, reject)  {
		axios(config).then(function(response){
			resolve(response.data)
			}).catch(function(error){
				reject( error );
				})
		})
}
export function apiGetJson(path, queryParams, data) {
	return apiGet(path, queryParams, data, "application/json")
}

export var cookie = null
export function setCookie(str) {
	console.log("setting cookie to ", str)
	cookie=str
}
export function apiDeleteJson(path, queryParams, data) {
	return apiDelete(path, queryParams, data, "application/json")
}
export function apiDelete(path, queryParams, data, contentType) {
	return apiMethod('delete', path, queryParams, data, contentType)
}
export function apiPutJson(path, queryParams, data) {
	return apiPut(path, queryParams, data, "application/json")
}
export function apiPut(path, queryParams, data, contentType) {
	return apiMethod('put', path, queryParams, data, contentType)
}
export function apiPostJson(path, queryParams, data,headers) {
	return apiPost(path, queryParams, data, "application/json")
}
export function apiPost(path, queryParams, data, contentType) {
	return apiMethod('post', path, queryParams, data, contentType)
}
export function apiMethod(method, path, queryParams, data, contentType) {
	var config = {
		'url':getAPIURL(path),
		'method':method,
		'headers': {'X-Requested-With': 'XMLHttpRequest',
			'Content-Type':contentType? contentType:"application/json"
		},
		'crossDomain': true, 
		'params':queryParams,
		'data': data
	};
	prepConfigWithCookie(config)
	return new Promise(function (resolve, reject)  {
		axios(config).then(function(response){
			resolve(response.data)
			}).catch(function(error){
				reject( error );
				})
		})
}


export class CookieState {
	fromJSON(cookieJsonBlob){
		if (!cookieJsonBlob) {
			return this;
		}
		this.state = Cookie.CookieJar.fromJSON(cookieJsonBlob)
		return this
	}
	toJSON() {
		return this.state.toJSON()

	}
	 clone(){
		 let c = new CookieState()
		 c.state = Cookie.CookieJar.fromJSON(this.state.toJSON())
		 return c
	}
	constructor()
	{
		this.clone = this.clone.bind(this)
		this.state = new Cookie.CookieJar()
	}
}*/
