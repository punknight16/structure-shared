import * as _ from 'lodash'
import * as Dynamo from './Dynamo';
import * as AWSSdk from 'aws-sdk';

export function IsElectron() {
	var userAgent = navigator.userAgent.toLowerCase();
	return (userAgent.indexOf(' electron/') > -1)
}

export const max= (a, initialValue)=> {
	return a.reduce((m,x)=> parseInt(m)>parseInt(x) ? parseInt(m):parseInt(x), initialValue);
}

export function checkKeys(obj, keyPath) {
	return _.has(obj,keyPath)
}
export function getValue(obj, keyPath) {
	return _.get(obj,keyPath)
}
export function setValue(obj, keyPath, value) {
	return _.set(obj,keyPath,value)
}
export function getValueSafe(obj, keyPath, ifFalseReturn) {
	let result = checkKeys(obj, keyPath)
	if (!result) {
		return ifFalseReturn
	}
	else{
		return getValue(obj, keyPath)
	}
}
export const isEquivalent = (a, b)=> {
	// Create arrays of property names
	var aProps = Object.getOwnPropertyNames(a);
	var bProps = Object.getOwnPropertyNames(b);

	// If number of properties is different,
	// objects are not equivalent
	if (aProps.length != bProps.length) {
		return false;
	}

	for (var i = 0; i < aProps.length; i++) {
		var propName = aProps[i];

		// If values of same property are not equal,
		// objects are not equivalent
		if (a[propName] !== b[propName]) {
			return false;
		}
	}

	// If we made it this far, objects
	// are considered equivalent
	return true;
}

export const measureSeconds = (startISOString, endISOString): number => {
	const seconds = new Date(endISOString).getTime() - new Date(startISOString).getTime();	
	return seconds;
}

export const measurePromise = (fn: () => Promise<any>): Promise<any> => {
	const start = new Date().toISOString();
	let onPromiseDone = (passThroughData) => {
		const end = new Date().toISOString();
		const performanceTime = measureSeconds(start, end);
		const result = {
			performanceTime: performanceTime,
			passThroughData: passThroughData
		}
		return result;
	}
    
    return fn().then(onPromiseDone, onPromiseDone);
}

export const isDemoEnvironment = ():boolean => {
	return getQueryParam("env") == 'demo'
}

export const isSsoEnvironment = ():boolean => {
	return (!!getHashParam("id_token"))
}
export const isProd = ():boolean => 
{
	return window.location.href.includes("editor.structure.rest")
}

export const getQueryParam = (key:string)=>{
	const url_string = window.location.href;
	const url = new URL(url_string);
	const env = url.searchParams.get(key);
	return env;
}

export const getHashParam = (key:string)=>{
	const hash_string = window.location.hash.substr(1);;
	const hash_arr = hash_string.split('&');
	let hash_dictionary = {};
	hash_arr.forEach((str)=>{
		const [found_key, found_value] = str.split("=");
		hash_dictionary[found_key] = found_value;
	})
	return hash_dictionary[key];
}

export const USER_POOL_ID = 'us-west-2_c4Lg8pNfQ';
export const APP_CLIENT_ID = 'mjn020f01m2uvvg38ujrt8gts';
export const IDENTITY_POOL_ID = 'us-west-2:da18afd3-bfb8-4b1a-876a-6bbe7ec60669';
export const AWS_REGION = 'us-west-2';
export const IDP_URL = "cognito-idp." + AWS_REGION + ".amazonaws.com/";
export const DYNAMO_ENDPOINT = 'dynamodb.us-west-2.amazonaws.com';


export const getClientType = () =>{
	if (typeof window === 'undefined') {
		return Dynamo.ClientType.server
	} else {
		if(isDemoEnvironment()){
			return Dynamo.ClientType.demo
		} else if(isSsoEnvironment()){
			return Dynamo.ClientType.sso
		} {
			return Dynamo.ClientType.client
		}
	}
}

export const getDynamoClient = ():any =>{
	return new Promise((resolve, reject) => {
		const clientType = getClientType(); //returns demo|sso|client|server
		const cognitoUser = Dynamo.getCognitoUser() //returns cognitoUser|null
		if(clientType == Dynamo.ClientType.client && !cognitoUser){
			reject(new Error('Not Logged in!'));
			return;
		}
        Dynamo.getDocClient(clientType, cognitoUser, (err1, docClient)=>{ //returns unauthenticated|authenticated|root credentials
			if(err1) {
                reject(err1)
            } else {
                Dynamo.getUserIdParam(clientType, Dynamo.RequestType.get, (err2, targetUserId)=>{
                    if(err2) {
						reject(err2)
                    } else {
						resolve({docClient, targetUserId});
					}
				})
			}
		})
	})
}
